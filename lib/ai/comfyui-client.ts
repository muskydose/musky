/**
 * Client-Side ComfyUI Connector
 *
 * Orchestrates local ₹0 AI image generation directly from the admin's browser.
 * This bypasses the Vercel-to-localhost boundary (cloud serverless cannot reach
 * 127.0.0.1 on the developer's PC, but the admin's browser running locally can).
 */

export interface ComfyUIHealthStatus {
  online: boolean;
  endpoint: string;
  devices?: any[];
  error?: string;
}

export interface ComfyUIGenerationOptions {
  endpoint?: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
}

export interface ComfyUIGenerationResult {
  blob: Blob;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  promptUsed: string;
  modelName: string;
}

export const DEFAULT_COMFYUI_ENDPOINT = 'http://127.0.0.1:8188';

/**
 * Checks whether local ComfyUI is running and accessible with CORS enabled.
 */
export async function checkComfyUIHealth(
  endpoint: string = DEFAULT_COMFYUI_ENDPOINT
): Promise<ComfyUIHealthStatus> {
  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${cleanEndpoint}/system_stats`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        online: false,
        endpoint: cleanEndpoint,
        error: `ComfyUI responded with HTTP status ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      online: true,
      endpoint: cleanEndpoint,
      devices: data.devices,
    };
  } catch (err: any) {
    const isCorsOrConn =
      err.name === 'AbortError'
        ? 'Connection timed out (is ComfyUI running?)'
        : 'Connection refused or blocked by CORS. Launch with: python main.py --listen 127.0.0.1 --enable-cors-header';
    return {
      online: false,
      endpoint: cleanEndpoint,
      error: isCorsOrConn,
    };
  }
}

/**
 * Generates an image via local ComfyUI API workflow and returns the binary image Blob.
 */
export async function generateComfyUIImage(
  options: ComfyUIGenerationOptions
): Promise<ComfyUIGenerationResult> {
  const endpoint = (options.endpoint || DEFAULT_COMFYUI_ENDPOINT).replace(/\/+$/, '');
  const width = options.width || 1024;
  const height = options.height || 1024;
  const steps = options.steps || 25;
  const cfgScale = options.cfgScale || 7.5;
  const seed = options.seed || Math.floor(Math.random() * 1000000000);
  const negativePrompt =
    options.negativePrompt ||
    'ugly, blurry, low quality, distorted, artificial neon, text artifacts, watermark, packaging, retail container, logo watermark';

  // Standard ComfyUI default txt2img workflow graph
  const clientId = `musky-admin-${Date.now()}`;
  const workflowPrompt: Record<string, any> = {
    '3': {
      inputs: {
        seed,
        steps,
        cfg: cfgScale,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
      class_type: 'KSampler',
    },
    '4': {
      inputs: {
        ckpt_name: 'v1-5-pruned-emaonly.safetensors',
      },
      class_type: 'CheckpointLoaderSimple',
    },
    '5': {
      inputs: {
        width,
        height,
        batch_size: 1,
      },
      class_type: 'EmptyLatentImage',
    },
    '6': {
      inputs: {
        text: options.prompt,
        clip: ['4', 1],
      },
      class_type: 'CLIPTextEncode',
    },
    '7': {
      inputs: {
        text: negativePrompt,
        clip: ['4', 1],
      },
      class_type: 'CLIPTextEncode',
    },
    '8': {
      inputs: {
        samples: ['3', 0],
        vae: ['4', 2],
      },
      class_type: 'VAEDecode',
    },
    '9': {
      inputs: {
        filename_prefix: 'MuskyDose',
        images: ['8', 0],
      },
      class_type: 'SaveImage',
    },
  };

  // 1. Submit prompt to ComfyUI
  const queueRes = await fetch(`${endpoint}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: workflowPrompt,
      client_id: clientId,
    }),
  });

  if (!queueRes.ok) {
    const errText = await queueRes.text();
    throw new Error(`ComfyUI prompt submission failed (${queueRes.status}): ${errText}`);
  }

  const queueData = await queueRes.json();
  const promptId = queueData.prompt_id;
  if (!promptId) {
    throw new Error('ComfyUI returned no prompt_id in response.');
  }

  // 2. Poll /history/{promptId} until generation completes (max 90 seconds)
  const maxAttempts = 90;
  let filename: string | null = null;
  let subfolder = '';
  let folderType = 'output';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));

    try {
      const histRes = await fetch(`${endpoint}/history/${promptId}`);
      if (!histRes.ok) continue;

      const historyData = await histRes.json();
      const runHistory = historyData[promptId];

      if (runHistory && runHistory.outputs) {
        // Find SaveImage node output (node 9)
        for (const nodeId of Object.keys(runHistory.outputs)) {
          const nodeOutput = runHistory.outputs[nodeId];
          if (Array.isArray(nodeOutput.images) && nodeOutput.images.length > 0) {
            filename = nodeOutput.images[0].filename;
            subfolder = nodeOutput.images[0].subfolder || '';
            folderType = nodeOutput.images[0].type || 'output';
            break;
          }
        }
        if (filename) break;
      }
    } catch {
      // Continue polling
    }
  }

  if (!filename) {
    throw new Error(
      'ComfyUI generation timed out or failed to output an image after 90 seconds. Please check ComfyUI terminal output.'
    );
  }

  // 3. Fetch binary image from ComfyUI /view endpoint
  const viewUrl = `${endpoint}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(folderType)}`;
  const imgRes = await fetch(viewUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to download rendered image from ComfyUI: HTTP ${imgRes.status}`);
  }

  const blob = await imgRes.blob();
  if (blob.size < 1024) {
    throw new Error(`ComfyUI returned an invalid image with only ${blob.size} bytes.`);
  }

  return {
    blob,
    fileName: filename,
    mimeType: blob.type || 'image/png',
    width,
    height,
    promptUsed: options.prompt,
    modelName: 'Local ComfyUI / SD',
  };
}

