import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createApi } from '../src/api.js';
import { parseKeys } from '../src/keys.js';
import { createServer } from '../src/server.js';

export const KEYS = [
  'zk_qr_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'zk_barcode_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'zk_screen_cccccccccccccccccccccccccccccccccccccccc',
  'zk_og_dddddddddddddddddddddddddddddddddddddddd',
  'zk_image_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  'zk_unfurl_ffffffffffffffffffffffffffffffffffffffff',
  'zk_markdown_gggggggggggggggggggggggggggggggggggggggg',
  'zk_domain_hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh',
  'zk_email_iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
  'zk_mverifier_jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj',
  'zk_translator_kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  'zk_gdrive_llllllllllllllllllllllllllllllllllllllll',
].join(',');

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

export function ok(data = {}) {
  return json({ status: 200, data });
}

/**
 * A fetch that answers from a queue and records what it was asked. A call
 * with nothing queued is a test failure, not a silent success.
 */
export function fakeFetch(...queue) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({
      url: String(url),
      method: init.method ?? 'GET',
      headers: init.headers ?? {},
      body: init.body ?? null,
    });
    if (init.signal?.aborted) {
      throw init.signal.reason;
    }
    if (queue.length === 0) {
      throw new Error(`Unexpected request: ${init.method ?? 'GET'} ${url}`);
    }
    const next = queue.shift();
    if (next instanceof Error) {
      throw next;
    }
    return typeof next === 'function' ? next(String(url), init) : next;
  };
  return { fetch, calls };
}

/** An API client wired to a fake fetch, a recorded sleep and a clock the test controls. */
export function fakeApi({ keys = KEYS, queue = [], ...options } = {}) {
  const { fetch, calls } = fakeFetch(...queue);
  const slept = [];
  const clock = { now: 0 };
  const api = createApi({
    keys: parseKeys(keys),
    fetch,
    now: () => clock.now,
    sleep: async (seconds) => {
      slept.push(seconds);
      clock.now += seconds * 1000;
    },
    ...options,
  });
  return { ...api, calls, slept, clock };
}

/** A client connected in memory to a server that uses a fake fetch. */
export async function connect({ keys = KEYS, queue = [], inlineImageBytes } = {}) {
  const parsed = parseKeys(keys);
  const { fetch, calls } = fakeFetch(...queue);
  const api = createApi({ keys: parsed, fetch, sleep: async () => {} });
  const server = createServer({ keys: parsed, api, ...(inlineImageBytes === undefined ? {} : { inlineImageBytes }) });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1.0.0' });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  return { client, calls, close: () => client.close() };
}
