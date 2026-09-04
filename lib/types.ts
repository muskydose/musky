import type {
  IntelligenceStatus,
  ProductScope,
  VerifiedAttribute,
  ProductFamily,
} from '@/lib/growth/universal-product-contract';

export interface BrandColors {
  primary: string;
  secondary: string;
  henna: string;
  gold: string;
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface TrustStripItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  sortOrder: number;
}

export type FieldConfidence = 'VERIFIED' | 'ADMIN_DEFINED' | 'DERIVED' | 'NEEDS_REVIEW';

export type ProductLifecycleStatus = 'DRAFT' | 'AUTO_FILLED' | 'ADMIN_REVIEW' | 'SAVED' | 'ACTIVATED';

export interface ProductFieldMetadata {
  value: any;
  source: 'SYSTEM' | 'ADMIN_DEFINED' | 'VERIFIED' | 'AI_SUGGESTION';
  confidence: FieldConfidence;
  lockedFromAutoOverwrite?: boolean;
  updatedAt?: string;
}

export interface ProductUnitConfig {
  sellingUnit: string; // e.g. 'Bottle', 'Cone', 'Pouch', 'Jar', 'Box', 'Bag', 'Piece'
  packQuantity: number; // e.g. 500, 1, 10, 25, 100
  packUnit: string; // e.g. 'ml', 'Litre', 'Piece', 'g', 'kg', 'Box'
  pricingUnit: string; // e.g. 'ml', 'Litre', 'Piece', 'kg', 'Box'
  wholesaleUnit: string; // e.g. 'Litre', 'Box', 'kg', 'Piece'
  minWholesaleQuantity?: number;
  maxWholesaleQuantity?: number;
  conversionRule?: string; // e.g. '12 Pieces = 1 Box', '1000 ml = 1 Litre'
  confidence?: FieldConfidence;
  source?: 'ADMIN_DEFINED' | 'DERIVED' | 'VERIFIED' | 'NEEDS_REVIEW';
  lockedFromAutoOverwrite?: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  weight: string; // e.g., "100g", "250g", "500g", "1kg", "5kg", "25kg", "500ml", "1 Litre", "12 Cones"
  price: number;
  compareAtPrice?: number;
  stockQuantity?: number;
  stockStatus: 'in_stock' | 'out_of_stock' | 'pre_order';
  isWholesaleEligible?: boolean;
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
  packQuantity?: number;
  packUnit?: string;
  pricingUnit?: string;
  sellingUnit?: string;
  wholesaleUnit?: string;
  conversionRule?: string;
}

export interface ProductIntelligenceMetadata {
  status: IntelligenceStatus;
  entityKey: string;
  family?: ProductFamily;
  scopes: ProductScope[];
  verifiedAttributes: VerifiedAttribute[];
  updatedAt?: string;
  notes?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName?: string;
  shortDescription: string;
  fullDescription: string;
  intelligence?: ProductIntelligenceMetadata;
  price: number;
  compareAtPrice?: number;
  quantityOrWeight: string; // e.g., "100g", "250g", "500g Pack", "500ml", "1 Litre", "Pack of 12 Cones"
  sku: string;
  images: string[];
  variants?: ProductVariant[];
  ingredients: string[];
  benefits: string[];
  usageInstructions: string;
  stockStatus: 'in_stock' | 'out_of_stock' | 'pre_order';
  stockQuantity?: number;
  lowStockThreshold?: number;
  reservedQuantity?: number;
  isFeatured: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isHomepage?: boolean;
  isSeasonal?: boolean;
  isActive: boolean;
  sortOrder: number;
  productType?: 'POWDER' | 'RAW' | 'FINISHED' | string;
  lifecycleStatus?: ProductLifecycleStatus;
  sellingUnit?: string;
  packQuantity?: number;
  packUnit?: string;
  pricingUnit?: string;
  wholesaleUnit?: string;
  minWholesaleQuantity?: number;
  maxWholesaleQuantity?: number;
  conversionRule?: string;
  unitConfig?: ProductUnitConfig;
  isWholesaleEligible?: boolean;
  fieldMetadata?: Record<string, ProductFieldMetadata>;
  lockedFields?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  ogImageUrl?: string;
  relatedGuideIds?: string[];
  relatedProductIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  weight?: string;
}

