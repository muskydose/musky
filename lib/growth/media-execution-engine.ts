import { getSupabaseAdmin } from '@/lib/supabase';
import {
  MediaEntityType,
  MediaAssetRole,
  MediaAsset,
  saveMediaAsset,
  getMediaForEntity,
  isRealOwnerPhotoProtected,
} from '@/lib/db/media';
import {
  reconcileCanonicalSlot,
  checkAspectRatioMatch,
  SlotSpecification,
} from '@/lib/growth/media-specs';
import {
  canProcessMediaJob,
  acquireMediaJobLock,
  completeMediaJob,
  enqueueMediaJob,
  generateDeterministicMediaJobId,
  isTestOrDemoEntity,
  validateEntityExists,
  MediaJobStatus,
  MediaJobStrategy,
  MediaJobEligibilityStatusCode,
  getMediaJobById,
} from '@/lib/growth/media-jobs-engine';
import {
  generateMediaDerivative,
  SupportedDerivativeType,
} from '@/lib/media/derived-media-engine';
import { buildTemporaryVisualBlueprint } from '@/lib/growth/media-temporary-visuals';
import { buildSignatureWomanPrompt } from '@/lib/ai/signature-woman';
import {
  VisualProvider,
  LocalSelfHostedProvider,
  getActiveVisualProvider,
} from '@/lib/ai/visual-engine';
import { validateImageBinary } from '@/lib/ai/image-integrity';

export interface UniversalMediaJobInput {
  jobId?: string;
  entityType: MediaEntityType;
  entityId: string;
  slotKey?: string;
  role?: string;
  strategy?: MediaJobStrategy;
  provider?: VisualProvider;
  workerId?: string;
  promptOverride?: string;
  useSignatureWoman?: boolean;
  entityName?: string;
}

export interface UniversalMediaJobExecutionResult {
  jobId: string;
  entityType: MediaEntityType;
  entityId: string;
  slotKey: string;
  role: MediaAssetRole;
  status: MediaJobStatus;
  statusCode?: MediaJobEligibilityStatusCode | string;
  strategy: MediaJobStrategy;
  resultAssetId?: string | null;
  errorMessage?: string;
  reused?: boolean;
  provider?: string;
  narrative?: {
    whyThisTask: string;
    whatDetected: string;
    whatChanged: string;
    whatVerified: string;
    whatLearned: string;
  };
}

/**
 * Authoritative Universal Media Execution Contract.
 * Enforces a single, deterministic pipeline across all 6 entity types:
 * PRODUCT, CATEGORY, GUIDE, KNOWLEDGE, BRAND, MARKETING
 * and all 19 canonical slot roles.
 */
