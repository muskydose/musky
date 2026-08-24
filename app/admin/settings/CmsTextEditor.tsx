'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { CmsTextConfig } from '@/lib/types';

interface CmsTextEditorProps {
  cmsText: Required<CmsTextConfig>;
  updateCmsField: (key: keyof CmsTextConfig, value: string) => void;
  handleResetCmsDefaults: () => void;
}

export default function CmsTextEditor({
  cmsText,
  updateCmsField,
  handleResetCmsDefaults,
}: CmsTextEditorProps) {
  const renderInput = (
    key: keyof CmsTextConfig,
    label: string,
    isTextArea: boolean = false
  ) => {
    return (
      <div key={key}>
        <label className="block font-bold text-[#0f2d22] text-xs mb-1">
          {label}
        </label>
        {isTextArea ? (
          <textarea
            rows={2}
            value={cmsText[key] || ''}
            onChange={(e) => updateCmsField(key, e.target.value)}
            className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:ring-1 focus:ring-[#1b4332]"
          />
        ) : (
          <input
            type="text"
            value={cmsText[key] || ''}
            onChange={(e) => updateCmsField(key, e.target.value)}
            className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:ring-1 focus:ring-[#1b4332]"
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* CMS Header & Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e2d5] pb-4">
        <div>
          <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">
            Customer-Facing Text (CMS) — 225 Configurable Fields
          </h3>
          <p className="text-gray-500 text-xs mt-1">
            Edit titles, buttons, placeholders, badges, checkout labels, and messaging across the entire site without touching code.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetCmsDefaults}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-[#0f2d22] rounded-xl text-xs font-bold transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset All to System Defaults</span>
        </button>
      </div>

      {/* 1. Header, Navigation & Badges */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          1. Header, Navigation & Top Badges (8 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('navSearchPlaceholder', 'Navbar Search Box Placeholder')}
          {renderInput('navWhatsappCtaText', 'Navbar WhatsApp Button Label')}
          {renderInput('navCartButtonText', 'Navbar Cart Button Label')}
          {renderInput('navWishlistText', 'Navbar Wishlist Link Label')}
          {renderInput('navCategoryDropdownTitle', 'Category Menu Header Title')}
          {renderInput('navAllProductsText', 'Navbar "All Products" Link Text')}
          {renderInput('navWholesaleText', 'Navbar "Wholesale" Link Text')}
          {renderInput('sojatBadgeText', 'Header Sojat Origin Badge Text')}
        </div>
      </div>

      {/* 2. Hero & Homepage Banners */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          2. Hero & Featured Sections (13 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('heroEyebrow', 'Hero Section Eyebrow Tagline')}
          {renderInput('heroTitle', 'Hero Section Main Headline', true)}
          {renderInput('heroSubtitle', 'Hero Section Subtitle / Paragraph', true)}
          {renderInput('heroPrimaryCtaText', 'Hero Primary Button (WhatsApp)')}
          {renderInput('heroSecondaryCtaText', 'Hero Secondary Button (Explore)')}
          {renderInput('featuredSectionTitle', 'Featured Products Section Title')}
          {renderInput('featuredSectionDescription', 'Featured Products Description')}
          {renderInput('categorySectionTitle', 'Category Showcase Section Title')}
          {renderInput('categorySectionDescription', 'Category Showcase Description')}
          {renderInput('sojatStoryBadge', 'Sojat Story Section Badge')}
          {renderInput('sojatStoryTitle', 'Sojat Story Section Title')}
          {renderInput('homepageHennaSectionTitle', 'Homepage Henna Section Title')}
          {renderInput('homepageHennaSectionSubtitle', 'Homepage Henna Section Subtitle')}
        </div>
      </div>

      {/* 3. Homepage Sections & CTAs */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          3. Homepage Hair Care, Factory & Call-to-Actions (17 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('homepageHairSectionTitle', 'Homepage Hair Care Section Title')}
          {renderInput('homepageHairSectionSubtitle', 'Homepage Hair Care Subtitle')}
          {renderInput('homepageViewAllProductsCta', 'Homepage View All Products Button')}
          {renderInput('homepageSojatStoryTitle', 'Sojat Origin Title (Factory Block)')}
          {renderInput('homepageSojatStorySubtitle', 'Sojat Origin Subtitle', true)}
          {renderInput('homepageSojatStoryCtaText', 'Sojat Factory Learn More Button')}
          {renderInput('whyMuskyDoseTitle', 'Why Musky Dose Section Title')}
          {renderInput('whyMuskyDoseDescription', 'Why Musky Dose Section Description', true)}
          {renderInput('homeFaqTitle', 'Homepage FAQ Section Title')}
          {renderInput('testimonialsSectionTitle', 'Testimonials Section Title')}
          {renderInput('testimonialsSectionDescription', 'Testimonials Section Description')}
          {renderInput('wholesaleCtaHeading', 'Wholesale Banner Heading')}
          {renderInput('wholesaleCtaDescription', 'Wholesale Banner Description')}
          {renderInput('wholesaleCtaButtonText', 'Wholesale Banner Button Text')}
          {renderInput('finalCtaHeading', 'Homepage Final Banner Heading')}
          {renderInput('finalCtaDescription', 'Homepage Final Banner Description')}
          {renderInput('finalCtaButtonText', 'Homepage Final Banner Button')}
        </div>
      </div>

      {/* 4. FAQ Page */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          4. FAQ Page & Support (8 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('faqHeroBadge', 'FAQ Hero Badge')}
          {renderInput('faqPageTitle', 'FAQ Page Main Title')}
          {renderInput('faqPageSubtitle', 'FAQ Page Subtitle', true)}
          {renderInput('faqStillHaveQuestionsTitle', 'FAQ Help Box Title')}
          {renderInput('faqStillHaveQuestionsSubtitle', 'FAQ Help Box Subtitle')}
          {renderInput('faqWhatsappCtaText', 'FAQ WhatsApp Ask Button')}
          {renderInput('faqEmptyTitle', 'FAQ Empty State Title')}
          {renderInput('faqEmptyDescription', 'FAQ Empty State Description')}
        </div>
      </div>

      {/* 5. Product Catalog & Search/Filters */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          5. Products Page, Search & Filter Labels (17 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('productsPageTitle', 'Products Page Title')}
          {renderInput('productsPageSubtitle', 'Products Page Subtitle')}
          {renderInput('productSearchPlaceholder', 'Product Card Search Box Placeholder')}
          {renderInput('productsSearchPlaceholder', 'Products Main Search Placeholder')}
          {renderInput('productsFilterCategoryAll', '"All Categories" Filter Label')}
          {renderInput('productsSortLabel', 'Sort Dropdown Label')}
          {renderInput('productsSortFeatured', '"Featured First" Sort Option')}
          {renderInput('productsSortPriceLowHigh', '"Price: Low to High" Option')}
          {renderInput('productsSortPriceHighLow', '"Price: High to Low" Option')}
          {renderInput('productsSortRating', '"Highest Rated" Sort Option')}
          {renderInput('productsResetFiltersText', 'Reset Filters Link Text')}
          {renderInput('productsLoadMoreText', 'Load More Products Button')}
          {renderInput('productsCustomEnquiryBadge', 'Custom Enquiry Banner Badge')}
          {renderInput('productsCustomEnquiryTitle', 'Custom Enquiry Banner Title')}
          {renderInput('productsCustomEnquirySubtitle', 'Custom Enquiry Subtitle', true)}
          {renderInput('productsCustomEnquiryPlaceholder', 'Custom Enquiry Box Placeholder')}
          {renderInput('productsCustomEnquiryCta', 'Custom Enquiry WhatsApp Button')}
        </div>
      </div>

      {/* 6. Product Cards & Badges */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          6. Product Grid Cards & Status Badges (7 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('productCardInStockBadge', 'Product Card "In Stock" Badge')}
          {renderInput('productCardOutOfStockBadge', 'Product Card "Out of Stock" Badge')}
          {renderInput('productCardHeritageBadge', 'Product Card Sojat Heritage Badge')}
          {renderInput('productCardTripleShiftedBadge', 'Product Card Triple Sifted Badge')}
          {renderInput('productCardViewDetailsText', 'Product Card "View Details" Link')}
          {renderInput('productCardAddToCartText', 'Product Card "Add to Cart" Button')}
          {renderInput('productCardWhatsappOrderText', 'Product Card WhatsApp Order Button')}
        </div>
      </div>

      {/* 7. Product Detail Page & Bulk Inquiry */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          7. Product Detail Page & Bulk Inquiry Section (25 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('productDetailBreadcrumbHome', 'Breadcrumb "Home" Label')}
          {renderInput('productDetailBreadcrumbProducts', 'Breadcrumb "Products" Label')}
          {renderInput('productDetailPriceLabel', 'Detail Price Field Label')}
          {renderInput('productDetailWeightLabel', 'Detail Weight/Pack Label')}
          {renderInput('productDetailQuantityLabel', 'Detail Quantity Field Label')}
          {renderInput('productDetailKeyIngredientsHeading', 'Key Ingredients Tab Heading')}
          {renderInput('productDetailBenefitsHeading', 'Key Benefits Tab Heading')}
          {renderInput('productDetailHowToUseHeading', 'How To Use Tab Heading')}
          {renderInput('productDetailDescriptionHeading', 'Product Description Heading')}
          {renderInput('productDetailReviewsHeading', 'Customer Reviews Heading')}
          {renderInput('productDetailRelatedProductsHeading', 'Related Products Section Title')}
          {renderInput('productDetailWholesaleEnquiryCtaText', 'Wholesale Enquiry Link Text')}
          {renderInput('productDetailTrustBadge1', 'Product Trust Badge #1')}
          {renderInput('productDetailTrustBadge2', 'Product Trust Badge #2')}
          {renderInput('productDetailTrustBadge3', 'Product Trust Badge #3')}
          {renderInput('productDetailShareText', 'Share Button Label')}
          {renderInput('productDetailLinkCopiedText', 'Link Copied Notification Message')}
          {renderInput('productDetailDirectOrderCta', 'Direct WhatsApp Order Button')}
          {renderInput('productDetailAddToCartCta', 'Add To Cart Primary Button')}
          {renderInput('productDetailOrderWhatsAppText', 'Order on WhatsApp Text')}
          {renderInput('productDetailShareWhatsappText', 'Share Product Details Text')}
          {renderInput('productDetailBulkInquiryTitle', 'Bulk Inquiry Box Title')}
          {renderInput('productDetailBulkInquirySubtitle', 'Bulk Inquiry Box Subtitle')}
          {renderInput('productDetailBulkInquiryCta', 'Send Bulk Inquiry Button')}
          {renderInput('productDetailFaqHeading', 'Product Specific FAQ Title')}
        </div>
      </div>

      {/* 8. Categories Page */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          8. Category Directory Page (3 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('categoriesPageTitle', 'Categories Page Title')}
          {renderInput('categoriesPageSubtitle', 'Categories Page Subtitle')}
          {renderInput('categoryProductsCountText', 'Category Card Products Count Suffix')}
        </div>
      </div>

      {/* 9. Shopping Cart & Drawer */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          9. Shopping Cart Drawer & Coupons (18 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('cartTitle', 'Cart Drawer Title')}
          {renderInput('cartDrawerSubtitle', 'Cart Drawer Subtitle')}
          {renderInput('cartEmptyTitle', 'Empty Cart Heading')}
          {renderInput('cartEmptySubtitle', 'Empty Cart Subtitle')}
          {renderInput('cartEmptyDescription', 'Empty Cart Description')}
          {renderInput('cartEmptyCtaText', 'Empty Cart "Explore Products" Button')}
          {renderInput('cartSubtotalLabel', 'Cart Subtotal Row Label')}
          {renderInput('cartShippingLabel', 'Cart Shipping Row Label')}
          {renderInput('cartShippingCalculatedText', 'Shipping Calculated Notice')}
          {renderInput('cartTotalLabel', 'Cart Total Amount Label')}
          {renderInput('cartCheckoutButtonText', 'Proceed to WhatsApp Checkout Button')}
          {renderInput('cartApplyCouponPlaceholder', 'Cart Coupon Code Placeholder')}
          {renderInput('cartApplyCouponButtonText', 'Cart Apply Coupon Button')}
          {renderInput('cartCustomerDetailsHeading', 'Cart Optional Customer Details Title')}
          {renderInput('cartCustomerNamePlaceholder', 'Cart Name Field Placeholder')}
          {renderInput('cartCustomerAddressPlaceholder', 'Cart Address Field Placeholder')}
          {renderInput('cartBulkDiscountLabel', 'Cart Bulk Volume Discount Label')}
          {renderInput('cartShippingNotice', 'Cart Shipping Notice Footnote')}
        </div>
      </div>

      {/* 10. Checkout Page & Form Labels */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          10. Checkout Page Headers, Notices & Field Placeholders (22 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('checkoutHeaderTitle', 'Checkout Header Title')}
          {renderInput('checkoutHeaderSubtitle', 'Checkout Header Subtitle')}
          {renderInput('checkoutPageTitle', 'Checkout Main Page Title')}
          {renderInput('checkoutPlaceOrderWhatsappText', 'Checkout Confirm WhatsApp Button')}
          {renderInput('checkoutCustomerDetailsHeading', 'Customer Information Section Title')}
          {renderInput('checkoutDeliveryAddressHeading', 'Delivery Address Section Title')}
          {renderInput('checkoutOrderSummaryHeading', 'Order Summary Section Title')}
          {renderInput('checkoutSubmitButtonText', 'Checkout Final Submit Button Text')}
          {renderInput('checkoutNoticeText', 'Checkout Payment Method Notice')}
          {renderInput('checkoutBackToCartText', '"Back to Cart" Button Text')}
          {renderInput('checkoutFullNameLabel', 'Full Name Field Label')}
          {renderInput('checkoutFullNamePlaceholder', 'Full Name Field Placeholder')}
          {renderInput('checkoutMobileLabel', 'Mobile Field Label')}
          {renderInput('checkoutMobilePlaceholder', 'Mobile Field Placeholder')}
          {renderInput('checkoutAddressLabel', 'Address Field Label')}
          {renderInput('checkoutAddressPlaceholder', 'Address Field Placeholder')}
          {renderInput('checkoutCityLabel', 'City Field Label')}
          {renderInput('checkoutCityPlaceholder', 'City Field Placeholder')}
          {renderInput('checkoutStateLabel', 'State Field Label')}
          {renderInput('checkoutPincodeLabel', 'Pincode Field Label')}
          {renderInput('checkoutPincodePlaceholder', 'Pincode Field Placeholder')}
          {renderInput('checkoutCouponSectionTitle', 'Checkout Coupon Title')}
        </div>
      </div>

      {/* 11. Wishlist Drawer */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          11. Wishlist Drawer (6 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('wishlistDrawerTitle', 'Wishlist Drawer Title')}
          {renderInput('wishlistDrawerSubtitle', 'Wishlist Drawer Subtitle')}
          {renderInput('wishlistEmptyTitle', 'Wishlist Empty Title')}
          {renderInput('wishlistEmptySubtitle', 'Wishlist Empty Subtitle')}
          {renderInput('wishlistExploreCta', 'Wishlist "Explore Products" Button')}
          {renderInput('wishlistMoveToCartText', '"Move to Cart" Button Label')}
        </div>
      </div>

      {/* 12. Contact Us Page & Form */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          12. Contact Us Page Labels & Form Placeholders (18 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('contactPageTitle', 'Contact Page Window Title')}
          {renderInput('contactBadgeText', 'Contact Page Badge Tagline')}
          {renderInput('contactHeroTitle', 'Contact Hero Title')}
          {renderInput('contactHeroSubtitle', 'Contact Hero Subtitle', true)}
          {renderInput('contactFormHeading', 'Contact Form Main Heading')}
          {renderInput('contactFormTitle', 'Contact Form Title')}
          {renderInput('contactFormSubtitle', 'Contact Form Subtitle')}
          {renderInput('contactInfoHeading', 'Contact Info Box Heading')}
          {renderInput('contactSubmitButtonText', 'Contact Submit Button Text')}
          {renderInput('contactFullNameLabel', 'Contact Full Name Label')}
          {renderInput('contactFullNamePlaceholder', 'Contact Full Name Placeholder')}
          {renderInput('contactPhoneLabel', 'Contact Phone Label')}
          {renderInput('contactPhonePlaceholder', 'Contact Phone Placeholder')}
          {renderInput('contactEmailLabel', 'Contact Email Label')}
          {renderInput('contactEmailPlaceholder', 'Contact Email Placeholder')}
          {renderInput('contactEnquiryTypeLabel', 'Contact Enquiry Type Label')}
          {renderInput('contactMessageLabel', 'Contact Message Field Label')}
          {renderInput('contactMessagePlaceholder', 'Contact Message Field Placeholder')}
        </div>
      </div>

      {/* 13. Wholesale Page & Form */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          13. Wholesale B2B Page Labels & Form Placeholders (27 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('wholesalePageTitle', 'Wholesale Page Window Title')}
          {renderInput('wholesaleHeroBadgeB2B', 'Wholesale B2B Badge Text')}
          {renderInput('wholesaleHeroBadgeBulk', 'Wholesale Bulk Pack Badge Text')}
          {renderInput('wholesaleHeroTitle', 'Wholesale Hero Title')}
          {renderInput('wholesaleHeroSubtitle', 'Wholesale Hero Subtitle', true)}
          {renderInput('wholesaleFormHeading', 'Wholesale Form Section Heading')}
          {renderInput('wholesaleFormTitle', 'Wholesale Form Card Title')}
          {renderInput('wholesaleFormSubtitle', 'Wholesale Form Card Subtitle')}
          {renderInput('wholesaleSubmitButtonText', 'Wholesale Submit Button Text')}
          {renderInput('wholesaleFullNameLabel', 'Wholesale Full Name Label')}
          {renderInput('wholesaleFullNamePlaceholder', 'Wholesale Full Name Placeholder')}
          {renderInput('wholesaleBusinessNameLabel', 'Wholesale Firm/Salon Name Label')}
          {renderInput('wholesaleBusinessNamePlaceholder', 'Wholesale Firm Name Placeholder')}
          {renderInput('wholesalePhoneLabel', 'Wholesale Phone Label')}
          {renderInput('wholesalePhonePlaceholder', 'Wholesale Phone Placeholder')}
          {renderInput('wholesaleEmailLabel', 'Wholesale Email Label')}
          {renderInput('wholesaleEmailPlaceholder', 'Wholesale Email Placeholder')}
          {renderInput('wholesaleCityLabel', 'Wholesale City Label')}
          {renderInput('wholesaleCityPlaceholder', 'Wholesale City Placeholder')}
          {renderInput('wholesaleStateLabel', 'Wholesale State Label')}
          {renderInput('wholesaleStatePlaceholder', 'Wholesale State Placeholder')}
          {renderInput('wholesaleProductsLabel', 'Wholesale Products Label')}
          {renderInput('wholesaleProductsPlaceholder', 'Wholesale Products Placeholder')}
          {renderInput('wholesaleQuantityLabel', 'Wholesale Quantity Label')}
          {renderInput('wholesaleQuantityPlaceholder', 'Wholesale Quantity Placeholder')}
          {renderInput('wholesaleNotesLabel', 'Wholesale Notes Label')}
          {renderInput('wholesaleNotesPlaceholder', 'Wholesale Notes Placeholder')}
        </div>
      </div>

      {/* 14. Special Offers & Banners */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          14. Festival Deals & Special Offers Page (5 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('offersHeroBadge', 'Offers Page Hero Badge')}
          {renderInput('offersHeroTitle', 'Offers Page Main Title')}
          {renderInput('offersHeroSubtitle', 'Offers Page Subtitle', true)}
          {renderInput('offersEmptyTitle', 'Offers Empty State Title')}
          {renderInput('offersEmptyDescription', 'Offers Empty State Description', true)}
        </div>
      </div>

      {/* 15. Footer & Quality Guarantee */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          15. Footer Headings, Overview & Trust Badges (8 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('footerBrandDescription', 'Footer Brand Overview', true)}
          {renderInput('footerContactHeading', 'Footer Contact Heading')}
          {renderInput('footerQuickLinksHeading', 'Footer Quick Links Heading')}
          {renderInput('footerCategoriesHeading', 'Footer Categories Heading')}
          {renderInput('footerCustomerCareHeading', 'Footer Customer Care Heading')}
          {renderInput('footerCopyrightText', 'Footer Copyright Line')}
          {renderInput('footerTrustTitle', 'Footer Quality Title')}
          {renderInput('footerTrustSubtitle', 'Footer Quality Subtitle')}
        </div>
      </div>

      {/* 16. Error, 404, Search Empty & Policy Pages */}
      <div className="space-y-4">
        <h4 className="font-serif-heading text-sm font-bold text-[#1b4332] uppercase tracking-wider border-b pb-2">
          16. Error Pages, 404, Search Empty & Policy Badges (23 fields)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('emptySearchTitle', 'Empty Search Result Title')}
          {renderInput('emptySearchDescription', 'Empty Search Result Description')}
          {renderInput('emptySearchClearCta', 'Empty Search Clear Filters Button')}
          {renderInput('emptyCategoryTitle', 'Empty Category Title')}
          {renderInput('emptyCategoryDescription', 'Empty Category Description')}
          {renderInput('notFoundBadgeText', '404 Page Badge Text')}
          {renderInput('notFoundTitle', '404 Page Main Title')}
          {renderInput('notFoundDescription', '404 Page Description')}
          {renderInput('notFoundButtonText', '404 Return to Homepage Button')}
          {renderInput('notFoundExploreButtonText', '404 Explore All Products Button')}
          {renderInput('policyHeroBadge', 'Policy Hero Badge')}
          {renderInput('policyBadgeText', 'Policy Sub-Badge')}
          {renderInput('policyBackToHomeText', 'Policy "Back to Home" Link')}
          {renderInput('policyNotPublishedTitle', 'Policy Not Published Title')}
          {renderInput('policyNotPublishedMessage', 'Policy Not Published Message', true)}
          {renderInput('policyUnpublishedTitle', 'Policy Unpublished Box Title')}
          {renderInput('policyUnpublishedDescription', 'Policy Unpublished Description', true)}
          {renderInput('policyNeedSupportTitle', 'Policy Support Box Title')}
          {renderInput('policyNeedSupportSubtitle', 'Policy Support Box Subtitle')}
          {renderInput('policyNeedSupportMessage', 'Policy Support Message', true)}
          {renderInput('policyWhatsappCtaText', 'Policy Contact WhatsApp CTA')}
          {renderInput('policyContactWhatsappText', 'Policy Contact Button Text')}
          {renderInput('genericErrorMessage', 'Generic Website Error Banner Text')}
        </div>
      </div>
    </div>
  );
}
