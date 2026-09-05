'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Product, Category, ProductVariant, BulkPricingRule } from '@/lib/types';
import MediaSelectModal from '@/components/MediaSelectModal';
import ProductAutoFillModal from '@/components/admin/products/ProductAutoFillModal';
import { ProductAutoFillDraft } from '@/lib/ai/product-autofill';
import { uploadMediaFile } from '@/lib/media-upload';
import { deriveProductAutoSeo } from '@/lib/growth/product-keyword-engine';
import { validateProductVariants, formatVariantWeight } from '@/lib/product-variants';
import { resolveProductWholesaleUnits, calculateProductBaseWholesaleRate } from '@/lib/wholesale-units';
import ProductIntelligenceSection from '@/components/admin/products/ProductIntelligenceSection';
import {
  deriveSafeIntelligenceDefaults,
  validateProductIntelligence,
} from '@/lib/growth/intelligence-validator';
import { ProductIntelligenceMetadata } from '@/lib/types';
import {
  PREDEFINED_PRODUCT_TYPES,
  PREDEFINED_TYPE_VALUES,
  validateProductTypeClassification,
  extractDistinctCustomProductTypes,
  getProductTypeDisplay,
  normalizeProductType,
} from '@/lib/growth/product-type-governance';
import {
  getProductTypeUnitRule,
  suggestNextVariant,
  UNIT_DISPLAY_LABELS,
} from '@/lib/growth/product-catalog-governance';
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  ExternalLink,
  Info,
  DollarSign,
  FileText,
  Sliders,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
  X,
  Star,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Sparkles,
  Search,
  Key,
  Compass,
  RefreshCw,
  Lightbulb,
  Layers,
  Percent,
  Scale,
  Tag,
  ShieldCheck,
} from 'lucide-react';

/**
 * Pure function to validate wholesale pricing tiers and catch overlapping quantity ranges
 */
export function validateWholesaleTierOverlaps(
  tiers: BulkPricingRule[]
): { valid: boolean; error?: string; conflictingIndices?: [number, number] } {
  const activeTiersWithIndex = tiers
    .map((tier, originalIndex) => ({ tier, originalIndex }))
    .filter(({ tier }) => tier.isActive !== false);

  for (let i = 0; i < activeTiersWithIndex.length; i++) {
    const { tier: tierA, originalIndex: idxA } = activeTiersWithIndex[i];
    const minA = Number(tierA.minQuantity);
    const maxA =
      tierA.maxQuantity !== undefined && tierA.maxQuantity !== null && (tierA.maxQuantity as any) !== ''
        ? Number(tierA.maxQuantity)
        : Infinity;

    if (isNaN(minA) || minA <= 0) {
      return {
        valid: false,
        error: `Wholesale Tier #${idxA + 1}: Minimum quantity must be a positive number greater than 0.`,
        conflictingIndices: [idxA, idxA],
      };
    }

    if (isFinite(maxA) && maxA < minA) {
      return {
        valid: false,
        error: `Wholesale Tier #${idxA + 1}: Maximum quantity (${maxA}) cannot be less than minimum quantity (${minA}).`,
        conflictingIndices: [idxA, idxA],
      };
    }

    if (typeof tierA.discountValue !== 'number' || isNaN(tierA.discountValue) || tierA.discountValue < 0) {
      return {
        valid: false,
        error: `Wholesale Tier #${idxA + 1}: Discount value must be a non-negative number.`,
        conflictingIndices: [idxA, idxA],
      };
    }

    if (tierA.discountType === 'percentage' && tierA.discountValue > 100) {
      return {
        valid: false,
        error: `Wholesale Tier #${idxA + 1}: Percentage discount cannot exceed 100%.`,
        conflictingIndices: [idxA, idxA],
      };
    }

    for (let j = i + 1; j < activeTiersWithIndex.length; j++) {
      const { tier: tierB, originalIndex: idxB } = activeTiersWithIndex[j];
      const minB = Number(tierB.minQuantity);
      const maxB =
        tierB.maxQuantity !== undefined && tierB.maxQuantity !== null && (tierB.maxQuantity as any) !== ''
          ? Number(tierB.maxQuantity)
          : Infinity;

      if (minA <= maxB && maxA >= minB) {
        const rangeA = `${minA}${isFinite(maxA) ? '-' + maxA : '+'}`;
        const rangeB = `${minB}${isFinite(maxB) ? '-' + maxB : '+'}`;
        return {
          valid: false,
          error: `Wholesale tier (${rangeA}) overlaps with tier (${rangeB}). Quantity ranges must not overlap.`,
          conflictingIndices: [idxA, idxB],
        };
      }
    }
  }

  return { valid: true };
}

interface ProductFormClientProps {
  initialProduct?: Product;
  categories: Category[];
}