export async function executeUniversalMediaJob(
  input: UniversalMediaJobInput
): Promise<UniversalMediaJobExecutionResult> {
  const entityType = ((input.entityType || 'PRODUCT').toUpperCase().trim()) as MediaEntityType;
  const cleanId = String(input.entityId || '').trim();
  const workerId = input.workerId || 'universal-media-worker';

  // STEP 2: CANONICAL SLOT RESOLUTION
  const rawRoleOrKey = input.slotKey || input.role || 'PRIMARY';
  const spec = reconcileCanonicalSlot(rawRoleOrKey, entityType);

  const resolvedStrategy: MediaJobStrategy =
    input.strategy ||
    spec.requiredStrategy ||
    (spec.canDeriveFrom ? 'DERIVED' : spec.role === 'PRIMARY' ? 'TEMPORARY' : 'AI');

  const jobId = input.jobId || generateDeterministicMediaJobId(entityType, cleanId, spec.slotKey);

  // Idempotency guard: a completed job with a persisted result must never
  // regenerate the same canonical slot merely because a worker encountered it again.
  const existingJob = await getMediaJobById(jobId);
  if (existingJob?.status === 'COMPLETED' && existingJob.resultAssetId) {
    return {
      jobId,
      entityType,
      entityId: cleanId,
      slotKey: spec.slotKey,
      role: spec.role,
      status: 'COMPLETED',
      statusCode: 'ELIGIBLE',
      strategy: existingJob.strategy || resolvedStrategy,
      resultAssetId: existingJob.resultAssetId,
      reused: true,
      provider: existingJob.provider,
      narrative: {
        whyThisTask: `Reconcile canonical media job [${jobId}].`,
        whatDetected: `Job is already COMPLETED with persisted asset ${existingJob.resultAssetId}.`,
        whatChanged: 'No regeneration or duplicate upload performed.',
        whatVerified: 'Deterministic job identity and persisted result preserved.',
        whatLearned: 'Completed canonical media jobs are idempotent and safe to revisit.',
      },
    };
  }

  // STEP 1: ENTITY VALIDATION
  // 1a. Test / Demo entity isolation guard
  if (isTestOrDemoEntity(cleanId)) {
    await completeMediaJob({
      jobId,
      status: 'BLOCKED',
      errorMessage: 'TEST_ENTITY_REJECTED',
    });

    return {
      jobId,
      entityType,
      entityId: cleanId,
      slotKey: spec.slotKey,
      role: spec.role,
      status: 'BLOCKED',
      statusCode: 'TEST_ENTITY_REJECTED',
      strategy: resolvedStrategy,
      resultAssetId: null,
      errorMessage: 'TEST_ENTITY_REJECTED',
      narrative: {
        whyThisTask: `Audit visual slot [${spec.slotKey}] for ${entityType} ${cleanId}.`,
        whatDetected: `Queue governance detected test/demo fixture identifier.`,
        whatChanged: 'Zero assets created or altered.',
        whatVerified: 'Safe block verified: synthetic entities are strictly excluded from automated production pipelines.',
        whatLearned: 'Autonomous media workers strictly reject test entities and synthetic demo records.',
      },
    };
  }

  // 1b. Real Production Source-of-Truth Validation
  const entityExists = await validateEntityExists(entityType, cleanId);
  if (!entityExists) {
    await completeMediaJob({
      jobId,
      status: 'BLOCKED',
      errorMessage: 'INVALID_ENTITY',
    });

    return {
      jobId,
      entityType,
      entityId: cleanId,
      slotKey: spec.slotKey,
      role: spec.role,
      status: 'BLOCKED',
      statusCode: 'INVALID_ENTITY',
      strategy: resolvedStrategy,
      resultAssetId: null,
      errorMessage: 'INVALID_ENTITY',
      narrative: {
        whyThisTask: `Audit visual slot [${spec.slotKey}] for ${entityType} ${cleanId}.`,
        whatDetected: `${entityType} "${cleanId}" does not exist in authoritative production tables.`,
        whatChanged: 'Zero assets created. Job safely halted.',
        whatVerified: 'Authoritative entity check prevented orphaned asset creation.',
        whatLearned: 'Production execution requires verifiable catalog persistence.',
      },
    };
  }

  // STEP 3: UNIVERSAL ASSET PROTECTION
  const existingAssets = await getMediaForEntity({
    entityType,
    entityId: cleanId,
    includeDrafts: true,
  });

  const protectedAsset = existingAssets.find(
    (a) =>
      (a.role === spec.role || a.slotKey === spec.slotKey) &&
      isRealOwnerPhotoProtected(a) &&
      a.status === 'approved'
  );

  if (protectedAsset) {
    await completeMediaJob({
      jobId,
      status: 'BLOCKED',
      errorMessage: 'PROTECTED_REAL_OWNER',
    });

    return {
      jobId,
      entityType,
      entityId: cleanId,
      slotKey: spec.slotKey,
      role: spec.role,
      status: 'BLOCKED',
      statusCode: 'PROTECTED_REAL_OWNER',
      strategy: resolvedStrategy,
      resultAssetId: protectedAsset.id,
      errorMessage: 'PROTECTED_REAL_OWNER',
      narrative: {
        whyThisTask: `Audit visual slot [${spec.slotKey}] for ${entityType} ${cleanId}.`,
        whatDetected: `Found protected real owner photo or locked asset (${protectedAsset.id}). Rule: Physical owner media is immutable.`,
        whatChanged: 'Zero automated overwrites applied. Protected photography permanently preserved.',
        whatVerified: `Slot active with verified physical asset ${protectedAsset.url}.`,
        whatLearned: 'Real owner photography and locked media outrank all automated AI and temporary generation.',
      },
    };
  }

  // STEP 4: UNIVERSAL STRATEGY RESOLUTION
  if (resolvedStrategy === 'NO_ACTION') {
    await completeMediaJob({
      jobId,
      status: 'BLOCKED',
      errorMessage: 'NO_ACTION',
    });

    return {
      jobId,
      entityType,
      entityId: cleanId,
      slotKey: spec.slotKey,
      role: spec.role,
      status: 'BLOCKED',
      statusCode: 'NO_ACTION',
      strategy: resolvedStrategy,
      resultAssetId: null,
      errorMessage: 'NO_ACTION',
      narrative: {
        whyThisTask: `Audit visual slot [${spec.slotKey}] for ${entityType} ${cleanId}.`,
        whatDetected: 'Canonical slot requires NO_ACTION.',
        whatChanged: 'Zero actions performed.',
        whatVerified: 'No generation needed.',
        whatLearned: 'Slots marked NO_ACTION are safely skipped.',
      },
    };
  }

  if (resolvedStrategy === 'MANUAL_REQUIRED' || resolvedStrategy === 'REAL') {
    await completeMediaJob({
      jobId,
      status: 'BLOCKED',
      errorMessage: 'MANUAL_REQUIRED',
    });

    return {
      jobId,
      entityType,
      entityId: cleanId,
      slotKey: spec.slotKey,
      role: spec.role,
      status: 'BLOCKED',
      statusCode: 'MANUAL_REQUIRED',
      strategy: resolvedStrategy,
      resultAssetId: null,
      errorMessage: 'MANUAL_REQUIRED',
      narrative: {
        whyThisTask: `Audit visual slot [${spec.slotKey}] for ${entityType} ${cleanId}.`,
        whatDetected: `Slot requires manual physical photography or verified manual upload.`,
        whatChanged: 'Zero AI media generated. Job flagged for human admin upload.',
        whatVerified: 'Integrity rule enforced: manual slots never hallucinated by AI.',
        whatLearned: 'Physical packshots and certifications require manual operator ingestion.',
      },
    };
  }

  // STEP 8: UNIVERSAL LOCKING (5-minute lease)
  // Ensure durable job row exists
  await enqueueMediaJob({
    entityType,
    entityId: cleanId,
    slotKey: spec.slotKey,
    strategy: resolvedStrategy,
    priority: 'P2',
  });

  const lockAcquired = await acquireMediaJobLock(jobId, workerId, { enforceEligibility: false });
  if (!lockAcquired) {
    return {
      jobId,
      entityType,
      entityId: cleanId,
      slotKey: spec.slotKey,
      role: spec.role,
      status: 'IN_PROGRESS',
      statusCode: 'LOCKED',
      strategy: resolvedStrategy,
      resultAssetId: null,
      errorMessage: 'Job currently locked by another active worker lease.',
    };
  }

  // STEP 11: UNIVERSAL DERIVATIVE RULE
  if (resolvedStrategy === 'DERIVED' || (spec.canDeriveFrom && !input.strategy)) {
    const masterPrimary = existingAssets.find((a) => a.role === 'PRIMARY' && a.status === 'approved');
    if (masterPrimary) {
      let derivativeType: SupportedDerivativeType = 'OPENGRAPH';
      if (spec.role === 'THUMBNAIL' || spec.slotKey === 'PRODUCT_THUMBNAIL' || spec.slotKey === 'PRODUCT_DETAIL') {
        derivativeType = 'THUMBNAIL';
      } else if (spec.role === 'SOCIAL_SQUARE' || spec.slotKey === 'SOCIAL_SQUARE') {
        derivativeType = 'SOCIAL_SQUARE';
      } else if (spec.role === 'MOBILE_HERO' || spec.slotKey === 'PRODUCT_MOBILE' || spec.slotKey === 'CATEGORY_MOBILE') {
        derivativeType = 'MOBILE_HERO';
      }

      try {
        const derivResult = await generateMediaDerivative({
          masterAsset: masterPrimary,
          derivativeType,
        });

        await completeMediaJob({
          jobId,
          status: 'COMPLETED',
          resultAssetId: derivResult.asset.id,
        });

        return {
          jobId,
          entityType,
          entityId: cleanId,
          slotKey: spec.slotKey,
          role: spec.role,
          status: 'COMPLETED',
          strategy: 'DERIVED',
          resultAssetId: derivResult.asset.id,
          reused: derivResult.reused,
          narrative: {
            whyThisTask: `Generate ${derivativeType} derivative from master asset for ${entityType} ${cleanId}.`,
            whatDetected: `Approved master primary found (${masterPrimary.id}). Deriving canonical ${derivativeType}.`,
            whatChanged: `Generated/reused derivative asset ${derivResult.asset.id}.`,
            whatVerified: `Lineage attached to parent ${masterPrimary.id} without distortion.`,
            whatLearned: 'Derivatives preserve brand consistency and save compute resources.',
          },
        };
      } catch (derivErr: any) {
        await completeMediaJob({
          jobId,
          status: 'FAILED',
          errorMessage: derivErr.message,
        });

        return {
          jobId,
          entityType,
          entityId: cleanId,
          slotKey: spec.slotKey,
          role: spec.role,
          status: 'FAILED',
          strategy: 'DERIVED',
          errorMessage: derivErr.message,
          resultAssetId: null,
        };
      }
    }
  }

  // STEP 5: UNIVERSAL PROVIDER CONTRACT & AVAILABILITY CHECK
  const provider: VisualProvider = input.provider || new LocalSelfHostedProvider();

  const isAvailable = await provider.isAvailable();

  // STEP 6: BUILD GROUNDED CANONICAL PROMPT
  let blueprintPrompt = input.promptOverride || '';
  if (!blueprintPrompt) {
    if (input.useSignatureWoman) {
      const womanResult = buildSignatureWomanPrompt({
        scene: 'Traditional Rajasthani stone courtyard with fresh henna leaves',
        action: 'inspecting harvested botanical foliage in natural morning sunlight',
        composition: 'PORTRAIT',
        aspectRatio: spec.aspectRatio as any,
      });
      blueprintPrompt = womanResult.prompt;
    } else {
      const tempBlueprint = buildTemporaryVisualBlueprint({
        entityType,
        entityId: cleanId,
        entityName: input.entityName || `${entityType} ${cleanId}`,
        slotKey: spec.slotKey,
      });
      blueprintPrompt = tempBlueprint.prompt;
    }
  }

  // PROVIDER OFFLINE GUARD
  if (!isAvailable) {
    await completeMediaJob({
      jobId,
      status: 'WAITING_PROVIDER',
      errorMessage: 'Local AI provider offline',
    });

    return {
      jobId,
      entityType,
      entityId: cleanId,
      slotKey: spec.slotKey,
      role: spec.role,
      status: 'WAITING_PROVIDER',
      statusCode: 'WAITING_PROVIDER',
      strategy: resolvedStrategy,
      resultAssetId: null,
      provider: provider.id || provider.name,
      errorMessage: 'Local provider offline; job enqueued in WAITING_PROVIDER state.',
      narrative: {
        whyThisTask: `Synthesize visual slot [${spec.slotKey}] for ${entityType} ${cleanId}.`,
        whatDetected: `Grounded factual blueprint compiled. Local ComfyUI provider is currently offline.`,
        whatChanged: `Enqueued durable job into public.media_jobs with state WAITING_PROVIDER. Zero fake assets created.`,
        whatVerified: `Storefront safely degrades to fallback placeholder until provider responds or photo is uploaded.`,
        whatLearned: `Master Agent never fabricates successful generation without real binary creation.`,
      },
    };
  }

  // STEP 6: UNIVERSAL GENERATION PIPELINE
  try {
    // 6a. Invoke provider
    const genResult = await provider.generateImage(blueprintPrompt, {
      aspectRatio: spec.aspectRatio,
      width: spec.recommendedWidth,
      height: spec.recommendedHeight,
    });

    // 6b. Validate binary
    const validation = validateImageBinary(genResult.buffer);
    if (!validation.isValid) {
      throw new Error(`AI generated output failed binary image validation: ${validation.error}`);
    }

    // 6c. Validate aspect ratio
    const ratioCheck = checkAspectRatioMatch(genResult.width, genResult.height, spec.aspectRatio);
    if (!ratioCheck.isMatch) {
      console.warn(`[executeUniversalMediaJob] Aspect ratio mismatch warning: expected ${spec.aspectRatio}, got ${genResult.width}x${genResult.height}`);
    }

    // 6d. Upload to Supabase Storage
    const ext = validation.format === 'png' ? 'png' : validation.format === 'webp' ? 'webp' : 'jpg';
    const storagePath = `canonical-media/${entityType.toLowerCase()}/${cleanId}/${spec.slotKey.toLowerCase()}-${Date.now()}.${ext}`;
    const bucketName = 'product-images';

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new Error('Supabase storage client unavailable. Cannot register media without storage persistence.');
    }

    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(storagePath, genResult.buffer, {
        contentType: validation.mimeType || genResult.mimeType,
        upsert: true,
      });

    if (uploadErr || !uploadData) {
      throw new Error(`Supabase storage upload failed: ${uploadErr?.message || 'No upload response'}`);
    }

    // 6e. Verify public URL
    const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) {
      throw new Error('Failed to resolve public URL for stored media object.');
    }

    // 6f. Save canonical MediaAsset via DAL
    // STEP 10: UNIVERSAL APPROVAL GOVERNANCE:
    // source: 'AI_GENERATED', status: 'suggested' (NEVER auto-approved!), isLocked: false
    const { asset } = await saveMediaAsset({
      entityType,
      entityId: cleanId,
      url: publicUrl,
      storageBucket: bucketName,
      storagePath,
      fileHash: validation.hash,
      fileName: `${entityType.toLowerCase()}-${cleanId}-${spec.slotKey.toLowerCase()}.${ext}`,
      mimeType: validation.mimeType || genResult.mimeType,
      fileSizeBytes: validation.byteLength,
      width: genResult.width,
      height: genResult.height,
      aspectRatio: spec.aspectRatio,
      role: spec.role,
      slotKey: spec.slotKey,
      source: 'AI_GENERATED',
      status: 'suggested', // STRICTLY SUGGESTED!
      isLocked: false,
      assetOrigin: resolvedStrategy === 'TEMPORARY' ? 'temporary_visual' : 'ai_generated',
      healthStatus: 'HEALTHY',
      title: `${spec.displayName} — ${cleanId}`,
      altText: `Canonical ${spec.role} visual for ${entityType} ${cleanId}`,
      visualContext: {
        slotKey: spec.slotKey,
        role: spec.role,
        strategy: resolvedStrategy,
        health_status: 'HEALTHY',
      },
      aiMetadata: {
        provider: genResult.provider || provider.name,
        providerId: genResult.providerId || provider.id || 'custom',
        promptUsed: genResult.promptUsed || blueprintPrompt,
        storagePath,
        fileHash: validation.hash,
        generatedAt: new Date().toISOString(),
      },
      sortOrder: 100,
    });

    // 6g. Complete job with real resultAssetId
    await completeMediaJob({
      jobId,
      status: 'COMPLETED',
      resultAssetId: asset.id,
    });

    return {
      jobId,
      entityType,
      entityId: cleanId,
      slotKey: spec.slotKey,
      role: spec.role,
      status: 'COMPLETED',
      strategy: resolvedStrategy,
      resultAssetId: asset.id,
      provider: genResult.provider || provider.name,
      narrative: {
        whyThisTask: `Execute universal generation for slot [${spec.slotKey}] of ${entityType} ${cleanId}.`,
        whatDetected: `Provider synthesized valid ${genResult.width}x${genResult.height} image.`,
        whatChanged: `Uploaded binary to Supabase Storage and registered canonical asset record (${asset.id}) with status suggested.`,
        whatVerified: `Storage URL verified: ${publicUrl}. Cryptographic hash recorded.`,
        whatLearned: `Universal execution contract successfully persisted canonical asset adhering to approval governance.`,
      },
    };
  } catch (genErr: any) {
    await completeMediaJob({
      jobId,
      status: 'FAILED',
      errorMessage: genErr.message,
    });

    return {
      jobId,
      entityType,
      entityId: cleanId,
      slotKey: spec.slotKey,
      role: spec.role,
      status: 'FAILED',
      strategy: resolvedStrategy,
      errorMessage: genErr.message,
      resultAssetId: null,
      narrative: {
        whyThisTask: `Execute generation for slot [${spec.slotKey}].`,
        whatDetected: `Generation error encountered: ${genErr.message}.`,
        whatChanged: 'No assets created. Job marked FAILED.',
        whatVerified: 'System fail-closed safely without corrupting catalog.',
        whatLearned: 'Generation errors are logged for retry or manual operator upload.',
      },
    };
  }
}
