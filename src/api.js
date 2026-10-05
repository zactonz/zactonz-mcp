import { missingKeyMessage } from './keys.js';

export const VERSION = '0.1.0';
export const DEFAULT_BASE_URL = 'https://api.zactonz.com';

/** Seconds the request burst limit in front of the API blocks a client for. */
const BURST_BLOCK = 10;

/** Gateway statuses that mean the API itself never answered. */
const GATEWAY_FAILURES = new Set([502, 503, 504]);

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/**
 * @typedef {import('./keys.js').Keyring} Keyring
 *
 * @typedef {object} ApiReply
 * @property {Record<string, unknown>} body The decoded reply.
 * @property {string | null} requestId
 *
 * @typedef {object} ApiOptions
 * @property {Keyring} keys
 * @property {string} [baseUrl]
 * @property {typeof globalThis.fetch} [fetch]
 * @property {number} [budget] Milliseconds one call may take in total, waits and retries included.
 * @property {number} [maxRetries]
 * @property {(seconds: number, signal?: AbortSignal) => Promise<void>} [sleep]
 * @property {() => number} [now]
 *
 * @typedef {ReturnType<typeof createApi>} Api
 */

/** A failed call, with what the model needs in order to react to it. */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status Status the API reported, or 0 when no response arrived.
   * @param {{ requestId?: string | null, retryAfter?: number | null, cause?: unknown }} [details]
   */
  constructor(message, status, { requestId = null, retryAfter = null, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
    this.retryAfter = retryAfter;
  }
}

/**
 * @param {ApiOptions} options
 */
export function createApi({
  keys,
  baseUrl = DEFAULT_BASE_URL,
  fetch = globalThis.fetch,
  // MCP clients give up on a tool call after 60 seconds by default, so a call
  // has to finish, or fail with something useful, before then.
  budget = 55000,
  maxRetries = 1,
  sleep = pause,
  now = Date.now,
}) {
  const origin = new URL(baseUrl).origin;

  /**
   * Sends a request, repeating it only where that cannot repeat work.
   *
   * @param {string} url
   * @param {RequestInit & { method: string }} init
   * @param {AbortSignal} [signal] Aborts when the client cancels the tool call.
   * @returns {Promise<Response>}
   */
  async function send(url, init, signal) {
    const deadline = now() + budget;
    for (let attempt = 0; ; attempt++) {
      const remaining = deadline - now();
      const timer = AbortSignal.timeout(Math.max(1, remaining));
      const combined = signal ? anySignal([signal, timer]) : timer;
      /** @type {Response} */
      let response;
      try {
        response = await fetch(url, { ...init, signal: combined, redirect: 'manual' });
      } catch (error) {
        if (signal?.aborted) {
          throw new ApiError('The call was cancelled.', 0, { cause: error });
        }
        if (timer.aborted) {
          throw new ApiError(`The Zactonz API did not answer within ${Math.round(budget / 1000)} seconds.`, 0, {
            cause: error,
          });
        }
        throw new ApiError(`The Zactonz API could not be reached: ${describeCause(error)}`, 0, { cause: error });
      }
      const wait = waitBeforeRetry(init.method, response, attempt);
      if (wait === null || attempt >= maxRetries || now() + wait * 1000 >= deadline) {
        return response;
      }
      await response.arrayBuffer().catch(() => null);
      await sleep(wait, signal);
    }
  }

  /**
   * Calls an endpoint with the key of its product.
   *
   * @param {string} product
   * @param {'GET' | 'POST'} method
   * @param {string} path
   * @param {Record<string, unknown>} [parameters]
   * @param {AbortSignal} [signal]
   * @returns {Promise<ApiReply>}
   */
  async function call(product, method, path, parameters = {}, signal) {
    const key = keys.get(product);
    if (!key) {
      throw new ApiError(missingKeyMessage(product), 0);
    }
    const fields = new URLSearchParams();
    for (const [name, value] of Object.entries(parameters)) {
      if (value === undefined || value === null) {
        continue;
      }
      fields.set(
        name,
        typeof value === 'boolean' ? (value ? '1' : '0') : Array.isArray(value) ? value.join(',') : String(value),
      );
    }
    const headers = {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'User-Agent': `zactonz-mcp/${VERSION}`,
    };
    const query = fields.toString();
    const response =
      method === 'GET'
        ? await send(`${origin}${path}${query ? `?${query}` : ''}`, { method, headers }, signal)
        : await send(
            `${origin}${path}`,
            { method, headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: query },
            signal,
          );
    return parse(response);
  }

  /**
   * Fetches an image the API produced, so it can be shown to the model.
   * Returns null rather than failing: the link has already been reported.
   *
   * @param {string} url
   * @param {number} maxBytes
   * @param {AbortSignal} [signal]
   * @returns {Promise<{ data: string, mimeType: string } | null>}
   */
  async function downloadImage(url, maxBytes, signal) {
    let target;
    try {
      target = new URL(url);
    } catch {
      return null;
    }
    // Only the API's own host is fetched, whatever link a reply contains.
    if (target.origin !== origin && target.origin !== DEFAULT_BASE_URL) {
      return null;
    }
    try {
      const timer = AbortSignal.timeout(15000);
      const response = await fetch(target, {
        method: 'GET',
        headers: { 'User-Agent': `zactonz-mcp/${VERSION}` },
        redirect: 'error',
        signal: signal ? anySignal([signal, timer]) : timer,
      });
      const mimeType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      if (
        !response.ok ||
        !IMAGE_TYPES.has(mimeType) ||
        Number(response.headers.get('content-length') ?? 0) > maxBytes
      ) {
        await response.body?.cancel().catch(() => null);
        return null;
      }
      const bytes = await readUpTo(response, maxBytes);
      return bytes ? { data: bytes.toString('base64'), mimeType } : null;
    } catch {
      return null;
    }
  }

  return { call, downloadImage };
}