export type OrderStatus =
  | 'NEW'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED';

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  changedAt: string;
  notes?: string;
  updatedBy?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerWhatsapp?: string;
  customerEmail?: string;
  customerHouseShop?: string;
  customerAddress: string;
  customerArea?: string;
  customerLandmark?: string;
  customerCity?: string;
  customerState?: string;
  customerPincode?: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount?: number;
  discountDetails?: string;
  shippingFee: number;
  totalAmount: number;
  orderStatus: OrderStatus;
  statusHistory?: OrderStatusHistoryItem[];
  paymentStatus: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod: 'WhatsApp' | 'Cash on Delivery' | 'Online Payment' | 'UPI';
  paymentTransactionId?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
  notes?: string;
  campaignId?: string;
  campaignName?: string;
  couponCode?: string;
  campaignDiscountAmount?: number;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlags {
  onlinePaymentsEnabled?: boolean;
  wholesaleEnabled?: boolean;
  inventoryEnabled?: boolean;
  customerAccountsEnabled?: boolean;
  couponsEnabled?: boolean;
  shippingIntegrationEnabled?: boolean;
  invoiceEnabled?: boolean;
  notificationsEnabled?: boolean;
  recommendationsEnabled?: boolean;
  analyticsEnabled?: boolean;
  multilingualEnabled?: boolean;
  exportModeEnabled?: boolean;
}

export interface PaymentConfig {
  provider: 'razorpay' | 'manual';
  enabled: boolean;
  mode: 'test' | 'live';
  keyId?: string;
  merchantName?: string;
}

export interface ShippingConfig {
  provider: 'shiprocket' | 'flat_rate' | 'manual';
  enabled: boolean;
  defaultCourier?: string;
  freeShippingThreshold: number;
  flatRateAmount: number;
}

export interface InvoiceConfig {
  enabled: boolean;
  gstin?: string;
  pan?: string;
  companyLegalName?: string;
  registeredAddress?: string;
  invoicePrefix?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  houseShop?: string;
  address?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string;
  createdAt: string;
}

export interface CheckoutFieldSetting {
  enabled: boolean;
  required: boolean;
}

export interface CheckoutFieldConfig {
  fullName: CheckoutFieldSetting;
  mobile: CheckoutFieldSetting;
  whatsapp: CheckoutFieldSetting;
  email: CheckoutFieldSetting;
  houseShop: CheckoutFieldSetting;
  address: CheckoutFieldSetting;
  area: CheckoutFieldSetting;
  landmark: CheckoutFieldSetting;
  city: CheckoutFieldSetting;
  state: CheckoutFieldSetting;
  pincode: CheckoutFieldSetting;
  notes: CheckoutFieldSetting;
}

export interface HomepageItemConfig {
  id: string;
  enabled: boolean;
  sortOrder: number;
  isFeatured?: boolean;
}

export interface HomepageSectionConfig {
  id: string; // 'announcement' | 'navbar' | 'hero' | 'trust_strip' | 'bestsellers' | 'categories' | 'video' | 'why_musky_dose' | 'sojat_story' | 'new_arrivals' | 'guides' | 'reviews' | 'wholesale_cta' | 'whatsapp_cta' | 'footer'
  name: string;
  enabled: boolean;
  sortOrder: number;
  heading?: string;
  subheading?: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  selectedProductIds?: string[];
  selectedCategoryIds?: string[];
  itemLimit?: number;
}

