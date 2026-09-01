'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { generateStructuredWhatsAppOrderMessage, getWhatsAppDirectUrl, getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { Order, SiteSettings, CheckoutFieldConfig, CouponValidationResult } from '@/lib/types';
import { DEFAULT_CHECKOUT_FIELD_CONFIG } from '@/lib/data-store';
import { getClientSiteSettings } from '@/lib/api-client';
import { sanitizeImageUrl } from '@/lib/utils';
import CouponInput from '@/components/CouponInput';
import Navbar from '@/components/Navbar';
import { trackCheckoutStarted, trackCheckoutValidationError, trackOrderCreated, trackWhatsAppClick } from '@/lib/analytics';
import { ShoppingBag, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle, MessageSquare, Truck, ArrowRight, RefreshCw } from 'lucide-react';

const INDIAN_STATES = [
  'Rajasthan',
  'Delhi',
  'Maharashtra',
  'Uttar Pradesh',
  'Gujarat',
  'Punjab',
  'Haryana',
  'Madhya Pradesh',
  'Karnataka',
  'West Bengal',
  'Tamil Nadu',
  'Telangana',
  'Andhra Pradesh',
  'Bihar',
  'Kerala',
  'Assam',
  'Odisha',
  'Jharkhand',
  'Chhattisgarh',
  'Himachal Pradesh',
  'Uttarakhand',
  'Goa',
  'Other'
];

