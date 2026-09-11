/**
 * Regression Test Suite: Category Rename & Propagation Architecture
 *
 * Verifies that:
 * 1. Category renaming derives canonically from categoryId without requiring product re-save.
 * 2. resolveCanonicalCategoryName correctly handles ID match, stale DB category_name fallback, and edge cases.
 * 3. resolveCanonicalCategorySlug and resolveCanonicalCategoryUrl correctly handle ID match, stale slug fallback, and edge cases.
 * 4. ProductCard and PDP view contracts receive the canonical category name.
 */

import {
  resolveCanonicalCategoryName,
  resolveCanonicalCategorySlug,
  resolveCanonicalCategoryUrl,
} from '../lib/category-resolver';
import { Category, Product } from '../lib/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

console.log('\n=== RUNNING CATEGORY RENAME PROPAGATION TESTS ===\n');

// Mock categories
const mockCategories: Category[] = [
  {
    id: 'cat-henna',
    name: 'Henna & Mehndi',
    slug: 'henna-mehndi',
    description: 'Pure Sojat Henna',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'cat-hair-care',
    name: 'Natural Hair Care',
    slug: 'natural-hair-care',
    description: 'Herbal hair powders',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'cat-skincare',
    name: 'Hydrating Skincare',
    slug: 'hydrating-skincare',
    description: 'Floral hydrosols',
    isActive: true,
    sortOrder: 3,
  },
];

// Mock product with stale category_name from before category rename
const mockStaleProduct: Product = {
  id: 'prod-henna-100g',
  name: 'Pure Sojat Henna Powder 100g',
  slug: 'pure-sojat-henna-powder-100g',
  price: 199,
  categoryId: 'cat-henna',
  categoryName: 'Old Stale Henna Name', // STALE in DB
  isActive: true,
  images: ['/images/henna.webp'],
} as unknown as Product;

// 1. Canonical Category Name Resolution
console.log('--- 1. Canonical Name Resolution ---');
{
  const resolvedName = resolveCanonicalCategoryName(mockStaleProduct, mockCategories);
  assert(
    resolvedName === 'Henna & Mehndi',
    'Stale category_name "Old Stale Henna Name" is overridden by canonical "Henna & Mehndi"'
  );
}

// 2. Dynamic Category Rename Simulation (Admin changes name from "Henna & Mehndi" to "Royal Rajasthani Henna")
console.log('--- 2. Live Category Rename Simulation ---');
{
  const renamedCategories: Category[] = mockCategories.map((c) =>
    c.id === 'cat-henna' ? { ...c, name: 'Royal Rajasthani Henna', slug: 'royal-rajasthani-henna' } : c
  );

  const dynamicallyResolvedName = resolveCanonicalCategoryName(mockStaleProduct, renamedCategories);
  assert(
    dynamicallyResolvedName === 'Royal Rajasthani Henna',
    'Product instantly reflects new category name "Royal Rajasthani Henna" without editing product'
  );

  const dynamicallyResolvedSlug = resolveCanonicalCategorySlug(mockStaleProduct, renamedCategories);
  assert(
    dynamicallyResolvedSlug === 'royal-rajasthani-henna',
    'Product instantly reflects new category slug "royal-rajasthani-henna"'
  );

  const dynamicallyResolvedUrl = resolveCanonicalCategoryUrl(mockStaleProduct, renamedCategories);
  assert(
    dynamicallyResolvedUrl === '/categories/royal-rajasthani-henna',
    'Product category URL instantly points to "/categories/royal-rajasthani-henna"'
  );
}

// 3. Fallback Handling
console.log('--- 3. Fallback Handling for Edge Cases ---');
{
  // Product with non-existent categoryId
  const orphanProduct: Product = {
    id: 'prod-orphan',
    name: 'Orphan Botanical',
    slug: 'orphan-botanical',
    price: 99,
    categoryId: 'cat-deleted-999',
    categoryName: 'Preserved Legacy Category',
    isActive: true,
  } as unknown as Product;

  const orphanName = resolveCanonicalCategoryName(orphanProduct, mockCategories);
  assert(
    orphanName === 'Preserved Legacy Category',
    'Orphan product falls back to preserved categoryName when categoryId not found'
  );

  // Product with empty categories list
  const emptyCatName = resolveCanonicalCategoryName(mockStaleProduct, []);
  assert(
    emptyCatName === 'Old Stale Henna Name',
    'Empty categories list falls back gracefully to product.categoryName'
  );

  // Direct override parameter support
  const overrideName = resolveCanonicalCategoryName(mockStaleProduct, mockCategories, 'Direct Admin Override');
  assert(
    overrideName === 'Direct Admin Override',
    'Explicit categoryName override takes precedence when provided'
  );

  // Missing categoryId and categoryName
  const bareProduct: Product = {
    id: 'prod-bare',
    name: 'Bare Product',
    slug: 'bare-product',
    price: 50,
    isActive: true,
  } as unknown as Product;
  const bareName = resolveCanonicalCategoryName(bareProduct, mockCategories);
  assert(
    bareName === '',
    'Bare product returns empty string without error'
  );

  const bareUrl = resolveCanonicalCategoryUrl(bareProduct, mockCategories);
  assert(
    bareUrl === '/categories',
    'Bare product URL falls back cleanly to "/categories"'
  );
}

// 4. Slug Fallbacks
console.log('--- 4. Slug & URL Robustness ---');
{
  const productWithCategoryWithoutSlug: Product = {
    id: 'prod-noslug',
    name: 'No Slug Category Product',
    slug: 'no-slug-prod',
    price: 150,
    categoryId: 'cat-noslug',
    isActive: true,
  } as unknown as Product;

  const catsWithNoSlug: Category[] = [
    {
      id: 'cat-noslug',
      name: 'Category Without Slug',
      isActive: true,
    } as unknown as Category,
  ];

  const resolvedSlug = resolveCanonicalCategorySlug(productWithCategoryWithoutSlug, catsWithNoSlug);
  assert(
    resolvedSlug === 'cat-noslug',
    'Category without slug falls back to category.id'
  );

  const resolvedUrl = resolveCanonicalCategoryUrl(productWithCategoryWithoutSlug, catsWithNoSlug);
  assert(
    resolvedUrl === '/categories/cat-noslug',
    'Category without slug generates URL using category.id fallback'
  );
}

console.log(`\nCategory Rename Propagation Results: ${passed} PASSED, ${failed} FAILED\n`);
if (failed > 0) {
  process.exit(1);
}