export interface HomepageVideoConfig {
  enabled: boolean;
  videoUrl: string;
  posterUrl: string;
  heading?: string;
  subheading?: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  badgeText?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

export interface AnnouncementItem {
  id: string;
  text: string;
  link?: string;
  enabled: boolean;
  sortOrder: number;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT' | string;
  badge?: string;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  sortOrder: number;
  isCta?: boolean;
  isExternal?: boolean;
}

export interface FooterLink {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  sortOrder: number;
  isExternal?: boolean;
}

export interface FooterSectionConfig {
  id: string;
  title: string;
  enabled: boolean;
  sortOrder: number;
  links: FooterLink[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  enabled: boolean;
  sortOrder: number;
}

export type CustomSectionType =
  | 'heading_text'
  | 'image_text'
  | 'banner_cta'
  | 'product_grid'
  | 'category_grid'
  | 'faq'
  | 'whatsapp_cta';

export interface CustomPageSectionContent {
  heading?: string;
  subheading?: string;
  bodyText?: string;
  textAlignment?: 'left' | 'center' | 'right';
  imageUrl?: string;
  imageAlt?: string;
  imagePosition?: 'left' | 'right';
  buttonText?: string;
  buttonLink?: string;
  backgroundColor?: 'default' | 'neutral' | 'emerald' | 'dark' | 'gold';
  // Product Grid
  categoryId?: string;
  productIds?: string[];
  productCount?: number;
  // Category Grid
  categoryIds?: string[];
  // FAQ
  faqs?: { id: string; question: string; answer: string }[];
  // WhatsApp CTA
  whatsappMessage?: string;
}

export interface CustomPageSection {
  id: string;
  type: CustomSectionType;
  title?: string;
  subtitle?: string;
  enabled: boolean;
  sortOrder: number;
  content?: CustomPageSectionContent;
}

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  published: boolean;
  sections: CustomPageSection[];
  createdAt: string;
  updatedAt: string;
}

export interface PolicyContent {
  title: string;
  summary?: string;
  content: string;
  enabled: boolean;
  updatedAt?: string;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
  altText?: string;
  category?: 'products' | 'categories' | 'hero' | 'factory' | 'brand' | 'og' | 'general';
  uploadedAt: string;
  usedIn?: string[];
}

export interface WhyCard {
  id: string;
  title: string;
  description: string;
  icon?: string;
  imageUrl?: string;
  enabled: boolean;
  sortOrder: number;
}

export interface TestimonialItem {
  id: string;
  customerName: string;
  location?: string;
  reviewText: string;
  rating: number; // 1 to 5
  imageUrl?: string;
  enabled: boolean;
  sortOrder: number;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  eyebrow?: string;
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  imageUrl: string;
  desktopImageUrl?: string;
  mobileImageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CmsTextConfig {
  // Navigation & Search
  navSearchPlaceholder?: string;
  navWhatsappCtaText?: string;
  navCartButtonText?: string;
  navWishlistText?: string;
  navCategoryDropdownTitle?: string;
  navAllProductsText?: string;
  navWholesaleText?: string;
  sojatBadgeText?: string;

  // Homepage
  heroEyebrow?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroPrimaryCtaText?: string;
  heroSecondaryCtaText?: string;
  featuredSectionTitle?: string;
  featuredSectionDescription?: string;
  categorySectionTitle?: string;
  categorySectionDescription?: string;
  sojatStoryBadge?: string;
  sojatStoryTitle?: string;
  homepageHennaSectionTitle?: string;
  homepageHennaSectionSubtitle?: string;
  homepageHairSectionTitle?: string;
  homepageHairSectionSubtitle?: string;
  homepageViewAllProductsCta?: string;
  homepageSojatStoryTitle?: string;
  homepageSojatStorySubtitle?: string;
  homepageSojatStoryCtaText?: string;
  whyMuskyDoseTitle?: string;
  whyMuskyDoseDescription?: string;
  homeFaqTitle?: string;
  testimonialsSectionTitle?: string;
  testimonialsSectionDescription?: string;
  wholesaleCtaHeading?: string;
  wholesaleCtaDescription?: string;
  wholesaleCtaButtonText?: string;
  finalCtaHeading?: string;
  finalCtaDescription?: string;
  finalCtaButtonText?: string;

  // FAQ Page
  faqHeroBadge?: string;
  faqPageTitle?: string;
  faqPageSubtitle?: string;
  faqStillHaveQuestionsTitle?: string;
  faqStillHaveQuestionsSubtitle?: string;
  faqWhatsappCtaText?: string;
  faqEmptyTitle?: string;
  faqEmptyDescription?: string;

  // Products & Detail
  productsPageTitle?: string;
  productsPageSubtitle?: string;
  productSearchPlaceholder?: string;
  productsSearchPlaceholder?: string;
  productsFilterCategoryAll?: string;
  productsSortLabel?: string;
  productsSortFeatured?: string;
  productsSortPriceLowHigh?: string;
  productsSortPriceHighLow?: string;
  productsSortRating?: string;
  productsResetFiltersText?: string;
  productsLoadMoreText?: string;
  productsCustomEnquiryBadge?: string;
  productsCustomEnquiryTitle?: string;
  productsCustomEnquirySubtitle?: string;
  productsCustomEnquiryPlaceholder?: string;
  productsCustomEnquiryCta?: string;
  productCardInStockBadge?: string;
  productCardOutOfStockBadge?: string;
  productCardHeritageBadge?: string;
  productCardTripleShiftedBadge?: string;
  productCardViewDetailsText?: string;
  productCardAddToCartText?: string;
  productCardWhatsappOrderText?: string;
  productDetailBreadcrumbHome?: string;
  productDetailBreadcrumbProducts?: string;
  productDetailPriceLabel?: string;
  productDetailWeightLabel?: string;
  productDetailQuantityLabel?: string;
  productDetailKeyIngredientsHeading?: string;
  productDetailBenefitsHeading?: string;
  productDetailHowToUseHeading?: string;
  productDetailDescriptionHeading?: string;
  productDetailReviewsHeading?: string;
  productDetailRelatedProductsHeading?: string;
  productDetailWholesaleEnquiryCtaText?: string;
  productDetailTrustBadge1?: string;
  productDetailTrustBadge2?: string;
  productDetailTrustBadge3?: string;
  productDetailShareText?: string;
  productDetailLinkCopiedText?: string;
  productDetailDirectOrderCta?: string;
  productDetailAddToCartCta?: string;
  productDetailOrderWhatsAppText?: string;
  productDetailShareWhatsappText?: string;
  productDetailBulkInquiryTitle?: string;
  productDetailBulkInquirySubtitle?: string;
  productDetailBulkInquiryCta?: string;
  productDetailFaqHeading?: string;

  // Categories
  categoriesPageTitle?: string;
  categoriesPageSubtitle?: string;
  categoryProductsCountText?: string;

  // Cart, Checkout & Wishlist
  cartTitle?: string;
  cartEmptyTitle?: string;
  cartEmptySubtitle?: string;
  cartEmptyDescription?: string;
  cartEmptyCtaText?: string;
  cartSubtotalLabel?: string;
  cartShippingLabel?: string;
  cartShippingCalculatedText?: string;
  cartTotalLabel?: string;
  cartCheckoutButtonText?: string;
  cartApplyCouponPlaceholder?: string;
  cartApplyCouponButtonText?: string;
  cartDrawerSubtitle?: string;
  cartCustomerDetailsHeading?: string;
  cartCustomerNamePlaceholder?: string;
  cartCustomerAddressPlaceholder?: string;
  cartBulkDiscountLabel?: string;
  cartShippingNotice?: string;

  checkoutHeaderTitle?: string;
  checkoutHeaderSubtitle?: string;
  checkoutPageTitle?: string;
  checkoutPlaceOrderWhatsappText?: string;
  checkoutCustomerDetailsHeading?: string;
  checkoutDeliveryAddressHeading?: string;
  checkoutOrderSummaryHeading?: string;
  checkoutSubmitButtonText?: string;
  checkoutNoticeText?: string;
  checkoutBackToCartText?: string;
  checkoutFullNameLabel?: string;
  checkoutFullNamePlaceholder?: string;
  checkoutMobileLabel?: string;
  checkoutMobilePlaceholder?: string;
  checkoutAddressLabel?: string;
  checkoutAddressPlaceholder?: string;
  checkoutCityLabel?: string;
  checkoutCityPlaceholder?: string;
  checkoutStateLabel?: string;
  checkoutPincodeLabel?: string;
  checkoutPincodePlaceholder?: string;
  checkoutCouponSectionTitle?: string;

  wishlistDrawerTitle?: string;
  wishlistDrawerSubtitle?: string;
  wishlistEmptyTitle?: string;
  wishlistEmptySubtitle?: string;
  wishlistExploreCta?: string;
  wishlistMoveToCartText?: string;

  // Contact & Wholesale
  contactPageTitle?: string;
  contactBadgeText?: string;
  contactHeroTitle?: string;
  contactHeroSubtitle?: string;
  contactFormHeading?: string;
  contactFormTitle?: string;
  contactFormSubtitle?: string;
  contactInfoHeading?: string;
  contactSubmitButtonText?: string;
  contactFullNameLabel?: string;
  contactFullNamePlaceholder?: string;
  contactPhoneLabel?: string;
  contactPhonePlaceholder?: string;
  contactEmailLabel?: string;
  contactEmailPlaceholder?: string;
  contactEnquiryTypeLabel?: string;
  contactMessageLabel?: string;
  contactMessagePlaceholder?: string;

  wholesalePageTitle?: string;
  wholesaleHeroBadgeB2B?: string;
  wholesaleHeroBadgeBulk?: string;
  wholesaleHeroTitle?: string;
  wholesaleHeroSubtitle?: string;
  wholesaleFormHeading?: string;
  wholesaleFormTitle?: string;
  wholesaleFormSubtitle?: string;
  wholesaleSubmitButtonText?: string;
  wholesaleFullNameLabel?: string;
  wholesaleFullNamePlaceholder?: string;
  wholesaleBusinessNameLabel?: string;
  wholesaleBusinessNamePlaceholder?: string;
  wholesalePhoneLabel?: string;
  wholesalePhonePlaceholder?: string;
  wholesaleEmailLabel?: string;
  wholesaleEmailPlaceholder?: string;
  wholesaleCityLabel?: string;
  wholesaleCityPlaceholder?: string;
  wholesaleStateLabel?: string;
  wholesaleStatePlaceholder?: string;
  wholesaleProductsLabel?: string;
  wholesaleProductsPlaceholder?: string;
  wholesaleQuantityLabel?: string;
  wholesaleQuantityPlaceholder?: string;
  wholesaleNotesLabel?: string;
  wholesaleNotesPlaceholder?: string;
  wholesaleCalculatorTitle?: string;
  wholesaleCalculatorSubtitle?: string;
  wholesaleCalculatorDisclaimer?: string;
  wholesalePricingNotice?: string;
  wholesaleInquiryCtaText?: string;

  // Offers
  offersHeroBadge?: string;
  offersHeroTitle?: string;
  offersHeroSubtitle?: string;
  offersEmptyTitle?: string;
  offersEmptyDescription?: string;

  // Footer & Trust
  footerBrandDescription?: string;
  footerContactHeading?: string;
  footerQuickLinksHeading?: string;
  footerCategoriesHeading?: string;
  footerCustomerCareHeading?: string;
  footerCopyrightText?: string;
  footerTrustTitle?: string;
  footerTrustSubtitle?: string;

  // Errors, Policy UI & Empty States
  emptySearchTitle?: string;
  emptySearchDescription?: string;
  emptySearchClearCta?: string;
  emptyCategoryTitle?: string;
  emptyCategoryDescription?: string;
  notFoundBadgeText?: string;
  notFoundTitle?: string;
  notFoundDescription?: string;
  notFoundButtonText?: string;
  notFoundExploreButtonText?: string;
  policyHeroBadge?: string;
  policyBadgeText?: string;
  policyBackToHomeText?: string;
  policyNotPublishedTitle?: string;
  policyNotPublishedMessage?: string;
  policyUnpublishedTitle?: string;
  policyUnpublishedDescription?: string;
  policyNeedSupportTitle?: string;
  policyNeedSupportSubtitle?: string;
  policyNeedSupportMessage?: string;
  policyWhatsappCtaText?: string;
  policyContactWhatsappText?: string;
  genericErrorMessage?: string;
}

export interface LayoutControls {
  // 1. Brand & Header Sizing
  mobileLogoWidth?: number; // px e.g. 140
  desktopLogoWidth?: number; // px e.g. 180
  headerPaddingVertical?: number; // px e.g. 12
  headerStyle?: 'compact' | 'normal';

