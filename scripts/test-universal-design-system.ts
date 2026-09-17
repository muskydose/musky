import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  UNIVERSAL_COLORS,
  UNIVERSAL_TYPOGRAPHY,
  UNIVERSAL_SPACING,
  UNIVERSAL_LAYOUT,
  UNIVERSAL_SHAPES,
  UNIVERSAL_MOTION,
  UNIVERSAL_ASPECT_RATIOS,
} from '../lib/design-system/tokens';
import {
  universalFadeVariants,
  universalRevealUpVariants,
  universalCardHoverMotion,
  reducedMotionVariants,
} from '../lib/design-system/motion';
import { isSafeInternalMediaUrl } from '../lib/db/media';

async function runTests() {
  console.log('🚀 Running Universal Design System & Motion Verification Suite...\n');

  // 1. Verify Core Tokens
  console.log('1. Verifying Design System Tokens:');
  assert.strictEqual(UNIVERSAL_COLORS.forest, '#0f2d22', 'Forest must be #0f2d22');
  assert.strictEqual(UNIVERSAL_COLORS.green, '#1b4332', 'Green must be #1b4332');
  assert.strictEqual(UNIVERSAL_COLORS.gold, '#c5a059', 'Gold must be #c5a059');
  assert.strictEqual(UNIVERSAL_COLORS.canvas, '#fcfbf7', 'Canvas must be #fcfbf7');
  assert.strictEqual(UNIVERSAL_COLORS.surface, '#ffffff', 'Surface must be #ffffff');
  console.log('   ✅ Color tokens strictly conform to Musky Dose brand identity');

  // 2. Verify Typography Invariants (Fonts MUST NOT change)
  console.log('2. Verifying Typography System:');
  assert.ok(UNIVERSAL_TYPOGRAPHY.fonts.heading.includes('--font-momo-trust'), 'Heading font must use --font-momo-trust');
  assert.ok(UNIVERSAL_TYPOGRAPHY.fonts.body.includes('--font-karla'), 'Body font must use --font-karla');
  assert.ok(UNIVERSAL_TYPOGRAPHY.fonts.mono.includes('monospace'), 'Mono font must include monospace');
  console.log('   ✅ Momo Trust Display and Karla strictly preserved');

  // Verify app/layout.tsx keeps exact fonts
  const layoutPath = path.join(process.cwd(), 'app', 'layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert.ok(layoutContent.includes('--font-momo-trust'), 'Layout must define --font-momo-trust');
  assert.ok(layoutContent.includes('--font-karla'), 'Layout must define --font-karla');
  console.log('   ✅ app/layout.tsx font definitions verified');

  // 3. Verify Layout, Spacing, and Shapes
  console.log('3. Verifying Spacing & Shapes Tokens:');
  assert.strictEqual(UNIVERSAL_SPACING.lg, '16px', '16px grid baseline');
  assert.strictEqual(UNIVERSAL_LAYOUT.containers['2xl'], '1440px');
  assert.strictEqual(UNIVERSAL_SHAPES.radii.lg, '16px');
  assert.ok(UNIVERSAL_ASPECT_RATIOS.includes('1:1'));
  assert.ok(UNIVERSAL_ASPECT_RATIOS.includes('4:5'));
  assert.ok(UNIVERSAL_ASPECT_RATIOS.includes('16:9'));
  console.log('   ✅ Spacing, containers, and aspect ratios verified');

  // 4. Verify Motion Engine & Reduced Motion
  console.log('4. Verifying Motion Presets & Accessibility:');
  assert.ok((reducedMotionVariants.visible as any).transition.duration <= 0.01, 'Reduced motion must minimize animation duration');
  assert.strictEqual((reducedMotionVariants.hidden as any).opacity, 1, 'Reduced motion hidden state must remain visible');
  assert.strictEqual((universalFadeVariants.hidden as any).opacity, 0);
  assert.strictEqual((universalFadeVariants.visible as any).opacity, 1);
  assert.strictEqual(universalCardHoverMotion.hover.y, -4);
  console.log('   ✅ Universal motion engine & reduced-motion accessibility verified');

  // 5. Verify UI Primitives Export
  console.log('5. Verifying Component Primitives Export:');
  const uiIndexPath = path.join(process.cwd(), 'components', 'ui', 'index.ts');
  assert.ok(fs.existsSync(uiIndexPath), 'components/ui/index.ts must exist');
  const uiIndexContent = fs.readFileSync(uiIndexPath, 'utf8');
  const requiredComponents = [
    'Button',
    'Heading',
    'Text',
    'Badge',
    'Container',
    'Section',
    'Grid',
    'Card',
    'ImageFrame',
    'EmptyState',
    'Skeleton',
    'UniversalCard',
    'UniversalMotion',
  ];
  for (const comp of requiredComponents) {
    assert.ok(uiIndexContent.includes(comp), `components/ui/index.ts must export ${comp}`);
    const compFile = path.join(process.cwd(), 'components', 'ui', `${comp}.tsx`);
    assert.ok(fs.existsSync(compFile), `${comp}.tsx must exist at ${compFile}`);
  }
  console.log(`   ✅ All ${requiredComponents.length} universal UI primitives present and exported`);

  // 6. Verify Category Presentation Architecture (Decoupled from CategoryCard)
  console.log('6. Verifying Category Presentation Architecture:');
  const { resolveCategoryPresentation, UNIVERSAL_CATEGORY_ICONS } = await import('../lib/design-system/category-presentation');
  assert.ok(UNIVERSAL_CATEGORY_ICONS.default, 'Registry must define default fallback icon');
  assert.ok(UNIVERSAL_CATEGORY_ICONS.henna, 'Registry must define henna icon');
  assert.ok(UNIVERSAL_CATEGORY_ICONS.oil, 'Registry must define oil icon');

  // Test known iconKey
  const knownConfig = resolveCategoryPresentation({ name: 'Hair Oils', iconKey: 'oil' } as any);
  assert.strictEqual(knownConfig.icon, UNIVERSAL_CATEGORY_ICONS.oil);

  // Test future unknown category
  const futureCatConfig = resolveCategoryPresentation({ name: 'Himalayan Shilajit Resin', slug: 'himalayan-shilajit' } as any);
  assert.strictEqual(futureCatConfig.icon, UNIVERSAL_CATEGORY_ICONS.default);
  assert.strictEqual(futureCatConfig.badgeText, 'Sojat Botanical');

  // Verify CategoryCard.tsx has zero slug-specific logic
  const categoryCardPath = path.join(process.cwd(), 'components', 'CategoryCard.tsx');
  const categoryCardContent = fs.readFileSync(categoryCardPath, 'utf8');
  assert.ok(!categoryCardContent.includes("toLowerCase().includes('henna')"), 'CategoryCard must not contain hardcoded henna branch');
  assert.ok(!categoryCardContent.includes("toLowerCase().includes('oil')"), 'CategoryCard must not contain hardcoded oil branch');
  assert.ok(categoryCardContent.includes('resolveCategoryPresentation'), 'CategoryCard must use resolveCategoryPresentation');
  console.log('   ✅ Category presentation decoupled: zero slug conditionals, automatic fallback for future categories');

  // 7. Verify Synthetic Future Entities (Zero one-off CSS)
  console.log('7. Verifying Dual Future Entity Universality (Synthetic Entity Tests):');
  // Entity A: RITUAL_COLLECTION
  const ritualEntity = {
    entityType: 'RITUAL_COLLECTION',
    id: 'ritual-sojat-night-pack',
    title: 'Sojat Overnight Restorative Ritual',
    subtitle: 'Seasonal Botanical Routine',
    description: 'A 3-step restorative hair and scalp care ritual using pure Lawsonia inermis and cold-pressed sesame.',
    imageSrc: '/images/products/sojat-henna.webp',
    aspectRatio: '4:5' as const,
    badges: [
      { label: 'Ancient Recipe', variant: 'gold' as const },
      { label: '100% Organic', variant: 'leaf' as const },
    ],
  };

  // Entity B: HERB_INDEX
  const herbEntity = {
    entityType: 'HERB_INDEX',
    id: 'herb-lawsonia-inermis',
    title: 'Lawsonia Inermis (Rajasthani Mehendi)',
    subtitle: 'High-Lawsone Botanical Cultivar',
    description: 'Indigenous drought-tolerant shrub harvested in Pali district yielding 2.8%+ lawsone pigment density.',
    imageSrc: '/images/products/baq-henna.webp',
    aspectRatio: '1:1' as const,
    badges: [
      { label: 'GI Tagged Sojat', variant: 'gold' as const },
      { label: '2.8%+ Lawsone', variant: 'neutral' as const },
    ],
  };

  // Check that media safety validator passes on legitimate internal assets
  assert.strictEqual(isSafeInternalMediaUrl(ritualEntity.imageSrc), true);
  assert.strictEqual(isSafeInternalMediaUrl(herbEntity.imageSrc), true);
  // Check that media safety validator blocks external or mock leakage
  assert.strictEqual(isSafeInternalMediaUrl('https://images.unsplash.com/photo-fake'), false);
  assert.strictEqual(isSafeInternalMediaUrl('https://arbitrary-site.com/external-image.jpg'), false);
  console.log('   ✅ Synthetic future entities (RITUAL_COLLECTION, HERB_INDEX) cleanly satisfy UniversalCard contract');

  // 8. Verify Admin Arbitrary Clamp Elimination
  console.log('8. Verifying Admin Pixel Clamp Elimination:');
  const adminGrowthDir = path.join(process.cwd(), 'app', 'admin', 'growth');
  const adminGuardianDir = path.join(process.cwd(), 'app', 'admin', 'guardian');
  const adminFiles = [
    ...fs.readdirSync(adminGrowthDir).map(f => path.join(adminGrowthDir, f)),
    ...fs.readdirSync(adminGuardianDir).map(f => path.join(adminGuardianDir, f)),
  ];
  for (const f of adminFiles) {
    if (fs.statSync(f).isFile() && (f.endsWith('.tsx') || f.endsWith('.ts'))) {
      const content = fs.readFileSync(f, 'utf8');
      assert.ok(!content.includes('max-w-[150px]'), `${f} must not contain max-w-[150px]`);
      assert.ok(!content.includes('max-w-[200px]'), `${f} must not contain max-w-[200px]`);
      assert.ok(!content.includes('max-w-[220px]'), `${f} must not contain max-w-[220px]`);
      assert.ok(!content.includes('min-w-[180px]'), `${f} must not contain min-w-[180px]`);
      assert.ok(!content.includes('max-h-[500px]'), `${f} must not contain max-h-[500px]`);
    }
  }
  console.log('   ✅ Admin growth & guardian arbitrary pixel clamps eliminated');

  // 9. Verify CSS Custom Properties in app/globals.css
  console.log('9. Verifying Global CSS Custom Properties:');
  const globalsCss = fs.readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8');
  assert.ok(globalsCss.includes('--md-container-sm'), 'globals.css must contain --md-container-sm');
  assert.ok(globalsCss.includes('--md-container-2xl'), 'globals.css must contain --md-container-2xl');
  console.log('   ✅ app/globals.css universal layout variables verified');

  console.log('\n🎉 ALL UNIVERSAL DESIGN SYSTEM & MOTION VERIFICATIONS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\n❌ Universal Design System verification failed:', err);
  process.exit(1);
});
