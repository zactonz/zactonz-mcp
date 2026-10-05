import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from '../src/api.js';
import { fakeApi, json, ok } from './helpers.js';

const throttled = (retryAfter) =>
  json({ status: 429, message: 'Rate limit exceeded' }, 429, { 'retry-after': retryAfter });
const burstBlock = () =>
  new Response('<html>Forbidden</html>', { status: 403, headers: { 'content-type': 'text/html; charset=iso-8859-1' } });

test('GET sends arguments in the query string with the product key', async () => {
  const api = fakeApi({ queue: [json({ status: 200, data: { title: 'Zactonz' } }, 200, { 'x-request-id': 'r1' })] });

  const reply = await api.call('unfurl', 'GET', '/unfurl/', {
    url: 'https://zactonz.com/a b?x=1&y=2',
    render: true,
    fresh: false,
    skipped: undefined,
    empty: null,
  });

  assert.equal(
    api.calls[0].url,
    'https://api.zactonz.com/unfurl/?url=https%3A%2F%2Fzactonz.com%2Fa+b%3Fx%3D1%26y%3D2&render=1&fresh=0',
  );
  assert.equal(api.calls[0].headers.Authorization, 'Bearer zk_unfurl_ffffffffffffffffffffffffffffffffffffffff');
  assert.match(api.calls[0].headers['User-Agent'], /^zactonz-mcp\/\d+\.\d+\.\d+$/);
  assert.deepEqual(reply, { body: { status: 200, data: { title: 'Zactonz' } }, requestId: 'r1' });
});