  // 2. Hero & Banner Sizing
  mobileHeroHeight?: number; // px e.g. 420
  desktopHeroHeight?: number; // px e.g. 560
  heroHeadingMobileSize?: number; // px e.g. 28
  heroHeadingDesktopSize?: number; // px e.g. 48

  // 3. Product Card & Grid Sizing
  mobileGridColumns?: 1 | 2; // default: 2
  desktopGridColumns?: 3 | 4 | 5; // default: 4
  productCardAspectRatio?: 'square' | 'portrait' | 'landscape'; // '1:1', '3:4', '4:3'
  productCardPadding?: 'compact' | 'standard' | 'spaced';

  // 4. Typography & Spacing Scale
  headingScaleFactor?: number; // 0.9, 1.0, 1.1
  bodyFontSizeBase?: number; // 14, 15, 16
  containerMaxWidth?: number; // 1200, 1280, 1440, 1600

  // 5. Container & Padding Controls
  sectionVerticalPadding?: 'compact' | 'standard' | 'generous';
  mobileScreenMargin?: number; // 12, 16, 20
  lastUpdated?: string;
}

export interface ProductGuideFAQ {
  question: string;
  answer: string;
}

export interface ProductGuide {
  id: string;
  title: string;
  slug: string;
  coverImage?: string;
  shortIntro: string;
  category?: string;
  published: boolean;
  isPublished?: boolean;
  productId?: string; // Linked primary product ID
  associatedProductId?: string; // Optional alias for linked product ID
  productIds?: string[]; // Multiple linked product IDs for comparison guides
  overview?: string;
  whatIsThis?: string;
  keyBenefits?: string[];
  ingredients?: string[];
  whoShouldUse?: string;
  whoShouldAvoid?: string;
  howToUse?: string;
  quantityPreparation?: string;
  storageInstructions?: string;
  importantNotes?: string;
  readTime?: string;
  content?: string;
  faqs?: ProductGuideFAQ[];
  relatedProductIds?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  isFeatured?: boolean;
  sortOrder?: number;
  status?: 'DRAFT' | 'NEEDS_REVIEW' | 'READY' | 'PUBLISHED' | 'UPDATE_AVAILABLE' | 'ARCHIVED';
  contentUpdateAvailable?: boolean;
  contentUpdateReason?: string;
  source?: 'AUTO' | 'ADMIN' | 'MANUAL' | 'GSC' | 'VERIFIED';
  createdAt: string;
  updatedAt: string;
}

export type BusinessContentType = 'DOCUMENT' | 'CERTIFICATE' | 'IMAGE' | 'TEXT' | 'LINK' | 'BADGE';

export type BusinessDisplayLocation =
  | 'documents_page'
  | 'about'
  | 'factory'
  | 'footer'
  | 'trust_section';

export interface BusinessContentItem {
  id: string;
  title: string;
  slug: string;
  type: BusinessContentType;
  shortDescription?: string;
  longDescription?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  badgeIcon?: string;
  issueDate?: string;
  expiryDate?: string;
  certificateNumber?: string;
  issuingAuthority?: string;
  verificationUrl?: string;
  downloadEnabled?: boolean;
  published: boolean;
  displayLocations: BusinessDisplayLocation[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  // Brand Colors & Appearance Tokens
  brandColors?: BrandColors;
  // Trust Strip Badges
  trustStripItems?: TrustStripItem[];
  // Customer-Facing CMS Text Configuration
  cmsText?: Partial<CmsTextConfig>;
  // Layout & Display Controls
  layoutControls?: LayoutControls;
  // Brand & Identity (Canonical)
  brandName: string;
  businessName: string; // e.g. 'Musky Dose Enterprise'
  tagline: string;
  shortDescription?: string;
  logoUrl?: string;
  faviconUrl?: string;

  /** @deprecated Use businessEmail instead */
  brandEmail?: string;
  /** @deprecated Use displayPhone instead */
  brandPhone?: string;

  // Contact & Communication (Canonical)
  displayPhone: string; // e.g. '+91 82337 03080'
  whatsappNumber: string; // e.g. '918233703080'
  businessEmail: string; // e.g. 'info@muskydose.in'
  websiteUrl: string; // e.g. 'https://muskydose.in'

  whatsappMessageTemplate?: string;
  whatsappWholesaleMessageTemplate?: string;
  whatsappGreeting?: string;

  // WhatsApp 3-Step Ordering Guide
  whatsappGuideHeading?: string;
  whatsappGuideSubheading?: string;
  whatsappGuideDescription?: string;
  whatsappStep1Title?: string;
  whatsappStep1Description?: string;
  whatsappStep2Title?: string;
  whatsappStep2Description?: string;
  whatsappStep3Title?: string;
  whatsappStep3Description?: string;

  /** @deprecated Use displayPhone instead */
  contactNumber?: string;
  /** @deprecated Use businessEmail instead */
  email?: string;

  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  businessHours?: string;
  deliveryDisclaimer?: string;
  shippingDisclaimer?: string;

  // Social Links
  socials: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    twitter?: string;
  };