/**
 * Seconds to wait before sending a request again, or null when it should not
 * be sent again.
 *
 * @param {string} method
 * @param {Response} response
 * @param {number} attempt
 * @returns {number | null}
 */
function waitBeforeRetry(method, response, attempt) {
  if (response.status === 429) {
    // A refused request was not processed, so any method can be repeated.
    const given = response.headers.get('retry-after');
    return isNumeric(given) ? Math.max(1, Number(given)) : 2 ** attempt;
  }
  if (isBurstBlock(response)) {
    return attempt === 0 ? BURST_BLOCK : null;
  }
  // A POST may have been processed before the gateway gave up, so only reads are repeated.
  return method === 'GET' && GATEWAY_FAILURES.has(response.status) ? 2 ** attempt : null;
}

/**
 * The firewall in front of the API answers a burst of requests (more than 20
 * to one endpoint within two seconds) with an HTML 403 page. The API's own
 * refusals are always JSON.
 *
 * @param {Response} response
 */
function isBurstBlock(response) {
  return response.status === 403 && (response.headers.get('content-type') ?? '').toLowerCase().startsWith('text/html');
}

/**
 * @param {Response} response
 * @returns {Promise<ApiReply>}
 */
async function parse(response) {
  const text = await response.text();
  const requestId = response.headers.get('x-request-id');
  /** @type {unknown} */
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  if (!isRecord(body)) {
    if (isBurstBlock(response)) {
      throw new ApiError(
        `The request burst limit in front of the Zactonz API blocked this call. Wait ${BURST_BLOCK} seconds before calling this tool again.`,
        response.status,
        { requestId, retryAfter: BURST_BLOCK },
      );
    }
    throw new ApiError(
      `The Zactonz API answered with HTTP ${response.status} and a body that is not JSON.`,
      response.status,
      { requestId },
    );
  }
  // Several endpoints report a failure in the body of an HTTP 200 reply, some as a numeric string.
  const declared = 'status' in body;
  const status = isNumeric(body.status) ? Number(body.status) : null;
  const accepted = !declared || (status !== null && status >= 200 && status < 300);
  if (response.ok && accepted) {
    return { body, requestId };
  }
  const given = response.headers.get('retry-after');
  throw new ApiError(
    failureMessage(body) ?? `The Zactonz API answered with status ${status ?? response.status}.`,
    status ?? response.status,
    {
      requestId,
      retryAfter: isNumeric(given) ? Number(given) : null,
    },
  );
}

/**
 * Endpoints put the reason for a failure in different fields.
 *
 * @param {Record<string, unknown>} body
 * @returns {string | null}
 */
function failureMessage(body) {
  for (const candidate of [body.message, body.data, body.reason]) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate.trim();
    }
  }
  const errors = Array.isArray(body.errors) ? body.errors.filter((entry) => typeof entry === 'string') : [];
  return errors.length ? errors.join(' ') : null;
}

/**
 * Reads a response body, giving up as soon as it grows past the limit.
 *
 * @param {Response} response
 * @param {number} maxBytes
 * @returns {Promise<Buffer | null>}
 */
async function readUpTo(response, maxBytes) {
  if (!response.body) {
    return null;
  }
  const chunks = [];
  let size = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return Buffer.concat(chunks);
    }
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => null);
      return null;
    }
    chunks.push(value);
  }
}

/**
 * AbortSignal.any() arrived in Node 20; this covers Node 18.
 *
 * @param {AbortSignal[]} signals
 * @returns {AbortSignal}
 */
function anySignal(signals) {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true, signal: controller.signal });
  }
  return controller.signal;
}

/**
 * fetch() reports every network failure as "fetch failed" and keeps the reason in `cause`.
 *
 * @param {unknown} error
 * @returns {string}
 */
function describeCause(error) {
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isNumeric(value) {
  return (
    (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value))
  );
}

/**
 * @param {number} seconds
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
function pause(seconds, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, seconds * 1000);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
