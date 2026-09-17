import { createClient } from '@supabase/supabase-js';
import { validateImageBinary } from '../lib/ai/image-integrity';
import {
  resolveEntityCanonicalFacts,
  buildCanonicalVisualPrompt,
  composeVisualPrompt,
} from '../lib/growth/visual-prompt-engine';
import { ManualAiStudioProvider, LocalSelfHostedProvider } from '../lib/ai/visual-engine';
import { checkComfyUIHealth, DEFAULT_COMFYUI_ENDPOINT } from '../lib/ai/comfyui-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runRealAiMediaTests() {
  console.log('====================================================');
  console.log('MASTER FORENSIC FIX: REAL AI MEDIA PIPELINE VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  // TEST 1: Database Test Pollution Purge
  console.log('--- SUITE 1: Test Pollution Sanitization ---');
  const { data: allAssets } = await supabase.from('media_assets').select('*');
  const testAssets = allAssets?.filter(a =>
    a.entity_id?.startsWith('test-') ||
    a.entity_id?.startsWith('prod-mock-') ||
    a.id?.startsWith('mock-') ||
    a.id?.startsWith('suggested-ai-') ||
    a.id?.startsWith('ai-claim-') ||
    a.id === 'asset-ai-overwrite-attempt' ||
    a.id === 'asset-ai-primary' ||
    a.id === 'media-test-henna'
  );
  assert(testAssets?.length === 0, `Zero test pollution records in production DB (Found ${testAssets?.length || 0})`);

  // TEST 2: Real Catalog Media Safety (Zero Collateral Damage)
  const { data: realProducts } = await supabase.from('products').select('id, name');
  const realMedia = allAssets?.filter(a => a.entity_type === 'PRODUCT' && realProducts?.some(p => p.id === a.entity_id));
  assert((realMedia?.length || 0) >= 160, `Real catalog product media preserved (Found ${realMedia?.length} assets across 28 products)`);

  // TEST 3: Image Binary Integrity - Reject < 1KB Mock Payloads
  console.log('\n--- SUITE 2: Binary Integrity & Magic Bytes Verification ---');
  const mock33b = Buffer.from('mock-generated-image-data-payload');
  const val33b = validateImageBinary(mock33b);
  assert(!val33b.isValid, 'Reject 33-byte mock plaintext string');
  assert(val33b.error?.includes('too small') === true, 'Accurate error message for payload < 1KB');

  const mock124b = Buffer.alloc(124);
  const val124b = validateImageBinary(mock124b);
  assert(!val124b.isValid, 'Reject 124-byte truncated header');

  // TEST 4: Image Binary Integrity - Magic Bytes Checking
  // Valid PNG mock (> 1KB)
  const validPngBuf = Buffer.alloc(2048);
  const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < pngMagic.length; i++) validPngBuf[i] = pngMagic[i];
  const valPng = validateImageBinary(validPngBuf);
  assert(valPng.isValid && valPng.format === 'png', 'Accept valid PNG with correct magic bytes (2048 bytes)');

  // Valid JPEG mock (> 1KB)
  const validJpgBuf = Buffer.alloc(2048);
  validJpgBuf[0] = 0xff;
  validJpgBuf[1] = 0xd8;
  validJpgBuf[2] = 0xff;
  const valJpg = validateImageBinary(validJpgBuf);
  assert(valJpg.isValid && valJpg.format === 'jpeg', 'Accept valid JPEG with correct magic bytes (2048 bytes)');

  // Invalid Garbage Magic Bytes (> 1KB)
  const garbageBuf = Buffer.alloc(2048, 'X');
  const valGarbage = validateImageBinary(garbageBuf);
  assert(!valGarbage.isValid, 'Reject 2KB garbage payload without image magic bytes');

  // TEST 5: Entity Context & Prompt Engine Accuracy (PRODUCT vs KNOWLEDGE)
  console.log('\n--- SUITE 3: Entity Context & Anti-Hallucination Prompting ---');
  
  // Product context
  const productPrompt = await composeVisualPrompt({
    entityType: 'PRODUCT',
    entityId: 'prod-1',
  });
  assert(productPrompt.variant === 'packshot', 'PRODUCT defaults to packshot variant');
  assert(productPrompt.finalPrompt.includes('Clean commercial product packshot'), 'PRODUCT prompt contains commercial studio packshot instructions');
  assert(!productPrompt.finalPrompt.includes('undefined'), 'PRODUCT prompt has zero undefined fields');

  // Knowledge context
  const knowledgePrompt = await composeVisualPrompt({
    entityType: 'KNOWLEDGE',
    entityId: 'HENNA_MEHNDI',
  });
  assert(knowledgePrompt.variant === 'illustration', 'KNOWLEDGE defaults to illustration variant (NEVER packshot)');
  assert(knowledgePrompt.finalPrompt.includes('Fine botanical scientific monograph illustration'), 'KNOWLEDGE prompt generates botanical monograph');
  assert(!knowledgePrompt.finalPrompt.includes('Clean commercial product packshot'), 'KNOWLEDGE prompt NEVER mentions product packshot');
  assert(knowledgePrompt.finalPrompt.includes('ZERO commercial packaging'), 'KNOWLEDGE prompt strictly forbids packaging pouches or bottles');

  // Knowledge forced-packshot protection
  const forcedPackshotKnowledge = await composeVisualPrompt({
    entityType: 'KNOWLEDGE',
    entityId: 'HENNA_MEHNDI',
    variant: 'packshot', // Try to force packshot
  });
  assert(forcedPackshotKnowledge.variant === 'illustration', 'KNOWLEDGE coerces forced packshot into illustration variant');
  assert(!forcedPackshotKnowledge.finalPrompt.includes('Clean commercial product packshot'), 'Forced packshot on KNOWLEDGE does not produce commercial packshot');

  // TEST 6: Provider Fail-Closed Behavior
  console.log('\n--- SUITE 4: Provider Zero-Cost & Fail-Closed Guards ---');
  const manualProvider = new ManualAiStudioProvider();
  let manualFailedClosed = false;
  try {
    await manualProvider.generateImage('test prompt', {});
  } catch (err: any) {
    manualFailedClosed = true;
    assert(err.message.includes('Free AI Studio is a prompt-first manual workflow'), 'Free AI Studio fails closed with clear manual workflow instructions when no file provided');
  }
  assert(manualFailedClosed, 'Free AI Studio threw exception on missing image bytes');

  // Local AI Provider
  const localProvider = new LocalSelfHostedProvider();
  let localFailedClosed = false;
  try {
    await localProvider.generateImage('test prompt', {});
  } catch (err: any) {
    localFailedClosed = true;
    assert(err.message.length > 5, 'Local AI provider fails closed with clear instructions when server cannot reach localhost');
  }
  assert(localFailedClosed, 'Local AI provider fails closed when unconfigured/unreachable');

  // TEST 7: ComfyUI Client Module Contract
  console.log('\n--- SUITE 5: Client-Side ComfyUI Connector Contract ---');
  assert(typeof checkComfyUIHealth === 'function', 'checkComfyUIHealth function exported');
  assert(DEFAULT_COMFYUI_ENDPOINT === 'http://127.0.0.1:8188', 'Default ComfyUI endpoint points to 127.0.0.1:8188');

  const healthCheck = await checkComfyUIHealth('http://127.0.0.1:9999'); // non-existent port
  assert(healthCheck.online === false, 'ComfyUI health check safely reports offline on unreachable port without crashing');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ALL ${passed} / ${total} TESTS PASSED!`);
  console.log('====================================================\n');
}

runRealAiMediaTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