  // Homepage Hero
  heroEyebrow?: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCtaText?: string;
  heroPrimaryCtaLink?: string;
  heroSecondaryCtaText?: string;
  heroSecondaryCtaLink?: string;
  heroImageUrl?: string;
  homepageHero?: HeroSlide[];

  // Homepage Section, Product & Category Merchandising & Ordering
  homepageSections?: HomepageSectionConfig[];
  homepageProducts?: HomepageItemConfig[];
  homepageCategories?: HomepageItemConfig[];

  // Homepage Video Showcase Section
  homepageVideo?: HomepageVideoConfig;

  // Homepage Announcement Bar & Running Ticker
  announcementEnabled?: boolean;
  announcementText?: string;
  announcementLink?: string;
  announcements?: AnnouncementItem[];
  announcementTickerEnabled?: boolean;
  announcementTickerSpeed?: 'slow' | 'normal' | 'fast';

  // Homepage Sections & Toggles
  featuredSectionTitle?: string;
  featuredSectionDescription?: string;
  featuredSectionEnabled?: boolean;

  categorySectionTitle?: string;
  categorySectionDescription?: string;
  categorySectionEnabled?: boolean;
  homepageCategoryCount?: number;

  whyMuskyDoseTitle?: string;
  whyMuskyDoseDescription?: string;
  whyMuskyDoseEnabled?: boolean;
  whyCards?: WhyCard[];
  testimonials?: TestimonialItem[];