export default function CheckoutPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, totalAmount } = useCart();

  // Site Settings state
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    getClientSiteSettings().then((data) => {
      if (data) {
        setSiteSettings(data);
      }
    });
    if (cart.length > 0) {
      trackCheckoutStarted(cart.length, totalAmount);
    }
  }, [cart.length, totalAmount]);

  const checkoutConfig: CheckoutFieldConfig = siteSettings?.checkoutFieldConfig || DEFAULT_CHECKOUT_FIELD_CONFIG;

  const [idempotencyKey] = useState(() => 'idemp_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now());

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerWhatsapp: '',
    sameAsMobile: true,
    customerHouseShop: '',
    customerAddress: '',
    customerArea: '',
    customerLandmark: '',
    customerCity: '',
    customerState: 'Rajasthan',
    customerPincode: '',
    customerEmail: '',
    notes: '',
  });

  // Bulk Discount & Coupon Calculation State
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [discountInfo, setDiscountInfo] = useState<{
    regularSubtotal: number;
    totalDiscountAmount: number;
    netSubtotal: number;
    itemBreakdown: any[];
  } | null>(null);

  useEffect(() => {
    if (cart.length === 0) {
      Promise.resolve().then(() => setDiscountInfo(null));
      return;
    }

    const items = cart.map((i) => ({ productId: i.product.id, quantity: i.quantity }));
    fetch('/api/bulk-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'calculate', items }),
    })
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
      .then((data) => {
        if (data?.success && data.result) {
          setDiscountInfo(data.result);
        }
      })
      .catch(() => {});
  }, [cart]);

  // Validation & Submit State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'customerPhone' && prev.sameAsMobile) {
        updated.customerWhatsapp = value;
      }
      return updated;
    });

    // Clear field error on typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSameAsMobileToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFormData((prev) => ({
      ...prev,
      sameAsMobile: checked,
      customerWhatsapp: checked ? prev.customerPhone : prev.customerWhatsapp,
    }));
  };

  // Form Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // 1. Full Name (Essential)
    if (!formData.customerName.trim() || formData.customerName.trim().length < 2) {
      newErrors.customerName = 'Please enter your full name (at least 2 characters).';
    }

    // 2. Mobile (Essential)
    const cleanPhone = formData.customerPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      newErrors.customerPhone = 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).';
    }

    // 3. WhatsApp Number
    if (checkoutConfig.whatsapp?.enabled) {
      const cleanWhatsapp = (formData.sameAsMobile ? formData.customerPhone : formData.customerWhatsapp).replace(/\D/g, '');
      if (checkoutConfig.whatsapp.required || cleanWhatsapp) {
        if (!cleanWhatsapp || cleanWhatsapp.length !== 10 || !/^[6-9]\d{9}$/.test(cleanWhatsapp)) {
          newErrors.customerWhatsapp = 'Please enter a valid 10-digit WhatsApp number.';
        }
      }
    }

    // 4. House / Shop
    if (checkoutConfig.houseShop?.enabled && checkoutConfig.houseShop.required) {
      if (!formData.customerHouseShop.trim()) {
        newErrors.customerHouseShop = 'House / Shop number is required.';
      }
    }

    // 5. Complete Address (Essential)
    if (!formData.customerAddress.trim() || formData.customerAddress.trim().length < 5) {
      newErrors.customerAddress = 'Please enter your complete street address.';
    }

    // 6. Area
    if (checkoutConfig.area?.enabled && checkoutConfig.area.required) {
      if (!formData.customerArea.trim()) {
        newErrors.customerArea = 'Area / Locality is required.';
      }
    }

    // 7. Landmark
    if (checkoutConfig.landmark?.enabled && checkoutConfig.landmark.required) {
      if (!formData.customerLandmark.trim()) {
        newErrors.customerLandmark = 'Landmark is required.';
      }
    }

    // 8. City (Essential)
    if (!formData.customerCity.trim()) {
      newErrors.customerCity = 'City is required.';
    }

    // 9. State (Essential)
    if (!formData.customerState.trim()) {
      newErrors.customerState = 'State is required.';
    }

    // 10. PIN Code (Essential)
    const cleanPin = formData.customerPincode.replace(/\D/g, '');
    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      newErrors.customerPincode = 'Please enter a valid 6-digit PIN code (e.g. 306104).';
    }

    // 11. Email
    if (checkoutConfig.email?.enabled) {
      const emailVal = formData.customerEmail.trim();
      if (checkoutConfig.email.required && !emailVal) {
        newErrors.customerEmail = 'Email address is required.';
      } else if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        newErrors.customerEmail = 'Please enter a valid email address.';
      }
    }

    // 12. Notes
    if (checkoutConfig.notes?.enabled && checkoutConfig.notes.required) {
      if (!formData.notes.trim()) {
        newErrors.notes = 'Delivery notes / instructions are required.';
      }
    }

    setErrors(newErrors);
    return newErrors;
  };

  const scrollToFirstError = (fieldErrors: Record<string, string>) => {
    const errorKeys = Object.keys(fieldErrors);
    if (errorKeys.length === 0) return;

    const firstKey = errorKeys[0];
    const targetElement = document.querySelector<HTMLElement>(`[name="${firstKey}"]`);

    if (targetElement) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      targetElement.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });
      setTimeout(
        () => {
          targetElement.focus({ preventScroll: true });
        },
        prefersReducedMotion ? 0 : 250
      );
    } else {
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  };

  // Submit Order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (cart.length === 0) {
      setServerError('Your cart is empty. Please add products before checking out.');
      return;
    }

    const fieldErrors = validateForm();
    if (Object.keys(fieldErrors).length > 0) {
      trackCheckoutValidationError(Object.keys(fieldErrors)[0]);
      scrollToFirstError(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        customerWhatsapp: formData.sameAsMobile ? formData.customerPhone.trim() : formData.customerWhatsapp.trim(),
        customerEmail: formData.customerEmail.trim() || undefined,
        customerHouseShop: formData.customerHouseShop.trim(),
        customerAddress: formData.customerAddress.trim(),
        customerArea: formData.customerArea.trim(),
        customerLandmark: formData.customerLandmark.trim() || undefined,
        customerCity: formData.customerCity.trim(),
        customerState: formData.customerState.trim(),
        customerPincode: formData.customerPincode.trim(),
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          weight: item.product.quantityOrWeight,
        })),
        shippingFee: siteSettings?.shippingFee ?? 0,
        couponCode: appliedCoupon?.valid ? appliedCoupon.campaign?.couponCode : undefined,
        notes: formData.notes.trim() || undefined,
        idempotencyKey,
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      let result: any = null;
      if (response.headers.get('content-type')?.includes('application/json')) {
        result = await response.json().catch(() => null);
      }

      if (!response.ok || !result?.success || !result?.order) {
        throw new Error(result?.error || 'Failed to save order to database. Please check your connection and try again.');
      }

      // Successful order creation in Supabase!
      const savedOrder: Order = result.order;
      setCreatedOrder(savedOrder);
      trackOrderCreated({
        orderId: savedOrder.orderNumber || savedOrder.id,
        itemCount: savedOrder.items?.length || cart.length,
        totalAmount: savedOrder.totalAmount,
      });
      try {
        const existingOrders = JSON.parse(localStorage.getItem('musky_recent_orders') || '[]');
        const updatedOrders = [savedOrder, ...existingOrders.filter((o: any) => o.id !== savedOrder.id)].slice(0, 10);
        localStorage.setItem('musky_recent_orders', JSON.stringify(updatedOrders));
      } catch (storageErr) {
        console.warn('Failed to save recent order to localStorage:', storageErr);
      }
      clearCart();

      // Direct WhatsApp dispatch: immediately redirect to WhatsApp URL
      try {
        const autoMsg = generateStructuredWhatsAppOrderMessage(
          savedOrder,
          siteSettings?.whatsappMessageTemplate
        );
        const autoDestNum = getConfiguredWhatsAppNumber(siteSettings);
        const autoWhatsappUrl = getWhatsAppDirectUrl(autoDestNum, autoMsg);
        if (typeof window !== 'undefined') {
          window.location.href = autoWhatsappUrl;
        }
      } catch (openErr) {
        console.warn('Automatic WhatsApp launch attempt:', openErr);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setServerError(err.message || 'An unexpected error occurred while placing your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS VIEW
  if (createdOrder) {
    const whatsappMsg = generateStructuredWhatsAppOrderMessage(
      createdOrder,
      siteSettings?.whatsappMessageTemplate
    );
    const destWhatsappNumber = getConfiguredWhatsAppNumber(siteSettings);
    const whatsappUrl = getWhatsAppDirectUrl(destWhatsappNumber, whatsappMsg);

    return (
      <div className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-emerald-100 p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full uppercase tracking-wider">
              Order Confirmed & Saved
            </span>
            <h1 className="text-3xl font-serif font-bold text-gray-900">
              Thank You, {createdOrder.customerName}!
            </h1>
            <p className="text-gray-600">
              Your order has been recorded in our system with Order Number:
            </p>
            <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg font-mono font-bold text-lg text-emerald-800 border border-gray-200">
              {createdOrder.orderNumber}
            </div>
          </div>

          {/* Order Details Card */}
          <div className="bg-[#FAF8F5] p-5 rounded-xl text-left border border-amber-900/10 space-y-3">
            <div className="flex justify-between items-center text-sm text-gray-600 border-b border-gray-200 pb-2">
              <span>Items Subtotal:</span>
              <span className="font-semibold text-gray-900">₹{createdOrder.subtotal}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600 border-b border-gray-200 pb-2">
              <span>Shipping (Sojat Direct):</span>
              <span className="font-semibold text-amber-800">
                {createdOrder.shippingFee > 0 ? `₹${createdOrder.shippingFee}` : 'Charges Extra'}
              </span>
            </div>
            <div className="flex justify-between items-center text-base font-bold text-gray-900 pt-1">
              <span>Total Payable:</span>
              <span className="text-xl text-emerald-700">₹{createdOrder.totalAmount}</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl text-left text-sm text-emerald-900 space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" /> Next Step — Send Details via WhatsApp:
            </p>
            <p className="text-emerald-800">
              Click the button below to send your pre-formatted order summary directly to Musky Dose on WhatsApp ({destWhatsappNumber}). Our team will confirm product dispatch and tracking details with you instantly!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-3">
            <a
              href={whatsappUrl}
              onClick={(e) => {
                trackWhatsAppClick({
                  source: 'Order Confirmation Screen',
                  totalAmount: createdOrder.totalAmount,
                  itemCount: createdOrder.items?.length || 1,
                });
                if (typeof window !== 'undefined') {
                  window.location.href = whatsappUrl;
                }
              }}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <MessageSquare className="w-6 h-6 fill-white" />
              <span>CONTINUE TO WHATSAPP TO CONFIRM ORDER</span>
            </a>

            <p className="text-xs text-gray-500">
              Opens WhatsApp directly with your complete order details pre-filled.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
            <Link href="/products" className="hover:text-emerald-700 underline font-medium">
              Explore More Herbal Products
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-emerald-700 underline font-medium">
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // EMPTY CART VIEW
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900">Your Cart is Empty</h2>
          <p className="text-gray-600 text-sm">
            Please add some of our premium Sojat Henna or Herbal products to your cart before proceeding to checkout.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-medium rounded-xl shadow transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Browse Products</span>
          </Link>
        </div>
      </div>
    );
  }

  // REGULAR CHECKOUT VIEW
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <Navbar siteSettings={siteSettings || undefined} />
      <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <Link href="/products" className="inline-flex items-center text-sm font-medium text-emerald-800 hover:text-emerald-900 mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Products
            </Link>
            <h1 className="text-3xl font-serif font-bold text-gray-900">Checkout & Order Capture</h1>
            <p className="text-sm text-gray-600 mt-1">
              Complete your delivery details to record your order and proceed to WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-4 py-2 rounded-xl border border-emerald-200 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Direct Factory Dispatch from Sojat, Rajasthan</span>
          </div>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="bg-red-50 border-2 border-red-200 p-4 rounded-xl flex items-start gap-3 text-red-900 shadow-sm">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-bold text-red-900">Unable to Save Order</p>
              <p className="text-red-700">{serverError}</p>
              <p className="text-xs text-red-600 pt-1">Your cart items and form details have been kept safe. Please correct any issues and click submit again.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Customer Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-xl font-serif font-bold text-gray-900 flex items-center gap-2">
                <span className="w-7 h-7 bg-emerald-800 text-white rounded-full text-sm font-sans flex items-center justify-center font-semibold">1</span>
                <span>Delivery Address & Contact Details</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Please ensure accurate contact and shipping address details for prompt dispatch from Sojat.
              </p>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-5">
              {/* Full Name */}
              {checkoutConfig.fullName?.enabled !== false && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    autoComplete="name"
                    value={formData.customerName}
                    onChange={handleChange}
                    placeholder="e.g. Rahul Sharma"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                      errors.customerName ? 'border-red-500 focus:ring-red-200 bg-red-50/20' : 'border-gray-300 focus:border-emerald-700 focus:ring-emerald-100'
                    }`}
                  />
                  {errors.customerName && <p className="text-xs text-red-600 mt-1">{errors.customerName}</p>}
                </div>
              )}

              {/* Mobile & WhatsApp Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {checkoutConfig.mobile?.enabled !== false && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-gray-500 font-semibold">+91</span>
                      <input
                        type="tel"
                        name="customerPhone"
                        inputMode="tel"
                        autoComplete="tel"
                        value={formData.customerPhone}
                        onChange={handleChange}
                        maxLength={10}
                        placeholder="9876543210"
                        className={`w-full pl-11 pr-3 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                          errors.customerPhone ? 'border-red-500 focus:ring-red-200 bg-red-50/20' : 'border-gray-300 focus:border-emerald-700 focus:ring-emerald-100'
                        }`}
                      />
                    </div>
                    {errors.customerPhone && <p className="text-xs text-red-600 mt-1">{errors.customerPhone}</p>}
                  </div>
                )}

                {checkoutConfig.whatsapp?.enabled !== false && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      WhatsApp Number {checkoutConfig.whatsapp?.required ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(Optional)</span>}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-gray-500 font-semibold">+91</span>
                      <input
                        type="tel"
                        name="customerWhatsapp"
                        inputMode="tel"
                        value={formData.sameAsMobile ? formData.customerPhone : formData.customerWhatsapp}
                        onChange={handleChange}
                        disabled={formData.sameAsMobile}
                        maxLength={10}
                        placeholder="9876543210"
                        className={`w-full pl-11 pr-3 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                          formData.sameAsMobile ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'
                        } ${
                          errors.customerWhatsapp ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-700 focus:ring-emerald-100'
                        }`}
                      />
                    </div>
                    {errors.customerWhatsapp && <p className="text-xs text-red-600 mt-1">{errors.customerWhatsapp}</p>}
                  </div>
                )}
              </div>

              {/* Same as Mobile checkbox */}
              {checkoutConfig.whatsapp?.enabled !== false && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sameAsMobile"
                    checked={formData.sameAsMobile}
                    onChange={handleSameAsMobileToggle}
                    className="w-4 h-4 text-emerald-800 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="sameAsMobile" className="text-xs text-gray-600 cursor-pointer select-none">
                    WhatsApp Number is the same as Mobile Number
                  </label>
                </div>
              )}

              {/* Email */}
              {checkoutConfig.email?.enabled !== false && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Email Address {checkoutConfig.email?.required ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(Optional for order updates)</span>}
                  </label>
                  <input
                    type="email"
                    name="customerEmail"
                    inputMode="email"
                    autoComplete="email"
                    value={formData.customerEmail}
                    onChange={handleChange}
                    placeholder="rahul@example.com"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                      errors.customerEmail ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-700 focus:ring-emerald-100'
                    }`}
                  />
                  {errors.customerEmail && <p className="text-xs text-red-600 mt-1">{errors.customerEmail}</p>}
                </div>
              )}

              {/* Address Fields */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Detailed Shipping Address</h3>

                {/* House / Shop Number */}
                {checkoutConfig.houseShop?.enabled !== false && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      House / Shop / Flat Number {checkoutConfig.houseShop?.required ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(Optional)</span>}
                    </label>
                    <input
                      type="text"
                      name="customerHouseShop"
                      value={formData.customerHouseShop}
                      onChange={handleChange}
                      placeholder="e.g. House No. 42-B or Shop 12"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                        errors.customerHouseShop ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-700 focus:ring-emerald-100'
                      }`}
                    />
                    {errors.customerHouseShop && <p className="text-xs text-red-600 mt-1">{errors.customerHouseShop}</p>}
                  </div>
                )}

                {/* Complete Address */}
                {checkoutConfig.address?.enabled !== false && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Complete Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="customerAddress"
                      autoComplete="street-address"
                      value={formData.customerAddress}
                      onChange={handleChange}
                      placeholder="e.g. Main Street, Near Old Temple Road"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                        errors.customerAddress ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-700 focus:ring-emerald-100'
                      }`}
                    />
                    {errors.customerAddress && <p className="text-xs text-red-600 mt-1">{errors.customerAddress}</p>}
                  </div>
                )}

                {/* Area & Landmark Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {checkoutConfig.area?.enabled !== false && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Area / Locality {checkoutConfig.area?.required ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(Optional)</span>}
                      </label>
                      <input
                        type="text"
                        name="customerArea"
                        value={formData.customerArea}
                        onChange={handleChange}
                        placeholder="e.g. Civil Lines"
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                          errors.customerArea ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-700 focus:ring-emerald-100'
                        }`}
                      />
                      {errors.customerArea && <p className="text-xs text-red-600 mt-1">{errors.customerArea}</p>}
                    </div>
                  )}

                  {checkoutConfig.landmark?.enabled !== false && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Landmark {checkoutConfig.landmark?.required ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(Optional)</span>}
                      </label>
                      <input
                        type="text"
                        name="customerLandmark"
                        value={formData.customerLandmark}
                        onChange={handleChange}
                        placeholder="e.g. Opp. Bus Stand"
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                          errors.customerLandmark ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-700 focus:ring-emerald-100'
                        }`}
                      />
                      {errors.customerLandmark && <p className="text-xs text-red-600 mt-1">{errors.customerLandmark}</p>}
                    </div>
                  )}
                </div>

                {/* City, State, PIN Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {checkoutConfig.city?.enabled !== false && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="customerCity"
                        autoComplete="address-level2"
                        value={formData.customerCity}
                        onChange={handleChange}
                        placeholder="e.g. Jaipur"
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                          errors.customerCity ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-700 focus:ring-emerald-100'
                        }`}
                      />
                      {errors.customerCity && <p className="text-xs text-red-600 mt-1">{errors.customerCity}</p>}
                    </div>
                  )}

                  {checkoutConfig.state?.enabled !== false && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="customerState"
                        value={formData.customerState}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 bg-white"
                      >
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {checkoutConfig.pincode?.enabled !== false && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        PIN Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="customerPincode"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        value={formData.customerPincode}
                        onChange={handleChange}
                        maxLength={6}
                        placeholder="302006"
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                          errors.customerPincode ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-700 focus:ring-emerald-100'
                        }`}
                      />
                      {errors.customerPincode && <p className="text-xs text-red-600 mt-1">{errors.customerPincode}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Notes */}
              {checkoutConfig.notes?.enabled !== false && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Special Delivery Instructions / Notes {checkoutConfig.notes?.required ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(Optional)</span>}
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="e.g. Please call before delivery or deliver after 2 PM"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 resize-none ${
                      errors.notes ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-700 focus:ring-emerald-100'
                    }`}
                  />
                  {errors.notes && <p className="text-xs text-red-600 mt-1">{errors.notes}</p>}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-lg rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      <span>Creating Order in System...</span>
                    </>
                  ) : (
                    <>
                      <span>CONFIRM ORDER & PROCEED TO WHATSAPP</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-gray-500 mt-2">
                  Your order will be saved securely to our Supabase database before opening WhatsApp.
                </p>
              </div>
            </form>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5 sticky top-24">
              <h2 className="text-lg font-serif font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-3">
                <span>Order Summary</span>
                <span className="text-xs font-sans font-normal text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
                </span>
              </h2>

              {/* Cart Item List */}
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex gap-3 text-sm pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative border border-gray-200">
                      {item.product.images && item.product.images[0] ? (
                        <Image
                          src={sanitizeImageUrl(item.product.images[0])}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{item.product.name}</h4>
                      <p className="text-xs text-gray-500">{item.product.quantityOrWeight || 'Standard Pack'}</p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="px-2 py-0.5 text-xs font-bold text-gray-600 hover:bg-gray-200"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-semibold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="px-2 py-0.5 text-xs font-bold text-gray-600 hover:bg-gray-200"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-bold text-gray-900">
                          ₹{item.product.price * item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Code Input */}
              <div className="border-t border-gray-100 pt-3">
                <CouponInput
                  cartItems={cart.map((i) => ({ productId: i.product.id, quantity: i.quantity }))}
                  customerPhone={formData.customerPhone}
                  onCouponApplied={(res) => setAppliedCoupon(res)}
                  appliedCouponResult={appliedCoupon}
                />
              </div>

              {/* Calculations */}
              <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-gray-900">
                    ₹{discountInfo ? discountInfo.regularSubtotal : totalAmount}
                  </span>
                </div>

                {discountInfo && discountInfo.totalDiscountAmount > 0 && (
                  <div className="flex justify-between font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-xs">
                    <span>Bulk Tier Discount:</span>
                    <span>-₹{discountInfo.totalDiscountAmount}</span>
                  </div>
                )}

                {appliedCoupon?.valid && appliedCoupon.calculatedDiscount ? (
                  <div className="flex justify-between font-bold text-emerald-900 bg-emerald-100/70 p-2.5 rounded-lg border border-emerald-300 text-xs">
                    <span>Festival Coupon ({appliedCoupon.campaign?.couponCode}):</span>
                    <span>-₹{appliedCoupon.calculatedDiscount}</span>
                  </div>
                ) : null}

                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    <Truck className="w-4 h-4 text-emerald-600" /> Shipping Fee:
                  </span>
                  <span className="font-semibold text-amber-800">
                    {appliedCoupon?.valid && appliedCoupon.shippingDiscount ? (
                      <span className="text-emerald-700 font-bold">FREE (Promo)</span>
                    ) : siteSettings?.shippingFee && siteSettings.shippingFee > 0 ? (
                      `₹${siteSettings.shippingFee}`
                    ) : (
                      'Charges Extra'
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total Amount:</span>
                  <span className="text-emerald-800">
                    ₹{Math.max(
                      0,
                      (discountInfo ? discountInfo.netSubtotal : totalAmount) -
                        (appliedCoupon?.valid && appliedCoupon.calculatedDiscount
                          ? appliedCoupon.calculatedDiscount
                          : 0) +
                        (appliedCoupon?.valid && appliedCoupon.shippingDiscount
                          ? 0
                          : siteSettings?.shippingFee || 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Guarantee Box */}
              <div className="bg-[#FAF8F5] p-4 rounded-xl border border-amber-900/10 text-xs text-gray-600 space-y-1">
                <p className="font-bold text-amber-950 flex items-center gap-1">
                  🌿 Authentic Sojat Heritage Guarantee
                </p>
                <p>
                  100% pure ultra-fine sifted natural henna and herbal formulations dispatched directly from Sojat, Rajasthan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
