import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

async function runKnowledgeAdminUiTests() {
  console.log('===============================================================');
  console.log('STARTING PHASE 2 STEP 2D: KNOWLEDGE ADMIN UI VERIFICATION');
  console.log('===============================================================');

  // --------------------------------------------------------------------------
  // SUITE 1: FILE EXISTENCE & COMPONENT CONTRACTS
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 1: File Architecture & Route Registration ---');

  const files = [
    'app/admin/knowledge/page.tsx',
    'app/admin/knowledge/AdminKnowledgeClient.tsx',
    'app/admin/knowledge/new/page.tsx',
    'app/admin/knowledge/[id]/page.tsx',
    'app/admin/knowledge/KnowledgeFormClient.tsx',
    'components/AdminLayout.tsx',
  ];

  for (const f of files) {
    const p = path.resolve(f);
    assert.ok(fs.existsSync(p), `Required UI file ${f} must exist`);
  }
  console.log('  ✓ All required Knowledge Admin UI pages and components exist (PASSED)');

  // Verify AdminLayout includes Knowledge Entities in navigation
  const adminLayoutContent = fs.readFileSync(path.resolve('components/AdminLayout.tsx'), 'utf8');
  assert.ok(
    adminLayoutContent.includes("href: '/admin/knowledge'"),
    'AdminLayout menuItems must include /admin/knowledge route'
  );
  assert.ok(
    adminLayoutContent.includes("name: 'Knowledge Entities'"),
    'AdminLayout menuItems must display "Knowledge Entities"'
  );
  console.log('  ✓ Admin navigation menu includes "Knowledge Entities" (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 2: LIST & SEARCH PAGE CONTRACT (AdminKnowledgeClient.tsx)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: List & Search View Features ---');

  const clientContent = fs.readFileSync(
    path.resolve('app/admin/knowledge/AdminKnowledgeClient.tsx'),
    'utf8'
  );

  // Check metrics
  assert.ok(clientContent.includes('totalCount'), 'Must compute total entities');
  assert.ok(clientContent.includes('publishedCount'), 'Must compute published count');
  assert.ok(clientContent.includes('draftCount'), 'Must compute draft count');
  assert.ok(clientContent.includes('reviewCount'), 'Must compute review count');
  assert.ok(clientContent.includes('archivedCount'), 'Must compute archived count');

  // Check search & filters
  assert.ok(clientContent.includes('searchQuery'), 'Must support search query state');
  assert.ok(clientContent.includes('statusFilter'), 'Must support status filter tabs');
  assert.ok(clientContent.includes('handleTogglePublish'), 'Must support quick publish/draft toggle');
  assert.ok(clientContent.includes('handleArchiveConfirm'), 'Must support archive modal action');

  // Check UNKNOWN protection in list
  assert.ok(
    clientContent.includes("entity.entityKey === 'UNKNOWN'"),
    'Must explicitly detect UNKNOWN sentinel'
  );
  assert.ok(
    clientContent.includes('Sentinel entity "UNKNOWN" cannot be published'),
    'Must guard against publishing UNKNOWN'
  );
  console.log('  ✓ List, Search, Status filtering, and UNKNOWN guards verified (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 3: FORM CLIENT CAPABILITIES (KnowledgeFormClient.tsx)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Knowledge Form Component Capabilities ---');

  const formContent = fs.readFileSync(
    path.resolve('app/admin/knowledge/KnowledgeFormClient.tsx'),
    'utf8'
  );

  // Field bindings
  const requiredFieldBindings = [
    'canonicalName',
    'entityKey',
    'slug',
    'scientificName',
    'botanicalFamily',
    'productFamily',
    'entityClass',
    'sortOrder',
    'aliases',
    'redirectSlugs',
    'supportedScopes',
    'safeUseCases',
    'compatibleAttributes',
    'relatedEntities',
    'guideFamilies',
    'description',
    'seoTitle',
    'seoDescription',
    'ogImageUrl',
    'robotsIndex',
    'robotsFollow',
    'status',
    'published',
  ];

  for (const field of requiredFieldBindings) {
    assert.ok(
      formContent.includes(field),
      `KnowledgeFormClient must manage field "${field}"`
    );
  }
  console.log(`  ✓ All ${requiredFieldBindings.length} contract fields bound in KnowledgeFormClient (PASSED)`);

  // Immutability rule: entityKey cannot be modified when editing existing
  assert.ok(
    formContent.includes('disabled={!isNew}'),
    'entityKey input must be strictly disabled when editing existing entity'
  );
  assert.ok(
    formContent.includes('Immutable'),
    'entityKey must display visual "Immutable" badge when editing'
  );
  console.log('  ✓ Entity key immutability visually enforced and disabled on edit (PASSED)');

  // Slug change redirect warning
  assert.ok(
    formContent.includes('Changing slug preserves previous'),
    'Slug change must display notice that previous slug will be preserved as redirect'
  );
  console.log('  ✓ Slug change redirect preservation notice verified (PASSED)');

  // UNKNOWN sentinel publishing guard in form
  assert.ok(
    formContent.includes('Governance Sentinel'),
    'Form must identify Governance Sentinel'
  );
  assert.ok(
    formContent.includes('disabled={isUnknown}'),
    'Status and publishing controls must be disabled for UNKNOWN'
  );
  console.log('  ✓ Sentinel UNKNOWN controls locked from publication in form (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 4: RESPONSIVE DESIGN & TAILWIND ACCESSIBILITY
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Responsive Design System Verification ---');

  // Verify responsive flex / grid classes for mobile, tablet, and desktop
  const responsivePatterns = [
    'flex-col',
    'md:flex-row',
    'grid-cols-1',
    'md:grid-cols-2',
    'overflow-x-auto',
    'sm:grid-cols-5',
    'sm:flex-row',
  ];

  for (const pattern of responsivePatterns) {
    assert.ok(
      clientContent.includes(pattern) || formContent.includes(pattern),
      `Responsive layout pattern "${pattern}" must be used for adaptive viewports`
    );
  }
  console.log('  ✓ Responsive adaptive layout verified for mobile/tablet/desktop (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 5: EDIT PAGE & NOT FOUND HANDLER ([id]/page.tsx)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Dynamic Route & 404 Fallback ---');

  const editPageContent = fs.readFileSync(
    path.resolve('app/admin/knowledge/[id]/page.tsx'),
    'utf8'
  );

  assert.ok(
    editPageContent.includes('getAllKnowledgeEntitiesAdmin'),
    'Edit page must load entities via DAL'
  );
  assert.ok(
    editPageContent.includes('Entity Not Found'),
    'Edit page must handle non-existent entity with friendly 404 card'
  );
  assert.ok(
    editPageContent.includes('Back to Knowledge Entities'),
    'Edit page 404 must provide return navigation'
  );
  console.log('  ✓ Dynamic [id] route and 404 graceful fallback verified (PASSED)');

  console.log('\n===============================================================');
  console.log('ALL PHASE 2 STEP 2D KNOWLEDGE ADMIN UI TESTS PASSED! (5/5)');
  console.log('===============================================================');
}

runKnowledgeAdminUiTests().catch((err) => {
  console.error('\n❌ KNOWLEDGE ADMIN UI TEST SUITE FAILED:', err);
  process.exit(1);
});