  // Wholesale Page CMS
  wholesaleHeroTitle?: string;
  wholesaleHeroSubtitle?: string;
  wholesaleSectionHeading?: string;
  wholesaleSectionDescription?: string;
  wholesaleCalculatorDisclaimer?: string;
  wholesaleInquiryCtaText?: string;

  trustSectionHeading?: string;
  trustSectionDescription?: string;
  trustSectionEnabled?: boolean;

  aboutText: string;
  aboutHeroEyebrow?: string;
  aboutHeroTitle?: string;
  aboutHeroSubtitle?: string;
  aboutSectionEyebrow?: string;
  aboutSectionHeading?: string;
  aboutParagraph2?: string;
  aboutImageUrl?: string;
  aboutPillar1Title?: string;
  aboutPillar1Description?: string;
  aboutPillar2Title?: string;
  aboutPillar2Description?: string;
  aboutPillar3Title?: string;
  aboutPillar3Description?: string;

  factoryStory: string;
  factoryImageUrl?: string;
  factorySectionHeading?: string;
  factorySectionDescription?: string;
  factorySectionEnabled?: boolean;
  factoryHeroEyebrow?: string;
  factoryHeroTitle?: string;
  factoryHeroSubtitle?: string;
  factoryStep1Title?: string;
  factoryStep1Description?: string;
  factoryStep2Title?: string;
  factoryStep2Description?: string;
  factoryStep3Title?: string;
  factoryStep3Description?: string;
  factoryStep4Title?: string;
  factoryStep4Description?: string;

