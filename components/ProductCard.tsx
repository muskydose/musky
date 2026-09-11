'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Heart, Play } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Product, SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { trackAddToCart, trackWhatsAppClick } from '@/lib/analytics';
import { sanitizeImageUrl } from '@/lib/utils';
import { SPRINGS } from '@/lib/motion';
import { startPageTransition } from '@/lib/navigation';
import { resolveCanonicalProductOffer } from '@/lib/growth/product-catalog-governance';
import { resolveAuthoritativeProductMedia } from '@/lib/growth/product-media-governance';

interface ProductCardProps {
  product: Product;
  siteSettings?: SiteSettings;
  whatsappNumber?: string;
  isFeaturedSpotlight?: boolean;
}

const BRANDED_FALLBACK_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="100%" height="100%" fill="%23f4f0e6"/><path d="M400 240 C300 340 300 490 400 540 C500 490 500 340 400 240 Z" fill="%231b4332" opacity="0.15"/><text x="50%" y="48%" font-family="serif" font-size="32" font-weight="bold" fill="%230f2d22" text-anchor="middle">MUSKY DOSE</text><text x="50%" y="54%" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23c5a059" letter-spacing="2" text-anchor="middle">SOJAT BOTANICAL</text></svg>';

export default function ProductCard({ product, siteSettings, whatsappNumber, isFeaturedSpotlight = false }: ProductCardProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const cms = getCmsText(siteSettings);
  const { addToCart, openCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  const mediaResolution = React.useMemo(() => {
    return resolveAuthoritativeProductMedia(product);
  }, [product]);

  const rawImage = mediaResolution.primaryImage || product.images?.[0];
  const primaryImage = sanitizeImageUrl(rawImage, BRANDED_FALLBACK_IMAGE);
  const [imgSrc, setImgSrc] = React.useState(primaryImage);
  const [isAddingToCart, setIsAddingToCart] = React.useState(false);

  const canonicalOffer = React.useMemo(() => {
    return resolveCanonicalProductOffer(product);
  }, [product]);

  const defaultVariant = canonicalOffer.defaultVariant;
  const displayPrice = canonicalOffer.price;
  const displayCompareAt = canonicalOffer.compareAtPrice;
  const displayWeight = canonicalOffer.displayWeight;
  const displaySku = canonicalOffer.sku;
  const isOutOfStock = (defaultVariant?.stockStatus ?? product.stockStatus) === 'out_of_stock';

  React.useEffect(() => {
    setImgSrc(primaryImage);
  }, [primaryImage]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isAddingToCart || isOutOfStock) return;
    setIsAddingToCart(true);
    addToCart(
      {
        ...product,
        price: displayPrice,
        compareAtPrice: displayCompareAt,
        quantityOrWeight: displayWeight,
        sku: displaySku,
      },
      1,
      defaultVariant
    );
    trackAddToCart({
      id: product.id,
      name: product.name,
      price: displayPrice,
      quantity: 1,
    });
    openCart();
    setTimeout(() => setIsAddingToCart(false), 700);
  };

  const handleWhatsAppOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isOutOfStock) return;
    addToCart(
      {
        ...product,
        price: displayPrice,
        compareAtPrice: displayCompareAt,
        quantityOrWeight: displayWeight,
        sku: displaySku,
      },
      1,
      defaultVariant
    );
    trackWhatsAppClick({
      source: 'product_card_order_button',
      productName: product.name,
      productId: product.id,
      quantity: 1,
      totalAmount: displayPrice,
    });
    startPageTransition();
    router.push('/checkout');
  };

  const discountPercent = displayCompareAt && displayCompareAt > displayPrice
    ? Math.round(((displayCompareAt - displayPrice) / displayCompareAt) * 100)
    : 0;

  const layoutControls = siteSettings?.layoutControls || {};
  const aspectRatioClass =
    layoutControls.productCardAspectRatio === 'portrait'
      ? 'aspect-[3/4]'
      : layoutControls.productCardAspectRatio === 'landscape'
      ? 'aspect-[4/3]'
      : 'aspect-square';

  const paddingClass =
    layoutControls.productCardPadding === 'spaced'
      ? 'p-2.5 sm:p-4'
      : layoutControls.productCardPadding === 'standard'
      ? 'p-2 sm:p-3'
      : 'p-2 sm:p-2.5';

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={SPRINGS.card}
      className={`group bg-[#faf8f5] rounded-2xl overflow-hidden border border-[#e8e2d5] hover:border-[#1b4332]/40 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col h-full ${
        isFeaturedSpotlight ? 'ring-1 ring-[#c5a059]/40 bg-white' : ''
      }`}
    >
      {/* Product Image Container */}
      <Link
        href={`/products/${product.slug || product.id}`}
        className={`relative block ${aspectRatioClass} overflow-hidden bg-[#faf8f5] p-2 sm:p-2.5`}
      >
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#f4f0e6]/60">
          <Image
            src={imgSrc}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-2 group-hover:scale-[1.03] transition-transform duration-500 ease-out"
            referrerPolicy="no-referrer"
            onError={() => setImgSrc(BRANDED_FALLBACK_IMAGE)}
          />
        </div>

        {/* Badges */}
        <div className="absolute top-2 sm:top-2.5 left-2 sm:left-2.5 flex flex-wrap items-center gap-1 z-10 max-w-[70%]">
          {product.isFeatured ? (
            <span className="bg-[#1b4332] text-[#faf5e8] text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs flex items-center gap-1 border border-[#c5a059]/30">
              <ShieldCheck className="w-2.5 h-2.5 text-[#c5a059]" /> {cms.productCardHeritageBadge || 'Sojat Original'}
            </span>
          ) : discountPercent > 0 ? (
            <span className="bg-[#c5a059] text-[#0f2d22] text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
              {discountPercent}% OFF
            </span>
          ) : null}
        </div>

        {/* Wishlist Heart Button */}
        <motion.button
          type="button"
          whileTap={shouldReduceMotion ? undefined : { scale: 0.85 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className="absolute top-2 sm:top-2.5 right-2 sm:right-2.5 w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 bg-white/90 hover:bg-white backdrop-blur-xs rounded-full border border-[#e8e2d5] shadow-2xs z-10 transition-colors flex items-center justify-center cursor-pointer touch-manipulation focus-ring"
          aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
              isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-gray-400 hover:text-rose-500'
            }`}
          />
        </motion.button>

        {/* Video Indicator Badge */}
        {mediaResolution.hasVideo && (
          <div className="absolute bottom-2 sm:bottom-2.5 left-2 sm:left-2.5 bg-[#0f2d22]/85 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20 shadow-2xs flex items-center gap-1 z-10">
            <Play className="w-2.5 h-2.5 fill-white text-white" />
            <span>Video</span>
          </div>
        )}
      </Link>

      {/* Product Content */}
      <div className={`${paddingClass} flex flex-col flex-1 justify-between bg-white border-t border-[#f0ebe0]`}>
        <div className="flex-1 flex flex-col justify-start">
          {/* CATEGORY & STOCK */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#8c7b60] font-semibold uppercase tracking-wider mb-1 flex-wrap gap-1">
            <span className="truncate max-w-[120px] sm:max-w-none">{product.categoryName || 'Sojat Henna'}</span>
            {isOutOfStock && (
              <span className="text-amber-800 text-[9px] sm:text-[10px] font-bold bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                {cms.productCardOutOfStockBadge || 'Out of Stock'}
              </span>
            )}
          </div>

          {/* PRODUCT NAME */}
          <Link href={`/products/${product.slug || product.id}`} className="block">
            <h3 className="font-momo-display text-xs sm:text-[14px] font-normal text-[#0f2d22] group-hover:text-[#1b4332] line-clamp-2 leading-snug transition-colors mb-1">
              {product.name}
            </h3>
          </Link>

          {/* SHORT DESCRIPTION */}
          {product.shortDescription && (
            <p className="text-[10px] sm:text-[11px] text-[#626c66] line-clamp-1 leading-relaxed mb-2 font-sans">
              {product.shortDescription}
            </p>
          )}
        </div>

        {/* PRICE, VARIANT & ACTION SECTION */}
        <div className="mt-auto pt-2 border-t border-[#f5f1e8] space-y-1.5">
          {/* PRICE */}
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-extrabold text-[#0f2d22] tabular-nums">
                ₹{displayPrice}
              </span>
              {displayCompareAt && displayCompareAt > displayPrice && (
                <span className="text-[10px] sm:text-xs text-gray-400 line-through tabular-nums">
                  ₹{displayCompareAt}
                </span>
              )}
            </div>
            {discountPercent > 0 ? (
              <span className="text-[9px] sm:text-[10px] font-extrabold text-[#c5a059] bg-[#faf5e8] px-1.5 py-0.5 rounded border border-[#c5a059]/30">
                {discountPercent}% OFF
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-[#1b4332] bg-[#f5f1e8] px-1.5 py-0.5 rounded">
                {isOutOfStock ? cms.productCardOutOfStockBadge : cms.productCardInStockBadge}
              </span>
            )}
          </div>

          {/* PACK / VARIANT META */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#626c66] py-0.5">
            <span className="font-medium truncate">{displayWeight || 'Standard Pack'}</span>
            {canonicalOffer.activeVariants.length > 1 && (
              <span className="text-[10px] font-bold text-[#1b4332] bg-[#f5f1e8] px-1.5 py-0.2 rounded shrink-0 ml-1">
                {canonicalOffer.activeVariants.length} Sizes
              </span>
            )}
          </div>

          {/* CART | BUY 50/50 BUTTONS */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAddingToCart}
              className={`w-full h-9 sm:h-10 flex items-center justify-center text-xs font-extrabold tracking-wide rounded-xl border transition-all shadow-2xs touch-manipulation active:scale-[0.98] ${
                isOutOfStock
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : isAddingToCart
                  ? 'bg-[#1b4332] text-[#c5a059] border-[#1b4332] opacity-70 cursor-wait'
                  : 'bg-[#1b4332] hover:bg-[#0f2d22] text-[#faf5e8] border-[#1b4332] cursor-pointer'
              }`}
              title={isOutOfStock ? cms.productCardOutOfStockBadge : 'Add to Cart'}
              aria-label="Add to Cart"
            >
              <span>CART</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppOrder}
              disabled={isOutOfStock}
              className={`w-full h-9 sm:h-10 flex items-center justify-center text-xs font-extrabold tracking-wide rounded-xl border transition-all shadow-2xs touch-manipulation active:scale-[0.98] ${
                isOutOfStock
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-[#c5a059] hover:bg-[#b38e46] text-[#0f2d22] border-[#c5a059] cursor-pointer'
              }`}
              title="Buy Now"
              aria-label="Buy Now"
            >
              <span>BUY</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