export default function ProductFormClient({
  initialProduct,
  categories,
}: ProductFormClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [partialSaveStatus, setPartialSaveStatus] = useState<{
    productSaved: boolean;
    wholesaleError: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'content' | 'media' | 'seo' | 'display' | 'intelligence'>('basic');
  const [isDirty, setIsDirty] = useState(false);

  const [intelligenceData, setIntelligenceData] = useState<ProductIntelligenceMetadata>(() => {
    if (initialProduct?.intelligence) {
      return initialProduct.intelligence;
    }
    return deriveSafeIntelligenceDefaults({
      name: initialProduct?.name,
      categoryName: initialProduct?.categoryName,
    });
  });

  const [formData, setFormData] = useState<Partial<Product>>({
    id: initialProduct?.id,
    name: initialProduct?.name || '',
    slug: initialProduct?.slug || '',
    categoryId: initialProduct?.categoryId || (categories[0]?.id || 'cat-1'),
    categoryName: initialProduct?.categoryName || (categories[0]?.name || 'Henna'),
    shortDescription: initialProduct?.shortDescription || '',
    fullDescription: initialProduct?.fullDescription || '',
    price: initialProduct?.price || 199,
    compareAtPrice: initialProduct?.compareAtPrice || 299,
    quantityOrWeight: initialProduct?.quantityOrWeight || '250g Pack',
    sku: initialProduct?.sku || 'MD-888',
    images: (initialProduct?.images || []).filter(
      (img): img is string => typeof img === 'string' && Boolean(img.trim()) && !img.includes('fallback.svg')
    ),
    ingredients: initialProduct?.ingredients || ['100% Pure Natural Lawsonia Inermis Leaf Powder'],
    benefits: initialProduct?.benefits || ['Deep rich mahogany stain', 'Chemical-free natural hair coolant'],
    usageInstructions:
      initialProduct?.usageInstructions ||
      'Mix with warm water into smooth paste. Soak for 6 hours before application.',
    stockStatus: initialProduct?.stockStatus || 'in_stock',
    isFeatured: initialProduct?.isFeatured ?? false,
    isActive: initialProduct?.isActive ?? false,
    sortOrder: initialProduct?.sortOrder ?? 1,
    productType: initialProduct?.productType || 'POWDER',
    seoTitle: initialProduct?.seoTitle || '',
    seoDescription: initialProduct?.seoDescription || '',
    seoKeywords: initialProduct?.seoKeywords || [],
    robotsIndex: initialProduct?.robotsIndex ?? true,
    robotsFollow: initialProduct?.robotsFollow ?? true,
    ogImageUrl: initialProduct?.ogImageUrl || '',
  });

  const initialNorm = normalizeProductType(initialProduct?.productType);
  const [isCustomType, setIsCustomType] = useState<boolean>(initialNorm.isCustom);
  const [knownCustomTypes, setKnownCustomTypes] = useState<string[]>(() => {
    return initialNorm.isCustom && initialNorm.canonicalType ? [initialNorm.canonicalType] : [];
  });

  // Reusable custom types discovery from catalog
  useEffect(() => {
    let mounted = true;
    fetch('/api/products?mode=admin')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data?.products && Array.isArray(data.products)) {
          const distinct = extractDistinctCustomProductTypes(data.products);
          setKnownCustomTypes((prev) => {
            const combined = new Set([...prev, ...distinct]);
            return Array.from(combined).sort((a, b) => a.localeCompare(b));
          });
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const [keywordUniverse, setKeywordUniverse] = useState<any | null>(null);
  const [seoHealth, setSeoHealth] = useState<any | null>(null);
  const [internalLinks, setInternalLinks] = useState<any[]>([]);
  const [loadingUniverse, setLoadingUniverse] = useState(false);
  const [seoKeywordInput, setSeoKeywordInput] = useState('');
  const [activeUniverseCategory, setActiveUniverseCategory] = useState<string>('ALL');

  const autoSeo = deriveProductAutoSeo(formData);

  const applyAutoSeoDefaults = () => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      seoTitle: autoSeo.seoTitle,
      seoDescription: autoSeo.metaDescription,
      seoKeywords: Array.from(new Set([...(prev.seoKeywords || []), autoSeo.primaryKeyword, ...autoSeo.secondaryKeywords])),
    }));
  };

  const [imageInput, setImageInput] = useState('');
  const [ingredientInput, setIngredientInput] = useState('');
  const [benefitInput, setBenefitInput] = useState('');
  const [imageUploadError, setImageUploadError] = useState('');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isAutoFillModalOpen, setIsAutoFillModalOpen] = useState(false);

  // --- Step 3: Product Retail Variations & Wholesale Bulk Pricing State ---
  const [productVariants, setProductVariants] = useState<ProductVariant[]>(
    Array.isArray(initialProduct?.variants) ? initialProduct.variants : []
  );
  const [productBulkRules, setProductBulkRules] = useState<BulkPricingRule[]>([]);
  const [deletedRuleIds, setDeletedRuleIds] = useState<string[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);

  // Load product-specific bulk pricing rules from Supabase campaigns/bulk-pricing
  const loadBulkRulesForProduct = useCallback(async (productId: string) => {
    if (!productId) return;
    setLoadingRules(true);
    try {
      const res = await fetch('/api/bulk-pricing?admin=true');
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.rules)) {
          const matched = data.rules.filter((r: BulkPricingRule) => r.productId === productId);
          setProductBulkRules(matched);
          setDeletedRuleIds([]);
        }
      }
    } catch (err) {
      console.warn('Could not load bulk pricing rules:', err);
    } finally {
      setLoadingRules(false);
    }
  }, []);

  useEffect(() => {
    if (initialProduct?.id) {
      loadBulkRulesForProduct(initialProduct.id);
    }
  }, [initialProduct?.id, loadBulkRulesForProduct]);

  // Derived live validation for wholesale tier overlaps
  const tierValidationResult = useMemo(() => {
    if (productBulkRules.length === 0) return { valid: true };
    return validateWholesaleTierOverlaps(productBulkRules);
  }, [productBulkRules]);

  // Derived wholesale commercial units for the current product
  const currentWholesaleUnits = resolveProductWholesaleUnits({
    ...(initialProduct || {}),
    ...(formData as Product),
  });
  const currentBaseWholesaleRate = calculateProductBaseWholesaleRate(
    { ...(initialProduct || {}), ...(formData as Product) },
    currentWholesaleUnits
  );

  // --- Retail Variant Handlers ---
  const handleAddVariant = () => {
    const suggestion = suggestNextVariant(
      formData.productType,
      formData.quantityOrWeight,
      productVariants
    );
    const defaultPackUnit = suggestion.packUnit;
    const nextQty = suggestion.packQuantity;
    const newWeight = suggestion.weight;
    const baseSku = formData.sku ? formData.sku.trim() : 'MD-PRD';
    const newSku = `${baseSku}-${nextQty}${defaultPackUnit}`;
    const newVarId = `var_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const newVariant: ProductVariant = {
      id: newVarId,
      sku: newSku,
      weight: newWeight,
      packQuantity: nextQty,
      packUnit: defaultPackUnit,
      price: Number(formData.price) || 199,
      compareAtPrice: formData.compareAtPrice ? Number(formData.compareAtPrice) : undefined,
      stockStatus: 'in_stock',
      isDefault: productVariants.length === 0,
      isActive: true,
    };

    const updated = [...productVariants, newVariant];
    setProductVariants(updated);
    setFormData((prev) => ({ ...prev, variants: updated }));
    setIsDirty(true);
  };

  const handleUpdateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const updated = [...productVariants];
    const item = { ...updated[index], [field]: value };

    if (field === 'packQuantity' || field === 'packUnit') {
      const q = Number(field === 'packQuantity' ? value : item.packQuantity);
      const u = String(field === 'packUnit' ? value : item.packUnit || 'g');
      if (!isNaN(q) && q > 0 && u) {
        item.weight = formatVariantWeight(q, u);
      }
    }

    updated[index] = item;
    setProductVariants(updated);
    setFormData((prev) => ({
      ...prev,
      variants: updated,
      ...(item.isDefault ? { price: item.price, quantityOrWeight: item.weight, compareAtPrice: item.compareAtPrice } : {}),
    }));
    setIsDirty(true);
  };

  const handleSetDefaultVariant = (index: number) => {
    const updated = productVariants.map((v, i) => ({
      ...v,
      isDefault: i === index,
    }));
    setProductVariants(updated);
    const chosen = updated[index];
    setFormData((prev) => ({
      ...prev,
      variants: updated,
      price: chosen.price,
      compareAtPrice: chosen.compareAtPrice ?? prev.compareAtPrice,
      quantityOrWeight: chosen.weight,
    }));
    setIsDirty(true);
  };

  const handleRemoveVariant = (index: number) => {
    const v = productVariants[index];
    const label = v?.weight || (v?.packQuantity && v?.packUnit ? `${v.packQuantity}${v.packUnit}` : `Variation #${index + 1}`);
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Remove ${label} pack variation?`);
      if (!confirmed) return;
    }

    const remaining = productVariants.filter((_, i) => i !== index);
    if (productVariants[index]?.isDefault && remaining.length > 0) {
      remaining[0].isDefault = true;
    }
    const updated = remaining.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));
    setProductVariants(updated);
    setFormData((prev) => ({ ...prev, variants: updated }));
    setIsDirty(true);
  };

  const handleMoveVariant = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= productVariants.length) return;

    const updated = [...productVariants];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, movedItem);

    // Reassign deterministic sequential sortOrder without duplicates
    const reordered = updated.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    setProductVariants(reordered);
    setFormData((prev) => ({ ...prev, variants: reordered }));
    setIsDirty(true);
  };

  // --- Wholesale Bulk Rule Handlers ---
  const handleAddBulkRule = () => {
    let nextMin = 25;
    if (productBulkRules.length > 0) {
      const maxVal = productBulkRules.reduce((acc, curr) => {
        const val =
          curr.maxQuantity !== undefined && curr.maxQuantity !== null && !isNaN(Number(curr.maxQuantity))
            ? Number(curr.maxQuantity)
            : Number(curr.minQuantity);
        return Math.max(acc, isNaN(val) ? 0 : val);
      }, 0);
      if (maxVal > 0) {
        nextMin = maxVal + 1;
      }
    }

    const newRule: BulkPricingRule = {
      id: `rule_temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      productId: formData.id || 'pending',
      minQuantity: nextMin,
      maxQuantity: undefined,
      discountType: 'percentage',
      discountValue: 15,
      isActive: true,
      sortOrder: productBulkRules.length + 1,
    };
    setProductBulkRules([...productBulkRules, newRule]);
    setIsDirty(true);
  };

  const handleUpdateBulkRule = (index: number, field: keyof BulkPricingRule, value: any) => {
    const updated = [...productBulkRules];
    updated[index] = { ...updated[index], [field]: value };
    setProductBulkRules(updated);
    setIsDirty(true);
  };

  const handleRemoveBulkRule = (index: number) => {
    const rule = productBulkRules[index];
    const label = `${rule.minQuantity}+ ${currentWholesaleUnits.wholesaleUnit}`;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Remove ${label} wholesale tier?`);
      if (!confirmed) return;
    }

    if (rule.id && !rule.id.startsWith('rule_temp_')) {
      setDeletedRuleIds((prev) => [...prev, rule.id]);
    }
    const updated = productBulkRules
      .filter((_, i) => i !== index)
      .map((r, idx) => ({ ...r, sortOrder: idx + 1 }));
    setProductBulkRules(updated);
    setIsDirty(true);
  };

  const handleSelectFromMediaLibrary = (url: string) => {
    if (!url || url.includes('fallback.svg')) return;
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      images: [...(prev.images || []).filter((img) => !img.includes('fallback.svg')), url],
    }));
  };

  const handleSetCoverImage = (index: number) => {
    if (index === 0) return;
    setIsDirty(true);
    setFormData((prev) => {
      const images = [...(prev.images || [])];
      const target = images[index];
      images.splice(index, 1);
      images.unshift(target);
      return { ...prev, images };
    });
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    setIsDirty(true);
    setFormData((prev) => {
      const images = [...(prev.images || [])];
      const newIndex = direction === 'left' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= images.length) return prev;
      const temp = images[index];
      images[index] = images[newIndex];
      images[newIndex] = temp;
      return { ...prev, images };
    });
  };

  const [autoFilling, setAutoFilling] = useState(false);
  const [hasManuallyEdited, setHasManuallyEdited] = useState(false);
  const [autoFillChecklist, setAutoFillChecklist] = useState<any | null>(null);

  // Track unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const updateForm = (key: keyof Product, value: any) => {
    setIsDirty(true);
    setHasManuallyEdited(true);
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCategoryChange = (catId: string) => {
    const selected = categories.find((c) => c.id === catId);
    setIsDirty(true);
    setHasManuallyEdited(true);
    setFormData((prev) => ({
      ...prev,
      categoryId: catId,
      categoryName: selected?.name || 'Sojat Herbal',
    }));
  };

  const handleOneClickAutoFill = async () => {
    const productName = formData.name?.trim();
    if (!productName) {
      setError('Please enter a Product Name before clicking Auto-Fill.');
      return;
    }

    if (hasManuallyEdited) {
      const confirmed = window.confirm(
        'You have manually edited fields in this product. Auto-Fill will refresh botanical description, SEO, and usage details based on the product name. Do you want to continue?'
      );
      if (!confirmed) return;
    }

    setAutoFilling(true);
    setError('');
    try {
      const res = await fetch('/api/admin/products/auto-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          categoryId: formData.categoryId,
          categoryName: formData.categoryName,
          productType: formData.productType,
          quantityOrWeight: formData.quantityOrWeight,
          price: formData.price,
          compareAtPrice: formData.compareAtPrice,
          sku: formData.sku,
          images: formData.images,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to auto-fill product details.');
      }

      const d = data.draft;
      setFormData((prev) => ({
        ...prev,
        name: d.name || prev.name,
        slug: !prev.slug || prev.slug === 'new-product' || !initialProduct ? d.slug : prev.slug,
        categoryId: d.categoryId || prev.categoryId,
        categoryName: d.categoryName || prev.categoryName,
        productType: d.productType || prev.productType,
        quantityOrWeight: d.quantityOrWeight || prev.quantityOrWeight,
        shortDescription: d.shortDescription || prev.shortDescription,
        fullDescription: d.fullDescription || prev.fullDescription,
        ingredients: d.ingredients || prev.ingredients,
        benefits: d.benefits || prev.benefits,
        usageInstructions: d.usageInstructions || prev.usageInstructions,
        seoTitle: d.seoTitle || prev.seoTitle,
        seoDescription: d.seoDescription || prev.seoDescription,
        seoKeywords: d.seoKeywords || prev.seoKeywords,
        stockStatus: d.stockStatus || prev.stockStatus,
        robotsIndex: d.robotsIndex ?? prev.robotsIndex,
        robotsFollow: d.robotsFollow ?? prev.robotsFollow,
      }));

      setAutoFillChecklist(d.checklist);
      setIsDirty(true);
      setHasManuallyEdited(false);
      setSuccessMsg('✨ Product successfully Auto-Filled! Please review fields, confirm price/SKU/images, and Save.');
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setError(err.message || 'Auto-fill failed.');
    } finally {
      setAutoFilling(false);
    }
  };

  const handleApplyAutoFillDraft = (draft: ProductAutoFillDraft, strategy: 'empty_only' | 'overwrite_all') => {
    setIsDirty(true);
    setFormData((prev) => {
      const next = { ...prev };

      const shouldApply = (fieldVal: any) => {
        if (strategy === 'overwrite_all') return true;
        if (fieldVal === undefined || fieldVal === null || fieldVal === '') return true;
        if (Array.isArray(fieldVal) && fieldVal.length === 0) return true;
        return false;
      };

      if (shouldApply(next.shortDescription)) next.shortDescription = draft.shortDescription;
      if (shouldApply(next.fullDescription)) next.fullDescription = draft.fullDescription;
      if (shouldApply(next.usageInstructions)) next.usageInstructions = draft.usageInstructions;
      if (shouldApply(next.quantityOrWeight)) next.quantityOrWeight = draft.quantityOrWeight;
      if (shouldApply(next.productType)) next.productType = draft.productType;

      if (draft.suggestedCategoryId && shouldApply(next.categoryId)) {
        next.categoryId = draft.suggestedCategoryId;
        next.categoryName = draft.suggestedCategoryName;
      }

      if (draft.slug && (!next.slug || strategy === 'overwrite_all')) {
        if (!initialProduct) {
          next.slug = draft.slug;
        }
      }

      if (draft.ingredients && draft.ingredients.length > 0) {
        if (shouldApply(next.ingredients)) {
          next.ingredients = [...draft.ingredients];
        }
      }

      if (draft.benefits && draft.benefits.length > 0) {
        if (shouldApply(next.benefits)) {
          next.benefits = [...draft.benefits];
        }
      }

      return next;
    });

    setSuccessMsg(
      strategy === 'overwrite_all'
        ? 'AI draft details applied! Please review every field and click "Save Product".'
        : 'AI draft applied to empty fields! Please review and click "Save Product".'
    );
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  const handleAddImageUrl = () => {
    if (!imageInput.trim()) return;
    if (imageInput.trim().includes('fallback.svg')) {
      setImageUploadError('Fallback placeholder cannot be added as a product image.');
      return;
    }
    if (imageInput.startsWith('data:image/')) {
      setImageUploadError('Base64 image data cannot be stored directly. Please upload the file or provide a clean HTTPS URL.');
      return;
    }
    if (!imageInput.startsWith('http://') && !imageInput.startsWith('https://') && !imageInput.startsWith('/')) {
      setImageUploadError('Please provide a valid image URL starting with http:// or https://');
      return;
    }
    setImageUploadError('');
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      images: [...(prev.images || []).filter((img) => !img.includes('fallback.svg')), imageInput.trim()],
    }));
    setImageInput('');
  };

  // Image File Uploader (Uploads image files to Supabase Storage via Media API)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImageUploadError('');
    setSaving(true);

    const fileList = Array.from(files);
    for (const file of fileList) {
      if (!file.type.startsWith('image/')) {
        setImageUploadError(`"${file.name}" is not an image file. Please select JPEG, PNG, WEBP, or SVG.`);
        setSaving(false);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setImageUploadError(`"${file.name}" exceeds maximum allowed file size of 5MB.`);
        setSaving(false);
        return;
      }

      const targetProductId = formData.id || formData.slug || 'new-product';
      const res = await uploadMediaFile(file, 'products', undefined, targetProductId);
      if (res.success && res.url) {
        setIsDirty(true);
        setFormData((prev) => ({
          ...prev,
          images: [...(prev.images || []).filter((img) => !img.includes('fallback.svg')), res.url],
        }));
      } else {
        setImageUploadError(`Failed to upload "${file.name}": ${res.error || 'Upload error'}`);
      }
    }

    setSaving(false);
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
  };

  const handleAddIngredient = () => {
    if (!ingredientInput.trim()) return;
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), ingredientInput.trim()],
    }));
    setIngredientInput('');
  };

  const handleRemoveIngredient = (index: number) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients?.filter((_, i) => i !== index),
    }));
  };

  const handleAddBenefit = () => {
    if (!benefitInput.trim()) return;
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      benefits: [...(prev.benefits || []), benefitInput.trim()],
    }));
    setBenefitInput('');
  };

  const handleRemoveBenefit = (index: number) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits?.filter((_, i) => i !== index),
    }));
  };

  const loadKeywordUniverse = async (forceRefresh: boolean = false) => {
    if (!formData.id && !formData.name) return;
    setLoadingUniverse(true);
    try {
      if (formData.id) {
        const method = forceRefresh ? 'POST' : 'GET';
        const res = await fetch(`/api/admin/products/${formData.id}/keywords`, { method });
        const data = await res.json();
        if (data.success) {
          if (data.universe) setKeywordUniverse(data.universe);
          if (data.seoHealth) setSeoHealth(data.seoHealth);
          if (data.internalLinks) setInternalLinks(data.internalLinks);
        }
      }
    } catch (err) {
      console.warn('Could not load keyword universe:', err);
    } finally {
      setLoadingUniverse(false);
    }
  };

  const handleAddSeoKeyword = (kw?: string) => {
    const text = (kw || seoKeywordInput).trim();
    if (!text) return;
    setIsDirty(true);
    setFormData((prev) => {
      const current = prev.seoKeywords || [];
      if (current.includes(text)) return prev;
      return { ...prev, seoKeywords: [...current, text] };
    });
    if (!kw) setSeoKeywordInput('');
  };

  const handleRemoveSeoKeyword = (index: number) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      seoKeywords: (prev.seoKeywords || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      setError('Product Name is required.');
      setActiveTab('basic');
      return;
    }
    if (formData.price === undefined || formData.price === null || formData.price < 0) {
      setError('Valid selling price is required.');
      setActiveTab('pricing');
      return;
    }
    if (!formData.sku || !formData.sku.trim()) {
      setError('SKU code is required.');
      setActiveTab('basic');
      return;
    }

    // Phase 3B: Validate retail variants via canonical validateProductVariants
    if (productVariants.length > 0) {
      const variantCheck = validateProductVariants(productVariants);
      if (!variantCheck.valid) {
        setError(`Variant validation error: ${variantCheck.errors.join(' | ')}`);
        setActiveTab('pricing');
        return;
      }
    }

    // Step 7: MRP Sanity Validation (compareAtPrice > price when provided)
    if (
      formData.compareAtPrice !== undefined &&
      formData.compareAtPrice !== null &&
      (formData.compareAtPrice as any) !== '' &&
      Number(formData.compareAtPrice) > 0
    ) {
      if (Number(formData.compareAtPrice) <= Number(formData.price)) {
        setError('Base MRP should be greater than Selling Price, or leave MRP blank.');
        setActiveTab('pricing');
        return;
      }
    }

    for (let i = 0; i < productVariants.length; i++) {
      const v = productVariants[i];
      if (
        v.compareAtPrice !== undefined &&
        v.compareAtPrice !== null &&
        (v.compareAtPrice as any) !== '' &&
        Number(v.compareAtPrice) > 0
      ) {
        if (Number(v.compareAtPrice) <= Number(v.price)) {
          const packLabel = v.weight || `Variant #${i + 1}`;
          setError(`${packLabel}: MRP should be greater than Selling Price, or leave MRP blank.`);
          setActiveTab('pricing');
          return;
        }
      }
    }

    // Phase 3E & 3F: Client-side validation of wholesale bulk pricing tiers and overlap detection
    if (productBulkRules.length > 0) {
      const tierCheck = validateWholesaleTierOverlaps(productBulkRules);
      if (!tierCheck.valid) {
        setError(tierCheck.error || 'Please correct overlapping wholesale quantity tiers.');
        setActiveTab('pricing');
        return;
      }
    }

    // Phase 2: Validate Universal Product Intelligence Metadata
    const intelCheck = validateProductIntelligence(intelligenceData);
    if (!intelCheck.valid) {
      setError(`Product Intelligence error: ${intelCheck.errors.join(' | ')}`);
      setActiveTab('intelligence');
      return;
    }

    // Commercial Product Type Classification Governance Validation
    const typeCheck = validateProductTypeClassification(formData.productType, isCustomType);
    if (!typeCheck.valid) {
      setError(`Product Type error: ${typeCheck.error}`);
      setActiveTab('basic');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');
    setPartialSaveStatus(null);

    let productSaveSucceeded = false;
    let savedProductId = formData.id;

    try {
      const cleanImages = (formData.images || []).filter(
        (img): img is string => typeof img === 'string' && Boolean(img.trim()) && !img.includes('fallback.svg')
      );
      const payload = {
        ...formData,
        images: cleanImages,
        productType: typeCheck.sanitizedValue,
        variants: productVariants,
        intelligence: intelligenceData,
      };

      const endpoint = formData.id ? `/api/products/${formData.id}` : '/api/products';
      const method = formData.id ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.product) {
        throw new Error(data.error || 'Failed to save product');
      }

      const savedProduct = data.product;
      productSaveSucceeded = true;
      savedProductId = savedProduct.id;
      setFormData((prev) => ({
        ...prev,
        id: savedProduct.id,
        images: (savedProduct.images || []).filter(
          (img: string) => typeof img === 'string' && Boolean(img.trim()) && !img.includes('fallback.svg')
        ),
      }));

      // Phase 3H: Atomically persist wholesale rules
      if (productBulkRules.length > 0 || deletedRuleIds.length > 0) {
        // Delete removed rules
        for (const delId of deletedRuleIds) {
          await fetch(`/api/bulk-pricing?id=${encodeURIComponent(delId)}`, {
            method: 'DELETE',
          }).catch((err) => console.warn('Rule delete error:', err));
        }

        // Save active rules with the saved product ID
        for (let idx = 0; idx < productBulkRules.length; idx++) {
          const rule = productBulkRules[idx];
          const rulePayload = {
            id: rule.id.startsWith('rule_temp_') ? undefined : rule.id,
            productId: savedProduct.id,
            minQuantity: rule.minQuantity,
            maxQuantity: rule.maxQuantity || null,
            discountType: rule.discountType,
            discountValue: rule.discountValue,
            isActive: rule.isActive !== false,
            sortOrder: rule.sortOrder || (idx + 1),
          };
          const ruleRes = await fetch('/api/bulk-pricing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rulePayload),
          });
          const ruleData = await ruleRes.json();
          if (!ruleRes.ok || !ruleData.success) {
            const ruleErr = ruleData.error || 'Failed to save wholesale tier.';
            throw new Error(`WHOLESALE_RULE_FAILED: ${ruleErr}`);
          }
        }
      }

      setIsDirty(false);
      setPartialSaveStatus(null);
      setSuccessMsg('Product and pricing configurations saved successfully!');
      setTimeout(() => {
        router.push('/admin/products');
      }, 1000);
    } catch (err: any) {
      if (productSaveSucceeded) {
        const rawMsg = err.message || '';
        const wholesaleMsg = rawMsg.startsWith('WHOLESALE_RULE_FAILED: ')
          ? rawMsg.replace('WHOLESALE_RULE_FAILED: ', '')
          : rawMsg;
        setPartialSaveStatus({
          productSaved: true,
          wholesaleError: wholesaleMsg,
        });
        setError(`Product saved, but wholesale rule failed: ${wholesaleMsg}`);
        setActiveTab('pricing');
        if (savedProductId) {
          loadBulkRulesForProduct(savedProductId);
        }
      } else {
        setError(err.message || 'Server error while saving product record.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-xs">
        <button
          onClick={() => {
            if (isDirty && !confirm('You have unsaved changes. Leave anyway?')) return;
            router.push('/admin/products');
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b4332] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Product List</span>
        </button>

        {formData.slug && (
          <Link
            href={`/products/${formData.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#c5a059] hover:underline"
          >
            <span>Preview Public Store Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Partial Save Notice (Two-Stage Feedback) */}
      {partialSaveStatus && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Partial Save Notice: Action Required on Wholesale Pricing</span>
            </div>
            <button
              type="button"
              onClick={() => setPartialSaveStatus(null)}
              className="text-amber-600 hover:text-amber-800 text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Product Details: Saved Successfully</span>
            </div>
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-lg font-semibold">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Wholesale Pricing: {partialSaveStatus.wholesaleError}</span>
            </div>
          </div>
          <p className="text-[11px] text-amber-800">
            Your product record has been saved. Please resolve the wholesale pricing tier conflict below and click &ldquo;Save Product &amp; Variations&rdquo; again to update wholesale rules.
          </p>
        </div>
      )}

      {/* Error / Success Feedback */}
      {error && !partialSaveStatus && (
        <div className="bg-rose-100 border border-rose-400 text-rose-800 text-xs p-4 rounded-xl font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')}>
            <X className="w-4 h-4 text-rose-500" />
          </button>
        </div>
      )}

      {/* Universal Product Auto-Fill Banner & Quick Actions */}
      <div className="bg-[#183F2B] text-white p-5 rounded-2xl shadow-sm border border-[#183F2B]/20 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C5A059]" />
              <h2 className="text-sm font-extrabold tracking-wide uppercase text-white">
                Universal Product Auto-Fill & Publish Engine
              </h2>
            </div>
            <p className="text-xs text-[#FAF8F5]/80 max-w-xl">
              Enter a product title and click Auto-Fill to automatically derive botanical descriptions, ingredients, usage, Auto-SEO, and search indexing.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOneClickAutoFill}
              disabled={autoFilling || !formData.name?.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C5A059] text-[#183F2B] text-xs font-extrabold rounded-xl hover:bg-[#b59149] transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${autoFilling ? 'animate-spin' : ''}`} />
              <span>{autoFilling ? 'Generating Product Draft...' : '✨ AUTO-FILL PRODUCT'}</span>
            </button>
          </div>
        </div>

        {/* Live Readiness Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-3 border-t border-white/10 text-[11px] font-bold">
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Product Data</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Auto-SEO</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Search Index</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Schema.org</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
            formData.price && formData.price > 0 ? 'bg-white/10 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            {formData.price && formData.price > 0 ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{formData.price && formData.price > 0 ? `Price: ₹${formData.price}` : 'Price Needed'}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
            formData.sku && formData.sku !== 'MD-888' ? 'bg-white/10 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            {formData.sku && formData.sku !== 'MD-888' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{formData.sku && formData.sku !== 'MD-888' ? `SKU: ${formData.sku}` : 'SKU Needed'}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
            formData.images && formData.images.length > 0 && !formData.images[0].includes('fallback') ? 'bg-white/10 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            {formData.images && formData.images.length > 0 && !formData.images[0].includes('fallback') ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{formData.images && formData.images.length > 0 && !formData.images[0].includes('fallback') ? 'Image Added' : 'Image Needed'}</span>
          </div>
        </div>
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#e8e2d5] shadow-xs overflow-hidden">
        {/* Form Tab Navigation */}
        <div className="flex border-b border-[#e8e2d5] bg-[#f5f1e8] overflow-x-auto text-xs font-bold text-[#0f2d22]">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'basic'
                ? 'border-[#1b4332] bg-white text-[#1b4332]'
                : 'border-transparent hover:text-[#1b4332]'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Basic Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'pricing'
                ? 'border-[#1b4332] bg-white text-[#1b4332]'
                : 'border-transparent hover:text-[#1b4332]'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Pricing & Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'content'
                ? 'border-[#1b4332] bg-white text-[#1b4332]'
                : 'border-transparent hover:text-[#1b4332]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Description & Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'media'
                ? 'border-[#1b4332] bg-white text-[#1b4332]'
                : 'border-transparent hover:text-[#1b4332]'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Product Media ({formData.images?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('seo');
              if (!keywordUniverse && formData.id) {
                loadKeywordUniverse();
              }
            }}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'seo'
                ? 'border-[#1b4332] bg-white text-[#1b4332]'
                : 'border-transparent hover:text-[#1b4332]'
            }`}
          >
            <Compass className="w-4 h-4 text-[#c5a059]" />
            <span>SEO & Keywords {keywordUniverse ? `(${keywordUniverse.totalKeywords})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('display')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'display'
                ? 'border-[#1b4332] bg-white text-[#1b4332]'
                : 'border-transparent hover:text-[#1b4332]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Visibility & Display</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('intelligence')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'intelligence'
                ? 'border-[#1b4332] bg-white text-[#1b4332]'
                : 'border-transparent hover:text-[#1b4332]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
            <span>Product Intelligence</span>
            {intelligenceData.status === 'NEEDS_REVIEW' && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                Review
              </span>
            )}
            {intelligenceData.status === 'LOCKED' && (
              <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                Locked
              </span>
            )}
            {intelligenceData.verifiedAttributes.length > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {intelligenceData.verifiedAttributes.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Basic Info */}
        {activeTab === 'basic' && (
          <div className="p-8 space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[#0f2d22] font-bold">
                    Product Title / Name *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAutoFillModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#183F2B] text-white text-[11px] font-bold rounded-lg hover:bg-[#123021] transition-all shadow-xs hover:scale-102 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{initialProduct ? 'Generate / Refresh Details' : 'Generate Details'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => {
                    updateForm('name', e.target.value);
                    if (!initialProduct) {
                      updateForm(
                        'slug',
                        e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                      );
                    }
                  }}
                  placeholder="e.g. Sojat Pure Ultra-Fine Sifted Henna Powder"
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">URL Slug *</label>
                <input
                  type="text"
                  required
                  value={formData.slug || ''}
                  onChange={(e) => updateForm('slug', e.target.value)}
                  placeholder="sojat-pure-henna-powder"
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-mono text-xs focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">Category *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <label className="block text-[#0f2d22] font-bold">
                    Product Type
                  </label>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#edf7f1] text-[#1b4332] border border-[#d8ece0]">
                    <span className="text-gray-500">Product Type:</span>
                    <span className="font-bold text-[#1b4332]">
                      {getProductTypeDisplay(formData.productType)}
                    </span>
                  </span>
                </div>

                <select
                  value={
                    isCustomType
                      ? knownCustomTypes.includes(formData.productType?.trim() || '')
                        ? `KNOWN:${formData.productType?.trim()}`
                        : 'CUSTOM'
                      : normalizeProductType(formData.productType).isPredefined
                      ? normalizeProductType(formData.productType).canonicalType
                      : 'CUSTOM'
                  }
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (selected === 'CUSTOM') {
                      setIsCustomType(true);
                      const norm = normalizeProductType(formData.productType);
                      const preserved = norm.isPredefined ? '' : (formData.productType || '');
                      updateForm('productType', preserved);
                    } else if (selected.startsWith('KNOWN:')) {
                      const customVal = selected.replace('KNOWN:', '');
                      setIsCustomType(true);
                      updateForm('productType', customVal);
                    } else {
                      setIsCustomType(false);
                      updateForm('productType', selected);
                    }
                  }}
                  className="w-full min-h-[44px] p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                >
                  <optgroup label="Predefined Commercial Types">
                    {PREDEFINED_PRODUCT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </optgroup>
                  {knownCustomTypes.length > 0 && (
                    <optgroup label="Reused Catalog Custom Types">
                      {knownCustomTypes.map((k) => (
                        <option key={k} value={`KNOWN:${k}`}>
                          {k}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Custom Option">
                    <option value="CUSTOM">CUSTOM TYPE...</option>
                  </optgroup>
                </select>

                {isCustomType && (
                  <div className="bg-[#f8f6f0] p-3 rounded-xl border border-[#e8e2d5] space-y-1.5 transition-all">
                    <label className="block text-[#0f2d22] font-bold text-xs">
                      Custom Product Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={60}
                      value={formData.productType || ''}
                      onChange={(e) => updateForm('productType', e.target.value)}
                      placeholder="e.g. Balm, Serum, Hair Mask, Soap"
                      className="w-full min-h-[44px] p-3 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                    />
                    <p className="text-[11px] text-[#556960] leading-relaxed">
                      Commercial product classification only. Preserves exact admin wording. Does not invent botanical entities or alter verified SEO claims. Max 60 characters.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">Product SKU *</label>
                <input
                  type="text"
                  required
                  value={formData.sku || ''}
                  onChange={(e) => updateForm('sku', e.target.value)}
                  placeholder="e.g. MD-HEN-250"
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-mono focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[#0f2d22] font-bold">
                    Pack Quantity / Weight *
                  </label>
                  {productVariants.filter((v) => v.isActive !== false).length > 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Variants control selectable pack sizes
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Base Pack is Authoritative
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={formData.quantityOrWeight || ''}
                  onChange={(e) => updateForm('quantityOrWeight', e.target.value)}
                  placeholder="e.g. 250g Pack, 100ml Bottle, Pack of 12"
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  {productVariants.filter((v) => v.isActive !== false).length > 0
                    ? 'Individual retail variations are configured. Storefront, checkout, and feeds use the authoritative default variation.'
                    : 'Authoritative pack size for single-pack products across storefront, cart, schema, and merchant feeds.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Pricing, Retail Variations & Wholesale Control */}
        {activeTab === 'pricing' && (
          <div className="p-8 space-y-8 text-xs">
            {/* 1. Base Product Fallback Pricing & Inventory */}
            <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#1b4332]" />
                  <h3 className="font-bold text-sm text-[#0f2d22]">
                    Base Product Pricing & Inventory Fallback
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-[#666] bg-white px-2.5 py-1 rounded-full border border-[#e8e2d5]">
                  Primary / Default Fallback
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">
                    Base Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price ?? 0}
                    onChange={(e) => updateForm('price', Number(e.target.value))}
                    className="w-full p-3 bg-white border border-[#e8e2d5] rounded-xl font-bold text-[#1b4332] text-sm focus:outline-none focus:border-[#1b4332]"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Used if no individual retail variation is selected.
                  </p>
                </div>

                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">
                    Compare-at Original Price / MRP (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.compareAtPrice ?? 0}
                    onChange={(e) => updateForm('compareAtPrice', Number(e.target.value))}
                    className="w-full p-3 bg-white border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Shown with strikethrough (e.g. ₹299).
                  </p>
                </div>

                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">Stock Availability</label>
                  <select
                    value={formData.stockStatus || 'in_stock'}
                    onChange={(e: any) => updateForm('stockStatus', e.target.value)}
                    className="w-full p-3 bg-white border border-[#e8e2d5] rounded-xl font-semibold focus:outline-none focus:border-[#1b4332]"
                  >
                    <option value="in_stock">In Stock (Available)</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="pre_order">Pre-Order</option>
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Controls &ldquo;Add to Cart&rdquo; button state.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Phase 3A: Retail Variations / Pack Sizes */}
            <div className="bg-white p-5 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e2d5] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1b4332]" />
                    <h3 className="font-bold text-sm text-[#0f2d22]">
                      Retail Variations / Pack Sizes
                    </h3>
                    <span className="bg-[#e8f3ed] text-[#1b4332] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {productVariants.length} Configured
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Configure arbitrary consumer sizes (e.g. 50g, 100g, 175g, 225g, 350g, 500g, 1kg, 125ml, 12 Cones). Quantity is arbitrary and governed by canonical unit families.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1b4332] hover:bg-[#0f2d22] text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Variation</span>
                </button>
              </div>

              {productVariants.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-[#e8e2d5] rounded-xl text-center space-y-2 bg-[#fcfbf7]">
                  <Layers className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="font-bold text-gray-700">No individual retail variations configured.</p>
                  <p className="text-gray-500 max-w-md mx-auto text-[11px]">
                    The base selling price (₹{formData.price}) and default pack ({formData.quantityOrWeight || 'Standard'}) will be used on the storefront. Click &ldquo;Add Variation&rdquo; to add pack sizes like 225g, 500g, or 1kg.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {productVariants.map((v, idx) => (
                    <div
                      key={v.id || idx}
                      className={`p-4 rounded-xl border transition-all ${
                        v.isDefault
                          ? 'border-[#1b4332] bg-[#f7faf8] ring-1 ring-[#1b4332]/20'
                          : 'border-[#e8e2d5] bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#e8e2d5] text-[#0f2d22] flex items-center justify-center font-bold text-[10px]">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-xs text-[#0f2d22]">
                            {v.weight || (v.packQuantity && v.packUnit ? formatVariantWeight(v.packQuantity, v.packUnit) : 'Pack')}
                          </span>
                          {v.isDefault && (
                            <span className="inline-flex items-center gap-1 bg-[#1b4332] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <Star className="w-2.5 h-2.5 fill-white" />
                              Primary Default
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!v.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultVariant(idx)}
                              className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 transition-colors"
                            >
                              Make Default
                            </button>
                          )}
                          <div className="flex items-center border border-[#e8e2d5] rounded-lg overflow-hidden bg-[#fcfbf7]">
                            <button
                              type="button"
                              onClick={() => handleMoveVariant(idx, 'up')}
                              disabled={idx === 0}
                              className="px-2 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                              title="Move Up"
                              aria-label="Move Up"
                            >
                              ▲
                            </button>
                            <span className="w-px h-3.5 bg-[#e8e2d5]" />
                            <button
                              type="button"
                              onClick={() => handleMoveVariant(idx, 'down')}
                              disabled={idx === productVariants.length - 1}
                              className="px-2 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                              title="Move Down"
                              aria-label="Move Down"
                            >
                              ▼
                            </button>
                          </div>
                          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={v.isActive !== false}
                              onChange={(e) => handleUpdateVariant(idx, 'isActive', e.target.checked)}
                              className="w-3.5 h-3.5 text-[#1b4332] rounded focus:ring-0 cursor-pointer"
                            />
                            <span>Active</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Variation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            required
                            value={v.packQuantity}
                            onChange={(e) => handleUpdateVariant(idx, 'packQuantity', Number(e.target.value))}
                            placeholder="e.g. 225"
                            className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#1b4332]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">
                            Unit *
                          </label>
                          <select
                            value={v.packUnit}
                            onChange={(e) => handleUpdateVariant(idx, 'packUnit', e.target.value)}
                            className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#1b4332]"
                          >
                            {(() => {
                              const rule = getProductTypeUnitRule(formData.productType);
                              const isAllowed = Boolean(v.packUnit && rule.allowedUnits.includes(v.packUnit));
                              return (
                                <>
                                  <optgroup label={`Allowed for ${getProductTypeDisplay(formData.productType)} (${rule.family})`}>
                                    {rule.allowedUnits.map((u) => (
                                      <option key={u} value={u}>
                                        {UNIT_DISPLAY_LABELS[u] || u}
                                      </option>
                                    ))}
                                  </optgroup>
                                  {!isAllowed && v.packUnit && (
                                    <optgroup label="Legacy / Non-compliant">
                                      <option value={v.packUnit}>
                                        {UNIT_DISPLAY_LABELS[v.packUnit] || v.packUnit} (Invalid for {getProductTypeDisplay(formData.productType)})
                                      </option>
                                    </optgroup>
                                  )}
                                </>
                              );
                            })()}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">
                            Price (₹) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={v.price}
                            onChange={(e) => handleUpdateVariant(idx, 'price', Number(e.target.value))}
                            placeholder="e.g. 229"
                            className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-bold text-emerald-800 focus:outline-none focus:border-[#1b4332]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">
                            MRP (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={v.compareAtPrice ?? ''}
                            onChange={(e) => handleUpdateVariant(idx, 'compareAtPrice', e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="e.g. 329"
                            className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#1b4332]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">
                            SKU
                          </label>
                          <input
                            type="text"
                            value={v.sku || ''}
                            onChange={(e) => handleUpdateVariant(idx, 'sku', e.target.value)}
                            placeholder="MD-HEN-225"
                            className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-mono focus:outline-none focus:border-[#1b4332]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">
                            Stock Status
                          </label>
                          <select
                            value={v.stockStatus || 'in_stock'}
                            onChange={(e: any) => handleUpdateVariant(idx, 'stockStatus', e.target.value)}
                            className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#1b4332]"
                          >
                            <option value="in_stock">In Stock</option>
                            <option value="out_of_stock">Out of Stock</option>
                            <option value="pre_order">Pre-Order</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Phase 3E & 3F: Product-Level Wholesale / Bulk Pricing Control */}
            <div className="bg-white p-5 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e2d5] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-[#1b4332]" />
                    <h3 className="font-bold text-sm text-[#0f2d22]">
                      Product-Level Wholesale & Bulk Tier Control
                    </h3>
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {productBulkRules.length > 0
                        ? `${productBulkRules.length} Confirmed Rule(s)`
                        : 'Tri-State (Indicative / Custom Quote)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Configure volume pricing tiers for B2B buyers. Fully integrated with canonical bulk_pricing_rules engine and commercial unit governance.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddBulkRule}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1b4332] hover:bg-[#0f2d22] text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Wholesale Tier</span>
                </button>
              </div>

              {/* Wholesale Commercial Unit Banner */}
              <div className="bg-[#fcfbf7] p-3.5 rounded-xl border border-[#e8e2d5] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-gray-700">
                    <Scale className="w-4 h-4 text-[#1b4332]" />
                    <span>Commercial Unit:</span>
                    <strong className="text-[#1b4332] font-bold">
                      {currentWholesaleUnits.wholesaleUnit}
                    </strong>
                  </div>
                  <span>•</span>
                  <div className="text-gray-700">
                    <span>Base Wholesale Rate:</span>
                    <strong className="text-emerald-800 font-bold ml-1">
                      ₹{currentBaseWholesaleRate} / {currentWholesaleUnits.wholesaleUnit}
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-gray-500">
                  <span>Standard Presets: </span>
                  <span className="font-mono font-semibold">
                    {currentWholesaleUnits.presetQuantities.join(', ')} {currentWholesaleUnits.wholesaleUnit}
                  </span>
                </div>
              </div>

              {loadingRules ? (
                <div className="p-6 text-center text-gray-400 font-medium text-xs">
                  Loading wholesale bulk rules...
                </div>
              ) : productBulkRules.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-[#e8e2d5] rounded-xl text-center space-y-2 bg-[#fcfbf7]">
                  <Percent className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="font-bold text-gray-700">No product-specific wholesale tiers configured.</p>
                  <p className="text-gray-500 max-w-md mx-auto text-[11px]">
                    On the public Wholesale calculator, this product currently follows the standard Tri-State model (15% Indicative Preview or Custom Quote). Click &ldquo;Add Wholesale Tier&rdquo; to define a confirmed volume discount for bulk orders.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {!tierValidationResult.valid && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{tierValidationResult.error}</span>
                    </div>
                  )}
                  {productBulkRules.map((rule, rIdx) => {
                    const isConflicting = tierValidationResult.conflictingIndices?.includes(rIdx);

                    // Calculate live effective price preview
                    let effectiveRate = currentBaseWholesaleRate;
                    if (rule.discountType === 'percentage') {
                      effectiveRate = Math.round(currentBaseWholesaleRate * (1 - (rule.discountValue || 0) / 100));
                    } else if (rule.discountType === 'fixed_amount') {
                      effectiveRate = Math.max(0, currentBaseWholesaleRate - (rule.discountValue || 0));
                    } else if (rule.discountType === 'fixed_price') {
                      effectiveRate = rule.discountValue || 0;
                    }

                    return (
                      <div
                        key={rule.id || rIdx}
                        className={`p-4 rounded-xl border bg-white transition-all space-y-3 ${
                          isConflicting
                            ? 'border-rose-300 ring-2 ring-rose-100'
                            : 'border-[#e8e2d5] hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                isConflicting ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              T{rIdx + 1}
                            </span>
                            <span className="font-bold text-xs text-gray-800">
                              Volume Tier: {rule.minQuantity}+ {currentWholesaleUnits.wholesaleUnit}
                            </span>
                            {isConflicting ? (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                                <AlertCircle className="w-2.5 h-2.5" />
                                OVERLAPPING TIER
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                CONFIRMED TIER
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={rule.isActive !== false}
                                onChange={(e) => handleUpdateBulkRule(rIdx, 'isActive', e.target.checked)}
                                className="w-3.5 h-3.5 text-[#1b4332] rounded focus:ring-0 cursor-pointer"
                              />
                              <span>Active</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveBulkRule(rIdx)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Tier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-600 mb-1">
                              Min Quantity ({currentWholesaleUnits.wholesaleUnit}) *
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={rule.minQuantity}
                              onChange={(e) => handleUpdateBulkRule(rIdx, 'minQuantity', Number(e.target.value))}
                              placeholder="25"
                              className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#1b4332]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-600 mb-1">
                              Max Quantity (Optional)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={rule.maxQuantity ?? ''}
                              onChange={(e) => handleUpdateBulkRule(rIdx, 'maxQuantity', e.target.value ? Number(e.target.value) : undefined)}
                              placeholder="Leave blank for unlimited"
                              className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#1b4332]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-600 mb-1">
                              Discount Type *
                            </label>
                            <select
                              value={rule.discountType || 'percentage'}
                              onChange={(e: any) => handleUpdateBulkRule(rIdx, 'discountType', e.target.value)}
                              className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#1b4332]"
                            >
                              <option value="percentage">% Percentage Off</option>
                              <option value="fixed_amount">₹ Off per {currentWholesaleUnits.wholesaleUnit}</option>
                              <option value="fixed_price">Fixed Rate per {currentWholesaleUnits.wholesaleUnit}</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-600 mb-1">
                              Discount Value *
                            </label>
                            <div className="relative flex items-center">
                              {rule.discountType !== 'percentage' && (
                                <span className="absolute left-2.5 text-xs font-bold text-emerald-800 pointer-events-none select-none">
                                  ₹
                                </span>
                              )}
                              <input
                                type="number"
                                min="0"
                                required
                                value={rule.discountValue}
                                onChange={(e) => handleUpdateBulkRule(rIdx, 'discountValue', Number(e.target.value))}
                                placeholder={rule.discountType === 'percentage' ? '15' : '100'}
                                className={`w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-bold text-emerald-800 focus:outline-none focus:border-[#1b4332] ${
                                  rule.discountType === 'percentage' ? 'pr-7' : 'pl-6'
                                }`}
                              />
                              {rule.discountType === 'percentage' && (
                                <span className="absolute right-2.5 text-xs font-bold text-emerald-800 pointer-events-none select-none">
                                  %
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Calculated Live Effective Rate Notice */}
                        <div className="bg-[#f0f8f3] p-2.5 rounded-lg text-[11px] font-semibold text-emerald-900 flex items-center justify-between border border-emerald-200">
                          <span>
                            Effective Wholesale Rate for this tier:
                          </span>
                          <span className="font-extrabold text-xs text-emerald-800">
                            ₹{effectiveRate} / {currentWholesaleUnits.wholesaleUnit}
                            {rule.discountType === 'percentage' && ` (${rule.discountValue}% Savings)`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Phase 3J: Live Admin Preview */}
            <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-amber-900/10 space-y-4">
              <div className="flex items-center gap-2 border-b border-amber-900/10 pb-3">
                <Sparkles className="w-4 h-4 text-[#c5a059]" />
                <h3 className="font-bold text-sm text-[#0f2d22]">
                  Live Storefront & Wholesale Preview (Current Form State)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Retail Storefront Preview */}
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                      Retail Storefront Pack Options
                    </span>
                    <span className="text-[10px] text-gray-500">Customer View</span>
                  </div>

                  {productVariants.length === 0 ? (
                    <div className="p-3 bg-[#fcfbf7] rounded-lg text-[11px] text-gray-600">
                      Standard Pack: <strong>{formData.quantityOrWeight || 'Standard'}</strong> —{' '}
                      <strong className="text-emerald-800">₹{formData.price}</strong>
                      {formData.compareAtPrice && formData.compareAtPrice > (formData.price || 0) && (
                        <span className="text-gray-400 line-through ml-1.5">
                          ₹{formData.compareAtPrice}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {productVariants
                        .filter((v) => v.isActive !== false)
                        .map((v, i) => (
                          <div
                            key={v.id || i}
                            className={`p-2.5 rounded-lg flex items-center justify-between text-xs ${
                              v.isDefault
                                ? 'bg-emerald-50 border border-emerald-200'
                                : 'bg-[#fcfbf7] border border-[#e8e2d5]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800">
                                {v.weight || (v.packQuantity && v.packUnit ? formatVariantWeight(v.packQuantity, v.packUnit) : 'Pack')}
                              </span>
                              {v.isDefault && (
                                <span className="bg-[#1b4332] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                              {v.sku && (
                                <span className="text-[10px] font-mono text-gray-400">
                                  ({v.sku})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {v.compareAtPrice && v.compareAtPrice > v.price && (
                                <span className="text-[11px] text-gray-400 line-through">
                                  ₹{v.compareAtPrice}
                                </span>
                              )}
                              <span className="font-bold text-emerald-800">
                                ₹{v.price}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Wholesale B2B Calculator Preview */}
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                      Wholesale B2B Rate & Tiers
                    </span>
                    <span className="text-[10px] text-gray-500">Commercial View</span>
                  </div>

                  <div className="p-2.5 bg-[#fcfbf7] rounded-lg border border-[#e8e2d5] flex items-center justify-between text-xs">
                    <span className="text-gray-600">Commercial Base Rate:</span>
                    <strong className="text-emerald-800 font-bold">
                      ₹{currentBaseWholesaleRate} / {currentWholesaleUnits.wholesaleUnit}
                    </strong>
                  </div>

                  {productBulkRules.length === 0 ? (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-700" />
                        <span>Standard Tri-State Behavior</span>
                      </div>
                      <p className="text-amber-800 text-[10px]">
                        Wholesale calculator will offer an Indicative 15% preview or route the enquiry to Custom Quote via WhatsApp.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {productBulkRules
                        .filter((r) => r.isActive !== false)
                        .map((r, i) => {
                          let rate = currentBaseWholesaleRate;
                          if (r.discountType === 'percentage') {
                            rate = Math.round(currentBaseWholesaleRate * (1 - (r.discountValue || 0) / 100));
                          } else if (r.discountType === 'fixed_amount') {
                            rate = Math.max(0, currentBaseWholesaleRate - (r.discountValue || 0));
                          } else if (r.discountType === 'fixed_price') {
                            rate = r.discountValue || 0;
                          }
                          return (
                            <div
                              key={r.id || i}
                              className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between text-[11px]"
                            >
                              <span className="font-semibold text-emerald-950">
                                {r.minQuantity}+ {currentWholesaleUnits.wholesaleUnit}
                              </span>
                              <span className="font-bold text-emerald-800">
                                ₹{rate} / {currentWholesaleUnits.wholesaleUnit}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Detailed Content */}
        {activeTab === 'content' && (
          <div className="p-8 space-y-6 text-xs">
            <div>
              <label className="block text-[#0f2d22] font-bold mb-1">Short Description</label>
              <textarea
                rows={2}
                value={formData.shortDescription || ''}
                onChange={(e) => updateForm('shortDescription', e.target.value)}
                placeholder="Brief summary for product cards and search results..."
                className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div>
              <label className="block text-[#0f2d22] font-bold mb-1">Detailed Full Description</label>
              <textarea
                rows={5}
                value={formData.fullDescription || ''}
                onChange={(e) => updateForm('fullDescription', e.target.value)}
                placeholder="Detailed information regarding harvest origin, processing quality, texture..."
                className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#f5f1e8]">
              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">Ingredients</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={ingredientInput}
                    onChange={(e) => setIngredientInput(e.target.value)}
                    placeholder="Add ingredient..."
                    className="flex-1 p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="bg-[#1b4332] text-white px-3 py-2.5 rounded-xl font-bold"
                  >
                    Add
                  </button>
                </div>
                <ul className="space-y-1">
                  {formData.ingredients?.map((ing, idx) => (
                    <li key={idx} className="flex items-center justify-between bg-[#f5f1e8] p-2 rounded-lg">
                      <span>{ing}</span>
                      <button type="button" onClick={() => handleRemoveIngredient(idx)} className="text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">Key Benefits</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    placeholder="Add benefit..."
                    className="flex-1 p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddBenefit}
                    className="bg-[#1b4332] text-white px-3 py-2.5 rounded-xl font-bold"
                  >
                    Add
                  </button>
                </div>
                <ul className="space-y-1">
                  {formData.benefits?.map((ben, idx) => (
                    <li key={idx} className="flex items-center justify-between bg-[#f5f1e8] p-2 rounded-lg">
                      <span>{ben}</span>
                      <button type="button" onClick={() => handleRemoveBenefit(idx)} className="text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <label className="block text-[#0f2d22] font-bold mb-1">Usage Instructions</label>
              <textarea
                rows={3}
                value={formData.usageInstructions || ''}
                onChange={(e) => updateForm('usageInstructions', e.target.value)}
                placeholder="How to mix, apply, leave on, and wash off..."
                className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Product Media */}
        {activeTab === 'media' && (
          <div className="p-8 space-y-6 text-xs">
            {imageUploadError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl font-medium">
                {imageUploadError}
              </div>
            )}

            {/* Option A: Choose from Media Library */}
            <div className="p-5 bg-[#0f2d22] text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1b4332] text-[#c5a059] flex items-center justify-center shrink-0">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif-heading font-bold text-sm text-white">Central Media Library</h4>
                  <p className="text-[11px] text-gray-300">
                    Select high-resolution botanical images, category photos, or uploaded brand assets.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMediaModalOpen(true)}
                className="bg-[#c5a059] text-[#0f2d22] px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#d4af37] transition-colors shrink-0"
              >
                <ImageIcon className="w-4 h-4" /> Choose from Media Library
              </button>
            </div>

            {/* Option B: Direct File Upload */}
            <div className="space-y-2 pt-2 border-t border-[#f5f1e8]">
              <label className="block text-[#0f2d22] font-bold">Upload Local Image Files</label>
              <div className="border-2 border-dashed border-[#e8e2d5] hover:border-[#1b4332] rounded-2xl p-6 text-center bg-[#fcfbf7] transition-colors cursor-pointer relative">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-[#1b4332] mx-auto mb-2" />
                <p className="font-bold text-[#0f2d22]">Click or Drag & Drop Image Files Here</p>
                <p className="text-[11px] text-gray-500 mt-1">Supports JPG, PNG, WEBP, SVG (Max 5MB each)</p>
              </div>
            </div>

            {/* Option C: Paste Image URL */}
            <div className="space-y-2 pt-2 border-t border-[#f5f1e8]">
              <label className="block text-[#0f2d22] font-bold">Or Add External Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  placeholder="https://example.com/image.jpg or /uploads/product.webp"
                  className="flex-1 p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="bg-[#1b4332] text-white px-5 py-3 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-[#c5a059]" /> Add URL
                </button>
              </div>
            </div>

            {/* Gallery Preview & Reorder Manager */}
            <div className="space-y-3 pt-4 border-t border-[#f5f1e8]">
              <div className="flex items-center justify-between">
                <label className="block text-[#0f2d22] font-bold">
                  Product Gallery Manager ({formData.images?.length || 0})
                </label>
                <span className="text-[11px] text-gray-500 font-medium">
                  The first image (Index 1) is used as the Primary Product Cover.
                </span>
              </div>

              {(!formData.images || formData.images.length === 0) ? (
                <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-[#e8e2d5] space-y-2">
                  <ImageIcon className="w-8 h-8 mx-auto text-gray-300" />
                  <p className="font-bold text-gray-600">No Product Images Added Yet</p>
                  <p className="text-[11px]">Select an image from the Media Library, upload a file, or paste a URL.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {formData.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group border border-[#e8e2d5] rounded-2xl overflow-hidden bg-gray-50 aspect-square shadow-xs flex flex-col justify-between"
                    >
                      <Image src={img} alt={`Gallery Image ${idx + 1}`} fill className="object-cover" unoptimized />

                      {/* Cover Badge */}
                      <div className="absolute top-2 left-2 z-10">
                        {idx === 0 ? (
                          <span className="bg-[#0f2d22] text-[#c5a059] text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 border border-[#c5a059]/40">
                            <Star className="w-3 h-3 fill-[#c5a059]" /> Cover
                          </span>
                        ) : (
                          <span className="bg-[#0f2d22]/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                            #{idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-2 right-2 z-10 bg-rose-600 text-white p-1.5 rounded-lg shadow-md hover:bg-rose-700 transition-colors"
                        title="Remove Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Hover Reorder Controls */}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-[#0f2d22]/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between gap-1 text-white z-10">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetCoverImage(idx)}
                            className="text-[10px] bg-[#c5a059] text-[#0f2d22] font-bold px-2 py-1 rounded-md hover:bg-[#d4af37]"
                            title="Set as Primary Cover"
                          >
                            Set Cover
                          </button>
                        )}

                        <div className="flex items-center gap-1 ml-auto">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'left')}
                              className="p-1 bg-[#1b4332] hover:bg-[#2d6a4f] rounded-md"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < (formData.images?.length || 0) - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'right')}
                              className="p-1 bg-[#1b4332] hover:bg-[#2d6a4f] rounded-md"
                              title="Move Right"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: SEO & Autonomous Keyword Intelligence */}
        {activeTab === 'seo' && (
          <div className="p-8 space-y-8 text-xs">
              {/* Universal Auto-SEO Engine Intelligence Card */}
              <div className="bg-white p-6 rounded-2xl border-2 border-[#1b4332]/20 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e2d5] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#c5a059]" />
                    <h3 className="font-momo-display text-base font-normal text-[#0f2d22]">Universal Auto-SEO Intelligence</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full font-extrabold text-[11px] border ${
                        autoSeo.status === 'SEO_READY'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {autoSeo.status === 'SEO_READY' ? '✓ SEO READY' : `⚠ ${autoSeo.status.replace(/_/g, ' ')}`}
                    </span>
                    <button
                      type="button"
                      onClick={applyAutoSeoDefaults}
                      className="px-3 py-1 bg-[#1b4332] text-white hover:bg-[#0f2d22] rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Fill With Auto-SEO</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#556059] leading-relaxed">
                  {autoSeo.statusMessage} This system deterministically generates metadata, keywords, and Google snippets for any current or future botanical product.
                </p>

                {/* Primary Keyword & Search Intent Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="bg-[#fcfbf7] p-3 rounded-xl border border-[#e8e2d5]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Primary Target Keyword</span>
                    <span className="font-extrabold text-xs text-[#1b4332]">{autoSeo.primaryKeyword || 'Derived from product name'}</span>
                  </div>
                  <div className="bg-[#fcfbf7] p-3 rounded-xl border border-[#e8e2d5]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Search Intent</span>
                    <span className="font-extrabold text-xs text-[#c5a059]">{autoSeo.searchIntent}</span>
                  </div>
                  <div className="bg-[#fcfbf7] p-3 rounded-xl border border-[#e8e2d5]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Canonical Route</span>
                    <span className="font-mono text-[11px] text-gray-700 truncate block">{autoSeo.canonicalUrl}</span>
                  </div>
                </div>

                {/* Live Google Search Snippet Simulation */}
                <div className="mt-4 bg-[#f8f9fa] p-4 rounded-xl border border-gray-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-sans">
                    <span className="text-emerald-800 font-bold">https://muskydose.in</span>
                    <span>› products › {formData.slug || 'product'}</span>
                  </div>
                  <div className="text-base text-[#1a0dab] font-medium hover:underline cursor-pointer font-sans truncate">
                    {formData.seoTitle ? `${formData.seoTitle} | Musky Dose` : `${autoSeo.seoTitle} | Musky Dose`}
                  </div>
                  <div className="text-xs text-[#4d5156] font-sans line-clamp-2 leading-relaxed">
                    {formData.seoDescription || autoSeo.metaDescription}
                  </div>
                </div>

                {/* Suggested Secondary Keywords */}
                {autoSeo.secondaryKeywords.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-[#0f2d22] block mb-1.5">Suggested Secondary Keywords (Click to add):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {autoSeo.secondaryKeywords.map((kw, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (!formData.seoKeywords?.includes(kw)) {
                              setIsDirty(true);
                              setFormData((prev) => ({
                                ...prev,
                                seoKeywords: [...(prev.seoKeywords || []), kw],
                              }));
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f5f1e8] hover:bg-[#e8f3ed] text-[#1b4332] border border-[#e8e2d5] transition-colors cursor-pointer"
                        >
                          + {kw}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Top SEO Metadata Fields */}
              <div className="bg-[#fcfbf7] p-6 rounded-2xl border border-[#e8e2d5] space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#c5a059]" />
                    <h3 className="font-bold text-sm text-[#0f2d22]">Product SEO Custom Overrides (Optional)</h3>
                  </div>
                  <span className="text-[11px] text-gray-500 font-medium">Manual Values Override Auto-SEO</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#0f2d22]">Custom SEO Title</label>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        {(formData.seoTitle || autoSeo.seoTitle).length}/60 chars
                      </span>
                    </div>
                    <input
                      type="text"
                      value={formData.seoTitle || ''}
                      onChange={(e) => updateForm('seoTitle', e.target.value)}
                      placeholder={autoSeo.seoTitle}
                      className="w-full p-3 bg-white border border-[#e8e2d5] rounded-xl font-medium text-xs focus:outline-none focus:border-[#1b4332]"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Leave blank to use the auto-generated botanical title.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#0f2d22]">Meta Description</label>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        {(formData.seoDescription || autoSeo.metaDescription).length}/160 chars
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={formData.seoDescription || ''}
                      onChange={(e) => updateForm('seoDescription', e.target.value)}
                      placeholder={autoSeo.metaDescription}
                      className="w-full p-3 bg-white border border-[#e8e2d5] rounded-xl font-medium text-xs focus:outline-none focus:border-[#1b4332]"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Leave blank to use the auto-generated botanical description.</p>
                  </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Target SEO Keywords / Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={seoKeywordInput}
                      onChange={(e) => setSeoKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSeoKeyword();
                        }
                      }}
                      placeholder="Type keyword and press Enter or use suggestions below..."
                      className="flex-1 p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-medium text-xs focus:outline-none focus:border-[#1b4332]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSeoKeyword()}
                      className="bg-[#1b4332] text-white px-4 py-2.5 rounded-xl font-bold hover:bg-[#0f2d22] transition-colors"
                    >
                      Add Tag
                    </button>
                  </div>

                  {(formData.seoKeywords || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-3 bg-white rounded-xl border border-[#e8e2d5]">
                      {(formData.seoKeywords || []).map((kw, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f5f1e8] text-[#1b4332] border border-[#e8e2d5]"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSeoKeyword(i)}
                            className="text-gray-400 hover:text-rose-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Robots Indexing & Technical Directives */}
                <div className="pt-4 border-t border-[#e8e2d5] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-bold text-[#0f2d22] block">Search Engine Robots Indexing</label>
                      <p className="text-[11px] text-gray-500">
                        Control whether Google and other crawlers should index this product page.
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        formData.robotsIndex !== false
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {formData.robotsIndex !== false ? 'INDEXABLE (index, follow)' : 'EXCLUDED (noindex)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-[#e8e2d5]">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.robotsIndex !== false}
                        onChange={(e) => updateForm('robotsIndex', e.target.checked)}
                        className="mt-0.5 rounded text-[#1b4332] focus:ring-[#1b4332]"
                      />
                      <div>
                        <span className="font-bold text-[#0f2d22] block">Allow Search Indexing (`index`)</span>
                        <span className="text-[10.5px] text-gray-500">
                          Uncheck for discontinued, seasonal, or duplicate products.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.robotsFollow !== false}
                        onChange={(e) => updateForm('robotsFollow', e.target.checked)}
                        className="mt-0.5 rounded text-[#1b4332] focus:ring-[#1b4332]"
                      />
                      <div>
                        <span className="font-bold text-[#0f2d22] block">Allow Link Following (`follow`)</span>
                        <span className="text-[10.5px] text-gray-500">
                          Allows search engines to follow outbound links from this page.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Social Open Graph Share Image */}
                <div className="pt-4 border-t border-[#e8e2d5] space-y-3">
                  <div>
                    <label className="font-bold text-[#0f2d22] block">Social Share / Open Graph Image (1200×630)</label>
                    <p className="text-[11px] text-gray-500">
                      Thumbnail displayed when this product link is shared on WhatsApp, Facebook, or Twitter.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={formData.ogImageUrl || ''}
                      onChange={(e) => updateForm('ogImageUrl', e.target.value)}
                      placeholder={formData.images?.[0] || 'Leave blank to use primary cover photo...'}
                      className="flex-1 p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-mono text-xs focus:outline-none focus:border-[#1b4332]"
                    />
                    <button
                      type="button"
                      onClick={() => setIsMediaModalOpen(true)}
                      className="px-3.5 py-2 bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] border border-[#e8e2d5] rounded-xl font-bold text-xs shrink-0"
                    >
                      Choose from Media Library
                    </button>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-[#e8e2d5] flex items-center gap-3">
                    <div className="relative w-20 h-12 bg-gray-100 rounded-lg overflow-hidden border border-[#e8e2d5] shrink-0">
                      <Image
                        src={formData.ogImageUrl || formData.images?.[0] || '/images/fallback.svg'}
                        alt="Social Share Preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="text-[11px] text-gray-600 min-w-0">
                      <p className="font-bold text-[#0f2d22] truncate">
                        {formData.seoTitle || formData.name || 'Product Title'}
                      </p>
                      <p className="text-gray-400 text-[10px] truncate">
                        {formData.ogImageUrl ? 'Using Custom Social Share Image' : 'Using Primary Product Cover Image'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product SEO Health & Quality Score Card */}
            {seoHealth && (
              <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e8e2d5]">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                      <h3 className="font-bold text-sm text-[#0f2d22]">Product SEO Health Evaluation</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          seoHealth.rating === 'EXCELLENT'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : seoHealth.rating === 'GOOD'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {seoHealth.overallScore}% — {seoHealth.rating}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Internal assessment evaluating metadata completeness, keyword universe coverage, and demand matching.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Metadata</span>
                    <div className="text-base font-extrabold text-[#1b4332] mt-0.5">{seoHealth.metadataScore}%</div>
                  </div>
                  <div className="p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Completeness</span>
                    <div className="text-base font-extrabold text-[#1b4332] mt-0.5">{seoHealth.completenessScore}%</div>
                  </div>
                  <div className="p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Keyword Depth</span>
                    <div className="text-base font-extrabold text-[#1b4332] mt-0.5">{seoHealth.keywordCoverageScore}%</div>
                  </div>
                  <div className="p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Demand Match</span>
                    <div className="text-base font-extrabold text-[#1b4332] mt-0.5">{seoHealth.demandMatchScore}%</div>
                  </div>
                </div>

                {seoHealth.recommendations?.length > 0 && (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                    <div className="font-bold text-[11px] uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Recommended Actions to Improve Health:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                      {seoHealth.recommendations.map((rec: string, idx: number) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Semantic Internal Linking Suggestions */}
            {internalLinks?.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#e8e2d5]">
                  <div>
                    <h3 className="font-bold text-sm text-[#0f2d22] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#c5a059]" />
                      <span>Semantic Internal Linking Network</span>
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Recommended internal links to strengthen topical authority and cross-product discovery.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {internalLinks.map((link: any) => (
                    <div key={link.id} className="p-3 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5] flex flex-col justify-between gap-1.5">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#0f2d22]">{link.targetTitle}</span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                            {link.targetType}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-600 italic mt-0.5">&ldquo;{link.anchorText}&rdquo;</div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-[10px] text-stone-500">
                        <span className="font-mono truncate max-w-[120px]">{link.targetUrl}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator !== 'undefined') {
                                navigator.clipboard.writeText(`[${link.anchorText}](${link.targetUrl})`);
                                alert('Copied markdown link to clipboard!');
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-white border border-[#e8e2d5] font-bold text-[#1b4332] hover:bg-[#1b4332] hover:text-white transition-colors"
                            title="Copy Markdown Link"
                          >
                            Copy Link
                          </button>
                          <span className="font-bold text-emerald-700">{link.relevanceScore}% Fit</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Autonomous Keyword Intelligence Assistant */}
            <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e8e2d5]">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#c5a059]" />
                    <h3 className="font-bold text-sm text-[#0f2d22]">Autonomous Keyword Universe</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      LIVE AI ENGINE
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Automatically derived across 10 strategic categories with real Google Search demand matching.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadKeywordUniverse(true)}
                  disabled={loadingUniverse}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#1b4332] bg-[#f5f1e8] border border-[#e8e2d5] hover:bg-[#e8e2d5] transition-colors shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUniverse ? 'animate-spin' : ''}`} />
                  <span>{loadingUniverse ? 'Generating Universe...' : 'Re-Sync Universe'}</span>
                </button>
              </div>

              {loadingUniverse && !keywordUniverse && (
                <div className="p-8 text-center text-gray-500 font-bold">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#c5a059] mb-2" />
                  <p>Analyzing botanical attributes and generating keyword universe...</p>
                </div>
              )}

              {keywordUniverse && (
                <div className="space-y-6">
                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5]">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Targets</div>
                      <div className="text-lg font-black text-[#1b4332] mt-0.5">{keywordUniverse.totalKeywords}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Verified Demand</div>
                      <div className="text-lg font-black text-emerald-800 mt-0.5">{keywordUniverse.verifiedCount}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Content Opportunities</div>
                      <div className="text-lg font-black text-amber-800 mt-0.5">{keywordUniverse.opportunityCount}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5]">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Categories</div>
                      <div className="text-lg font-black text-[#1b4332] mt-0.5">10 Types</div>
                    </div>
                  </div>

                  {/* AI Quick Suggestions */}
                  <div className="p-4 rounded-xl bg-[#f5f1e8] border border-[#e8e2d5] space-y-3">
                    <div className="font-bold text-xs text-[#0f2d22] flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-[#c5a059]" />
                      <span>One-Click SEO Suggestions</span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-600 w-24 shrink-0">Primary:</span>
                        <button
                          type="button"
                          onClick={() => {
                            updateForm('seoTitle', `${keywordUniverse.suggestedPrimary} | Musky Dose`);
                            handleAddSeoKeyword(keywordUniverse.suggestedPrimary);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#e8e2d5] font-bold text-[#1b4332] hover:bg-[#1b4332] hover:text-white transition-colors"
                        >
                          + {keywordUniverse.suggestedPrimary}
                        </button>
                      </div>

                      {keywordUniverse.suggestedSecondary?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-gray-600 w-24 shrink-0">Secondary:</span>
                          {keywordUniverse.suggestedSecondary.slice(0, 4).map((kw: string, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAddSeoKeyword(kw)}
                              className="px-2 py-0.5 rounded-md bg-white border border-[#e8e2d5] text-[10px] font-semibold text-gray-700 hover:bg-[#1b4332] hover:text-white transition-colors"
                            >
                              + {kw}
                            </button>
                          ))}
                        </div>
                      )}

                      {keywordUniverse.suggestedQuestions?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-gray-600 w-24 shrink-0">FAQ Queries:</span>
                          {keywordUniverse.suggestedQuestions.slice(0, 3).map((kw: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-white/70 border border-[#e8e2d5] text-[10px] italic text-gray-600"
                            >
                              &ldquo;{kw}&rdquo;
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interactive Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-[11px] font-bold">
                    {['ALL', 'PRIMARY', 'SECONDARY', 'LONG_TAIL', 'QUESTION', 'BUYER_INTENT', 'BENEFIT', 'USE_CASE', 'INGREDIENT', 'REGIONAL', 'SEMANTIC'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveUniverseCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl border transition-colors shrink-0 ${
                          activeUniverseCategory === cat
                            ? 'bg-[#1b4332] text-white border-[#1b4332]'
                            : 'bg-[#fcfbf7] text-gray-600 border-[#e8e2d5] hover:border-[#1b4332]'
                        }`}
                      >
                        {cat.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Keyword Targets Table */}
                  <div className="border border-[#e8e2d5] rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#f5f1e8] text-[#0f2d22] font-bold border-b border-[#e8e2d5]">
                        <tr>
                          <th className="p-3">Keyword Candidate</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Intent</th>
                          <th className="p-3">Relevance</th>
                          <th className="p-3">Verified Demand</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e8e2d5]">
                        {keywordUniverse.keywords
                          .filter((k: any) => activeUniverseCategory === 'ALL' || k.keywordType === activeUniverseCategory)
                          .slice(0, 40)
                          .map((kw: any) => (
                            <tr key={kw.id} className="hover:bg-[#fcfbf7] transition-colors">
                              <td className="p-3 font-bold text-[#0f2d22]">
                                <div className="flex items-center gap-2">
                                  <span>{kw.keyword}</span>
                                  {kw.isOpportunity && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800" title={kw.opportunityReason}>
                                      OPPORTUNITY
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                                  {kw.keywordType}
                                </span>
                              </td>
                              <td className="p-3 text-[11px] text-gray-500 font-medium">{kw.searchIntent}</td>
                              <td className="p-3 font-bold text-[#1b4332]">{kw.relevanceScore}%</td>
                              <td className="p-3">
                                {kw.verifiedSearchVolume ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">
                                    <span>{kw.verifiedSearchVolume.toLocaleString()}/mo</span>
                                    {kw.verifiedTrend === 'RISING' && <span>📈</span>}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 font-medium italic">Unverified</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleAddSeoKeyword(kw.keyword)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#1b4332] text-white hover:bg-[#0f2d22] transition-colors"
                                >
                                  + Add to SEO
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Visibility & Display */}
        {activeTab === 'display' && (
          <div className="p-8 space-y-6 text-xs">
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-[#e8e2d5] bg-[#fcfbf7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive ?? true}
                  onChange={(e) => updateForm('isActive', e.target.checked)}
                  className="w-5 h-5 accent-[#1b4332]"
                />
                <div>
                  <div className="font-bold text-[#0f2d22] text-sm">Active in Public Store</div>
                  <div className="text-[11px] text-gray-500">
                    When checked, product is visible to public visitors and customers.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-xl border border-[#e8e2d5] bg-[#fcfbf7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFeatured ?? false}
                  onChange={(e) => updateForm('isFeatured', e.target.checked)}
                  className="w-5 h-5 accent-[#1b4332]"
                />
                <div>
                  <div className="font-bold text-[#0f2d22] text-sm">Featured Product</div>
                  <div className="text-[11px] text-gray-500">
                    Display in the prominent Featured section on the Homepage.
                  </div>
                </div>
              </label>

              <div className="p-4 rounded-xl border border-[#e8e2d5] bg-[#fcfbf7]">
                <label className="block font-bold text-[#0f2d22] mb-1">Sort Display Order</label>
                <input
                  type="number"
                  value={formData.sortOrder ?? 1}
                  onChange={(e) => updateForm('sortOrder', Number(e.target.value))}
                  className="w-32 p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-bold focus:outline-none focus:border-[#1b4332]"
                />
                <p className="text-[11px] text-gray-500 mt-1">Lower numbers appear first in catalog listings.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Product Intelligence & Knowledge Controls */}
        {activeTab === 'intelligence' && (
          <div className="p-4 sm:p-8">
            <ProductIntelligenceSection
              intelligence={intelligenceData}
              onChange={(updated) => {
                setIsDirty(true);
                setIntelligenceData(updated);
              }}
              productName={formData.name || ''}
            />
          </div>
        )}

        {/* Bottom Save Action Footer */}
        <div className="p-6 bg-[#f5f1e8] border-t border-[#e8e2d5] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              if (isDirty && !confirm('You have unsaved changes. Leave anyway?')) return;
              router.push('/admin/products');
            }}
            className="px-5 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors text-xs"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-7 py-3 rounded-xl font-bold text-xs shadow hover:bg-[#0f2d22] transition-colors disabled:opacity-50 shrink-0"
          >
            <Save className="w-4 h-4 text-[#c5a059]" />
            <span>{saving ? 'Saving Product Record...' : 'Save Product Record'}</span>
          </button>
        </div>
      </form>

      <MediaSelectModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={(url) => handleSelectFromMediaLibrary(url)}
        categoryFilter="products"
        title="Select Product Gallery Image"
      />
    </div>
  );
}