  finalCtaHeading?: string;
  finalCtaDescription?: string;
  finalCtaButtonText?: string;
  finalCtaEnabled?: boolean;

  // Checkout Field Config
  checkoutFieldConfig?: CheckoutFieldConfig;

  // Delivery & Order Settings
  minOrderAmount?: number;
  shippingFee?: number;
  freeShippingThreshold?: number;
  deliveryMessage?: string;

  // Footer & Legal
  footerDescription?: string;
  copyrightText?: string;

  // Navigation & Footer Controls
  navItems?: NavItem[];
  footerSections?: FooterSectionConfig[];

  // FAQ & Policies
  faqItems?: FAQItem[];
  shippingPolicy?: PolicyContent;
  returnRefundPolicy?: PolicyContent;
  privacyPolicy?: PolicyContent;
  termsConditions?: PolicyContent;
  cancellationPolicy?: PolicyContent;

  // Media Library
  mediaLibrary?: MediaItem[];

  // SEO & Meta
  /** @deprecated Use websiteUrl instead */
  siteUrl?: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  googleSearchConsoleVerification?: string;
  pageSeoConfigs?: PageSeoConfig[];
  seoKeywordsStore?: SeoKeyword[];

  // Offers & Campaigns
  campaigns?: Campaign[];

  // Custom Pages (CMS Extension)
  customPages?: CustomPage[];

  // Universal Business Content & Documents CMS
  businessContentItems?: BusinessContentItem[];

