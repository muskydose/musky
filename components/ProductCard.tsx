'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, ShieldCheck, Heart, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Product, SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { trackAddToCart, trackWhatsAppClick } from '@/lib/analytics';
import { sanitizeImageUrl } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  siteSettings?: SiteSettings;
  whatsappNumber?: string;
  isFeaturedSpotlight?: boolean;
}

const BRANDED_FALLBACK_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="100%" height="100%" fill="%23f4f0e6"/><path d="M400 240 C300 340 300 490 400 540 C500 490 500 340 400 240 Z" fill="%231b4332" opacity="0.15"/><text x="50%" y="48%" font-family="serif" font-size="32" font-weight="bold" fill="%230f2d22" text-anchor="middle">MUSKY DOSE</text><text x="50%" y="54%" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23c5a059" letter-spacing="2" text-anchor="middle">SOJAT BOTANICAL</text></svg>';

export default function ProductCard({ product, siteSettings, whatsappNumber, isFeaturedSpotlight = false }: ProductCardProps) {
  const cms = getCmsText(siteSettings);
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);
  const rawImage = product.images?.[0];
  const primaryImage = sanitizeImageUrl(rawImage, BRANDED_FALLBACK_IMAGE);
  const [imgSrc, setImgSrc] = React.useState(primaryImage);

  React.useEffect(() => {
    setImgSrc(primaryImage);
  }, [primaryImage]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    addToCart(product, 1);
    trackAddToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
    });
  };

  const handleWhatsAppOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    addToCart(product, 1);
    trackWhatsAppClick({
      source: 'product_card_order_button',
      productName: product.name,
      productId: product.id,
      quantity: 1,
      totalAmount: product.price,
    });
    window.location.href = '/checkout';
  };

  const discountPercent = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
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
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={`group bg-[#faf8f5] rounded-xl sm:rounded-2xl overflow-hidden border border-[#e8e2d5] hover:border-[#c5a059] shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col h-full ${
        isFeaturedSpotlight ? 'ring-1 ring-[#c5a059]/40 bg-white' : ''
      }`}
    >
      {/* Product Image Container */}
      <Link href={`/products/${product.slug || product.id}`} className={`relative block ${aspectRatioClass} overflow-hidden bg-[#f4f0e6] p-1.5 sm:p-2.5`}>
        <div className="relative w-full h-full rounded-lg sm:rounded-xl overflow-hidden">
          <Image
            src={imgSrc}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            referrerPolicy="no-referrer"
            onError={() => setImgSrc(BRANDED_FALLBACK_IMAGE)}
          />
        </div>
        
        {/* Badges: Max 2 meaningful badges */}
        <div className="absolute top-1.5 sm:top-2.5 left-1.5 sm:left-2.5 flex items-center gap-1 z-10">
          {product.isFeatured ? (
            <span className="bg-[#1b4332] text-[#faf5e8] text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs flex items-center gap-1 border border-[#c5a059]/30">
              <ShieldCheck className="w-3 h-3 text-[#c5a059]" /> {cms.productCardHeritageBadge}
            </span>
          ) : discountPercent > 0 ? (
            <span className="bg-[#c5a059] text-[#0f2d22] text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
              {discountPercent}% OFF
            </span>
          ) : null}
        </div>

        {/* Wishlist Heart Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className="absolute top-1.5 sm:top-2.5 right-1.5 sm:right-2.5 p-1 sm:p-1.5 bg-white/90 hover:bg-white backdrop-blur-xs rounded-full border border-[#e8e2d5] shadow-2xs z-10 transition-transform active:scale-90 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center cursor-pointer touch-manipulation"
          aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-gray-400 hover:text-rose-500'
            }`}
          />
        </button>

        {product.quantityOrWeight && (
          <div className="absolute bottom-1.5 sm:bottom-2.5 right-1.5 sm:right-2.5 bg-white/95 backdrop-blur-xs text-[#0f2d22] text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#e8e2d5] shadow-2xs max-w-[85%] truncate">
            {product.quantityOrWeight}
          </div>
        )}
      </Link>

      {/* Product Content */}
      <div className={`${paddingClass} flex flex-col flex-1 justify-between bg-white border-t border-[#f0ebe0]`}>
        <div className="flex-1 flex flex-col justify-start">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#8c7b60] font-semibold uppercase tracking-wider mb-1 flex-wrap gap-1">
            <span className="truncate max-w-[120px] sm:max-w-none">{product.categoryName || 'Sojat Henna'}</span>
            {product.stockStatus === 'out_of_stock' && (
              <span className="text-amber-800 text-[9px] sm:text-[10px] font-bold bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                {cms.productCardOutOfStockBadge}
              </span>
            )}
          </div>

          <Link href={`/products/${product.slug || product.id}`}>
            <h3 className="font-momo-display text-xs sm:text-[14px] font-normal text-[#0f2d22] group-hover:text-[#1b4332] line-clamp-2 leading-snug transition-colors mb-1">
              {product.name}
            </h3>
          </Link>

          {product.shortDescription && (
            <p className="text-[11px] sm:text-xs text-[#556059] line-clamp-2 leading-relaxed mb-2 font-sans">
              {product.shortDescription}
            </p>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="mt-auto pt-2 border-t border-[#f5f1e8] space-y-2">
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-bold text-[#0f2d22]">
                ₹{product.price}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                  ₹{product.compareAtPrice}
                </span>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold text-[#1b4332] bg-[#f5f1e8] px-1.5 py-0.5 rounded-md shrink-0">
              {cms.productCardInStockBadge}
            </span>
          </div>

          {/* Action Buttons: [ 🛒 Cart (Primary) ] [ 🟢 Order (Secondary) ] */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleAddToCart}
              disabled={product.stockStatus === 'out_of_stock'}
              className={`w-full min-h-[36px] sm:min-h-[38px] py-1.5 sm:py-2 inline-flex items-center justify-center gap-1.5 text-xs font-bold px-2 rounded-xl transition-all shadow-xs cursor-pointer touch-manipulation ${
                product.stockStatus === 'out_of_stock'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-[#1b4332] hover:bg-[#0f2d22] text-[#faf5e8] hover:text-[#c5a059] border border-[#1b4332]'
              }`}
              title={product.stockStatus === 'out_of_stock' ? cms.productCardOutOfStockBadge : 'Add to Cart'}
              aria-label="Add to Cart"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#c5a059] shrink-0" />
              <span>{product.stockStatus === 'out_of_stock' ? cms.productCardOutOfStockBadge : 'Cart'}</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleWhatsAppOrder}
              disabled={product.stockStatus === 'out_of_stock'}
              className={`w-full min-h-[36px] sm:min-h-[38px] py-1.5 sm:py-2 inline-flex items-center justify-center gap-1.5 text-xs font-bold px-2 rounded-xl transition-all shadow-2xs cursor-pointer touch-manipulation ${
                product.stockStatus === 'out_of_stock'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-[#f4faf6] hover:bg-[#e6f4ec] text-[#1b4332] border border-[#25D366]/40'
              }`}
              title="Order on WhatsApp"
              aria-label="Order on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#25D366] text-[#25D366] shrink-0" />
              <span>Order</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