test('POST sends arguments as a form body', async () => {
  const api = fakeApi({ queue: [ok()] });

  await api.call('screen', 'POST', '/screen/html/', { html: '<h1>A & B</h1>', quality: 80 });

  assert.equal(api.calls[0].url, 'https://api.zactonz.com/screen/html/');
  assert.equal(api.calls[0].headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.equal(api.calls[0].body, 'html=%3Ch1%3EA+%26+B%3C%2Fh1%3E&quality=80');
});

test('array arguments are joined with commas', async () => {
  const api = fakeApi({ queue: [ok()] });

  await api.call('domain', 'GET', '/domain/dns/', { name: 'zactonz.com', type: ['A', 'MX'] });

  assert.equal(api.calls[0].url, 'https://api.zactonz.com/domain/dns/?name=zactonz.com&type=A%2CMX');
});

test('a product without a key fails before any request', async () => {
  const api = fakeApi({ keys: 'zk_qr_abc' });

  await assert.rejects(
    api.call('screen', 'POST', '/screen/url/', {}),
    /No Zactonz API key is configured for the "screen" product/,
  );
  assert.equal(api.calls.length, 0);
});

test('a failing status inside an HTTP 200 reply is an error', async () => {
  const api = fakeApi({
    queue: [
      new Response('{"status":"400","data":"Missing content"}', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    ],
  });

  await assert.rejects(
    api.call('qr', 'GET', '/qr/enc/', {}),
    (error) => error instanceof ApiError && error.status === 400 && error.message === 'Missing content',
  );
});

test('a status that is not a number is an error', async () => {
  for (const status of ['error', false, true, null]) {
    const api = fakeApi({ queue: [json({ status, message: 'Something went wrong' })] });

    await assert.rejects(api.call('domain', 'GET', '/domain/whois/', {}), {
      message: 'Something went wrong',
      status: 200,
    });
  }
});

test('a reply without a status field is accepted on HTTP 200', async () => {
  const api = fakeApi({ queue: [json({ data: { ok: true } })] });

  assert.deepEqual((await api.call('domain', 'GET', '/domain/ssl/', {})).body.data, { ok: true });
});

test('the failure message is read from message, data, reason or errors', async () => {
  const api = fakeApi({
    queue: [
      json({ status: 400, data: null, errors: ['Invalid target language.', 'Text is empty.'] }),
      json({ status: '403', message: '', reason: 'Invalid key' }),
      json({ status: 422 }),
    ],
  });

  for (const expected of [
    'Invalid target language. Text is empty.',
    'Invalid key',
    'The Zactonz API answered with status 422.',
  ]) {
    await assert.rejects(api.call('translator', 'POST', '/translator/', {}), { message: expected });
  }
});

test('a body that is not JSON is an error', async () => {
  const api = fakeApi({
    queue: [new Response('<h1>Oops</h1>', { status: 500, headers: { 'content-type': 'text/html' } })],
  });

  await assert.rejects(api.call('screen', 'POST', '/screen/url/', {}), {
    status: 500,
    message: /HTTP 500 and a body that is not JSON/,
  });
});

test('a redirect is an error, not followed', async () => {
  const api = fakeApi({
    queue: [new Response('', { status: 302, headers: { location: 'https://elsewhere.example/' } })],
  });

  await assert.rejects(api.call('domain', 'GET', '/domain/ssl/', {}), { status: 302 });
  assert.equal(api.calls.length, 1);
});

test('a 429 is retried after Retry-After, for POST as well', async () => {
  const api = fakeApi({ queue: [throttled('7'), ok({ done: true })] });

  const reply = await api.call('screen', 'POST', '/screen/url/', { url: 'https://zactonz.com' });

  assert.deepEqual(reply.body.data, { done: true });
  assert.deepEqual(api.slept, [7]);
});

test('a Retry-After beyond the time budget is reported instead of waited for', async () => {
  const api = fakeApi({ queue: [throttled('41000')] });

  await assert.rejects(
    api.call('domain', 'GET', '/domain/dns/', {}),
    (error) => error.status === 429 && error.retryAfter === 41000,
  );
  assert.deepEqual(api.slept, []);
});

test('at most one retry is made by default', async () => {
  const api = fakeApi({ queue: [throttled('1'), throttled('1')] });

  await assert.rejects(api.call('domain', 'GET', '/domain/dns/', {}), { status: 429 });
  assert.equal(api.calls.length, 2);
});

test('a gateway failure is retried for GET only', async () => {
  const get = fakeApi({ queue: [new Response('Bad Gateway', { status: 502 }), ok()] });
  await get.call('domain', 'GET', '/domain/ssl/', {});
  assert.deepEqual(get.slept, [1]);

  const post = fakeApi({ queue: [new Response('Gateway Timeout', { status: 504 })] });
  await assert.rejects(post.call('screen', 'POST', '/screen/url/', {}), { status: 504 });
  assert.equal(post.calls.length, 1);
});

test('a burst block is waited out once, then reported with the wait', async () => {
  const recovered = fakeApi({ queue: [burstBlock(), ok('decoded')] });
  assert.equal((await recovered.call('qr', 'POST', '/qr/dec/', { image: 'x' })).body.data, 'decoded');
  assert.deepEqual(recovered.slept, [10]);

  const blocked = fakeApi({ maxRetries: 5, queue: [burstBlock(), burstBlock()] });
  await assert.rejects(
    blocked.call('qr', 'POST', '/qr/dec/', { image: 'x' }),
    (error) => error.status === 403 && error.retryAfter === 10 && /burst limit/.test(error.message),
  );
  assert.equal(blocked.calls.length, 2);
});

test('a JSON 403 is a refusal, not a burst block', async () => {
  const api = fakeApi({
    queue: [json({ status: 403, message: 'This API key is not licensed for this endpoint' }, 403)],
  });

  await assert.rejects(api.call('qr', 'POST', '/qr/dec/', {}), {
    status: 403,
    message: 'This API key is not licensed for this endpoint',
  });
  assert.deepEqual(api.slept, []);
});

test('a network failure reports its cause and is not retried', async () => {
  const api = fakeApi({
    queue: [new TypeError('fetch failed', { cause: new Error('getaddrinfo ENOTFOUND api.zactonz.com') })],
  });

  await assert.rejects(api.call('domain', 'GET', '/domain/ssl/', {}), {
    status: 0,
    message: 'The Zactonz API could not be reached: getaddrinfo ENOTFOUND api.zactonz.com',
  });
  assert.equal(api.calls.length, 1);
});

test('a cancelled call stops without retrying', async () => {
  const controller = new AbortController();
  controller.abort(new Error('cancelled by client'));
  const api = fakeApi({ queue: [ok()] });

  await assert.rejects(api.call('domain', 'GET', '/domain/ssl/', {}, controller.signal), {
    message: 'The call was cancelled.',
  });
  assert.equal(api.calls.length, 1);
});

test('downloadImage returns an image from the API host', async () => {
  const api = fakeApi({
    queue: [new Response(Buffer.from('PNGDATA'), { status: 200, headers: { 'content-type': 'image/png' } })],
  });

  assert.deepEqual(await api.downloadImage('https://api.zactonz.com/qr/enc/i/a.png', 1000), {
    data: Buffer.from('PNGDATA').toString('base64'),
    mimeType: 'image/png',
  });
  assert.equal(api.calls[0].headers.Authorization, undefined);
});

test('downloadImage never fetches another host or scheme', async () => {
  const api = fakeApi();

  for (const url of ['https://evil.example/a.png', 'http://api.zactonz.com/a.png', 'file:///etc/passwd', 'not a url']) {
    assert.equal(await api.downloadImage(url, 1000), null);
  }
  assert.equal(api.calls.length, 0);
});

test('downloadImage gives up on oversized, non-image and failed responses', async () => {
  const image = (bytes, headers = {}) =>
    new Response(Buffer.from(bytes), { status: 200, headers: { 'content-type': 'image/png', ...headers } });
  const url = 'https://api.zactonz.com/a.png';

  assert.equal(await fakeApi({ queue: [image('PNGDATA', { 'content-length': '7' })] }).downloadImage(url, 3), null);
  assert.equal(await fakeApi({ queue: [image('PNGDATA-WITHOUT-A-LENGTH-HEADER')] }).downloadImage(url, 3), null);
  assert.equal(
    await fakeApi({ queue: [new Response('%PDF', { headers: { 'content-type': 'application/pdf' } })] }).downloadImage(
      url,
      1000,
    ),
    null,
  );
  assert.equal(
    await fakeApi({
      queue: [new Response('gone', { status: 404, headers: { 'content-type': 'image/png' } })],
    }).downloadImage(url, 1000),
    null,
  );
  assert.equal(await fakeApi({ queue: [new Error('offline')] }).downloadImage(url, 1000), null);
});
