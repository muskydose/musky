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
        
        {/* Badges */}
        <div className="absolute top-1.5 sm:top-2.5 left-1.5 sm:left-2.5 flex items-center gap-1 z-10">
          {product.isFeatured ? (
            <span className="bg-[#1b4332] text-[#faf5e8] text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs flex items-center gap-0.5 border border-[#c5a059]/30">
              <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#c5a059]" /> {cms.productCardHeritageBadge}
            </span>
          ) : discountPercent > 0 ? (
            <span className="bg-[#c5a059] text-[#0f2d22] text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
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
          <div className="absolute bottom-1.5 sm:bottom-2.5 right-1.5 sm:right-2.5 bg-white/90 backdrop-blur-xs text-[#0f2d22] text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-[#e8e2d5] shadow-2xs max-w-[85%] truncate">
            {product.quantityOrWeight}
          </div>
        )}
      </Link>

      {/* Product Content */}
      <div className={`${paddingClass} flex flex-col flex-1 justify-between bg-white border-t border-[#f0ebe0]`}>
        <div className="flex-1 flex flex-col justify-start">
          <div className="flex items-center justify-between text-[8.5px] sm:text-[10.5px] text-[#8c7b60] font-semibold uppercase tracking-wider mb-0.5 flex-wrap gap-1">
            <span className="truncate max-w-[90px] sm:max-w-none">{product.categoryName || 'Sojat Henna'}</span>
            {product.stockStatus === 'out_of_stock' && (
              <span className="text-amber-800 text-[8px] sm:text-[9px] font-bold bg-amber-50 px-1 sm:px-1.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                {cms.productCardOutOfStockBadge}
              </span>
            )}
          </div>

          <Link href={`/products/${product.slug || product.id}`}>
            <h3 className="font-momo-display text-xs sm:text-[14px] font-normal text-[#0f2d22] group-hover:text-[#1b4332] line-clamp-2 leading-tight transition-colors mb-0.5">
              {product.name}
            </h3>
          </Link>

          {product.shortDescription && (
            <p className="text-[9.5px] sm:text-[10.5px] text-[#556059] line-clamp-1 leading-tight mb-1 font-sans truncate">
              {product.shortDescription}
            </p>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="mt-auto pt-1 sm:pt-2 border-t border-[#f5f1e8] space-y-1 sm:space-y-1.5">
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xs sm:text-base font-extrabold text-[#0f2d22]">
                ₹{product.price}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-[9px] sm:text-xs text-gray-400 line-through">
                  ₹{product.compareAtPrice}
                </span>
              )}
            </div>
            <span className="text-[8px] sm:text-[9.5px] font-bold text-[#1b4332] bg-[#f5f1e8] px-1 sm:px-1.5 py-0.5 rounded-md shrink-0">
              {cms.productCardInStockBadge}
            </span>
          </div>

          {/* Strictly 2 Action Buttons: [ 🛒 Cart ] [ 🟢 Order ] */}
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleAddToCart}
              disabled={product.stockStatus === 'out_of_stock'}
              className={`w-full min-h-[34px] sm:min-h-[36px] inline-flex items-center justify-center gap-1 text-[11.5px] sm:text-xs font-bold px-2 rounded-lg transition-all shadow-2xs cursor-pointer touch-manipulation ${
                product.stockStatus === 'out_of_stock'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] border border-[#e8e2d5]'
              }`}
              title={product.stockStatus === 'out_of_stock' ? cms.productCardOutOfStockBadge : 'Add item to order cart'}
              aria-label="Add to Cart"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#1b4332] shrink-0" />
              <span className="truncate">{product.stockStatus === 'out_of_stock' ? cms.productCardOutOfStockBadge : 'Cart'}</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleWhatsAppOrder}
              disabled={product.stockStatus === 'out_of_stock'}
              className={`w-full min-h-[34px] sm:min-h-[36px] inline-flex items-center justify-center gap-1 text-[11.5px] sm:text-xs font-bold px-2 rounded-lg transition-all shadow-2xs cursor-pointer touch-manipulation ${
                product.stockStatus === 'out_of_stock'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] border border-[#1b4332]'
              }`}
              title="Order directly on WhatsApp"
              aria-label="Order on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-[#25D366] text-[#25D366] shrink-0" />
              <span className="truncate">Order</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