  // Platform Feature Flags & Commerce Switches
  featureFlags?: FeatureFlags;
  paymentConfig?: PaymentConfig;
  shippingConfig?: ShippingConfig;
  invoiceConfig?: InvoiceConfig;
}

export interface PaymentSettings {
  onlinePaymentEnabled: boolean; // MUST default to false
  whatsappOrderEnabled: boolean; // Default to true
  upiEnabled: boolean;
  upiId?: string;
  upiMerchantName?: string;
  cardEnabled: boolean;
  netbankingEnabled: boolean;
  gatewayMode: 'sandbox' | 'live';
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin';
}

export interface BulkPricingRule {
  id: string;
  productId?: string; // 'global' or product ID
  productName?: string;
  minQuantity: number;
  maxQuantity?: number; // null or number for unlimited
  discountType: 'percentage' | 'fixed_amount' | 'fixed_price';
  discountValue: number;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WholesaleEnquiry {
  id: string;
  customerName: string;
  businessName?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  state?: string;
  productsRequired: string;
  approxQuantity: string;
  enquiryType?: string;
  buyerType?: string;
  notes?: string;
  status: 'NEW' | 'CONTACTED' | 'QUOTED' | 'CONVERTED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export type DiscountType = 'percentage' | 'fixed_amount' | 'fixed_price' | 'free_shipping';
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'disabled';
export type CampaignTargetType = 'storewide' | 'categories' | 'products';

export interface Campaign {
  id: string;
  name: string; // e.g. "Diwali Dhamaka 2026"
  festivalName: string; // e.g. "Diwali"
  internalDescription?: string;
  publicHeading: string; // e.g. "Diwali Special Offer"
  publicSubtitle?: string;
  publicDescription?: string;
  status: CampaignStatus; // Calculated dynamically if not draft or manually disabled
  isManuallyDisabled?: boolean;

  // Dates & Times
  startDate: string; // YYYY-MM-DDTHH:mm
  endDate: string; // YYYY-MM-DDTHH:mm
  timezone?: string;

  // Discount Configuration
  discountType: DiscountType;
  discountValue: number; // e.g., 15 for 15%, 100 for ₹100, 299 for fixed price
  minOrderValue?: number;
  maxDiscountAmount?: number;

  // Stacking & Priority
  allowStackWithBulkPricing?: boolean; // Default false
  priority?: number;

  // Target Scope
  targetType: CampaignTargetType; // 'storewide' | 'categories' | 'products'
  targetCategoryIds?: string[];
  targetProductIds?: string[];
  excludedProductIds?: string[];

  // Coupon Configuration
  couponRequired?: boolean;
  couponCode?: string; // Case-insensitive, e.g. "DIWALI20"
  usageLimit?: number; // Total campaign usage limit across all customers
  perCustomerLimit?: number; // Usage limit per phone number
  currentUsageCount?: number; // Track total uses

  // Banner Configuration
  showBanner?: boolean;
  bannerHeading?: string;
  bannerSubtitle?: string;
  bannerDescription?: string;
  bannerImageUrl?: string;
  bannerCtaText?: string;
  bannerCtaLink?: string;
  bannerPosition?: 'announcement_bar' | 'homepage_hero' | 'offers_page';

  // Countdown Configuration
  showCountdown?: boolean;

  // Badge Configuration
  badgeText?: string; // e.g. "FESTIVE OFFER", "DIWALI SALE", "20% OFF"
  badgeEnabled?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  campaign?: Campaign;
  calculatedDiscount?: number;
  shippingDiscount?: boolean;
}

export type SeoTargetType =
  | 'homepage'
  | 'product'
  | 'category'
  | 'categories_list'
  | 'products_list'
  | 'guide'
  | 'guides_list'
  | 'custom_page'
  | 'wholesale'
  | 'about'
  | 'factory'
  | 'contact'
  | 'other';

export type SeoPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SeoKeyword {
  id: string;
  keyword: string;
  targetType: SeoTargetType;
  targetId?: string;
  targetUrl: string;
  priority: SeoPriority;
  active: boolean;
  isPrimary?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageSeoConfig {
  id: string;
  targetType: SeoTargetType;
  targetId?: string;
  targetUrl: string;
  seoTitle?: string;
  metaDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  robotsIndex?: 'index' | 'noindex';
  robotsFollow?: 'follow' | 'nofollow';
  updatedAt?: string;
}

