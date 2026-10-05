import assert from 'node:assert/strict';
import { test } from 'node:test';
import tools from '../src/tools.js';
import { connect, json, ok } from './helpers.js';

const text = (result, index = 0) => result.content[index].text;
const png = () => new Response(Buffer.from('PNGDATA'), { status: 200, headers: { 'content-type': 'image/png' } });

test('lists every tool when no key is configured', async () => {
  const { client, close } = await connect({ keys: '' });

  const listed = (await client.listTools()).tools;

  assert.equal(listed.length, tools.length + 1);
  assert.ok(listed.every((tool) => tool.inputSchema.type === 'object' && tool.description && tool.annotations.title));
  await close();
});

test('lists only the tools the configured keys can call', async () => {
  const { client, close } = await connect({ keys: 'zk_domain_abc,zk_markdown_def' });

  const listed = (await client.listTools()).tools;
  const status = listed.find((tool) => tool.name === 'check_api_key');

  assert.deepEqual(listed.map((tool) => tool.name).sort(), [
    'check_api_key',
    'convert_html_to_markdown',
    'inspect_ssl_certificate',
    'lookup_dns',
    'lookup_whois',
    'read_webpage',
  ]);
  assert.deepEqual(status.inputSchema.properties.product.enum.sort(), ['domain', 'markdown']);
  assert.equal(listed.find((tool) => tool.name === 'lookup_dns').annotations.readOnlyHint, true);
  await close();
});

test('falls back to listing every tool when the only key is for an unknown product', async () => {
  const { client, close } = await connect({ keys: 'zk_screenshot_abc' });

  const listed = (await client.listTools()).tools;

  assert.equal(listed.length, tools.length + 1);
  assert.ok(
    listed.find((tool) => tool.name === 'check_api_key').inputSchema.properties.product.enum.includes('screen'),
  );
  await close();
});

test('instructions mention only tools that are offered', async () => {
  const some = await connect({ keys: 'zk_domain_abc' });
  assert.doesNotMatch(some.client.getInstructions(), /read_webpage|capture_screenshot/);
  await some.close();

  const all = await connect();
  assert.match(all.client.getInstructions(), /read_webpage/);
  assert.match(all.client.getInstructions(), /capture_screenshot/);
  assert.equal(all.client.getServerVersion().name, 'zactonz');
  await all.close();
});

test('returns a lookup as JSON text without structured content', async () => {
  const data = { name: 'zactonz.com', records: { A: [{ address: '67.43.236.62' }] } };
  const { client, calls, close } = await connect({ queue: [ok(data)] });

  const result = await client.callTool({ name: 'lookup_dns', arguments: { name: 'zactonz.com', type: ['A', 'MX'] } });

  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent, undefined);
  assert.deepEqual(JSON.parse(text(result)), data);
  assert.equal(calls[0].url, 'https://api.zactonz.com/domain/dns/?name=zactonz.com&type=A%2CMX');
  await close();
});

test('returns a page as Markdown, flagged as third-party text, with details after', async () => {
  const data = {
    url: 'https://example.com/',
    title: 'Example',
    markdown: '# Example\n\nBody text.',
    word_count: 3,
    truncated: false,
  };
  const { client, calls, close } = await connect({ queue: [ok(data)] });

  const result = await client.callTool({ name: 'read_webpage', arguments: { url: 'https://example.com/' } });

  assert.match(text(result, 0), /written by a third party/);
  assert.equal(text(result, 1), '# Example\n\nBody text.');
  assert.deepEqual(JSON.parse(text(result, 2)), {
    url: 'https://example.com/',
    title: 'Example',
    word_count: 3,
    truncated: false,
  });
  assert.equal(
    calls[0].url,
    'https://api.zactonz.com/markdown/?max_chars=20000&url=https%3A%2F%2Fexample.com%2F&format=json',
  );
  await close();
});

test('lets the caller override a default but not a fixed argument', async () => {
  const { client, calls, close } = await connect({ queue: [ok({ markdown: 'x' })] });

  await client.callTool({ name: 'read_webpage', arguments: { url: 'https://example.com/', max_chars: 5000 } });
  const refused = await client.callTool({
    name: 'read_webpage',
    arguments: { url: 'https://example.com/', format: 'text' },
  });

  assert.match(calls[0].url, /max_chars=5000/);
  assert.match(calls[0].url, /format=json/);
  assert.equal(refused.isError, true);
  assert.match(text(refused), /Unknown argument: format/);
  assert.equal(calls.length, 1);
  await close();
});

test('returns a screenshot as a link plus the image', async () => {
  const { client, calls, close } = await connect({
    queue: [
      json({ status: '200', width: 1280, height: 1024, data: 'https://api.zactonz.com/screen/url/s/abc.png' }),
      png(),
    ],
  });

  const result = await client.callTool({
    name: 'capture_screenshot',
    arguments: { url: 'https://zactonz.com', width: 1280 },
  });

  assert.deepEqual(JSON.parse(text(result)), {
    url: 'https://api.zactonz.com/screen/url/s/abc.png',
    width: 1280,
    height: 1024,
  });
  assert.deepEqual(result.content[1], {
    type: 'image',
    data: Buffer.from('PNGDATA').toString('base64'),
    mimeType: 'image/png',
  });
  assert.equal(calls[0].body, 'quality=80&url=https%3A%2F%2Fzactonz.com&width=1280');
  assert.equal(calls[1].url, 'https://api.zactonz.com/screen/url/s/abc.png');
  assert.equal(calls[1].headers.Authorization, undefined);
  await close();
});

test('returns only the link when the image is too large, disabled or not an image', async () => {
  const qr = json({ status: 200, data: { qr: 'https://api.zactonz.com/qr/enc/i/a.png', size: 4 } });

  const large = await connect({ inlineImageBytes: 4, queue: [qr.clone(), png()] });
  assert.equal(
    (await large.client.callTool({ name: 'generate_qr_code', arguments: { content: 'hello' } })).content.length,
    1,
  );
  await large.close();

  const disabled = await connect({ inlineImageBytes: 0, queue: [qr.clone()] });
  assert.equal(
    (await disabled.client.callTool({ name: 'generate_qr_code', arguments: { content: 'hello' } })).content.length,
    1,
  );
  assert.equal(disabled.calls.length, 1);
  await disabled.close();

  const pdf = await connect({
    queue: [
      json({ status: '200', data: 'https://api.zactonz.com/screen/html/s/a.pdf' }),
      new Response('%PDF', { status: 200, headers: { 'content-type': 'application/pdf' } }),
    ],
  });
  assert.equal(
    (await pdf.client.callTool({ name: 'render_html', arguments: { html: '<h1>Hi</h1>', format: 'pdf' } })).content
      .length,
    1,
  );
  await pdf.close();
});

test('does not fetch an image link that points at another host', async () => {
  const { client, calls, close } = await connect({ queue: [ok({ image: 'https://elsewhere.example/card.png' })] });

  const result = await client.callTool({ name: 'generate_social_image', arguments: { title: 'Hello' } });

  assert.equal(result.content.length, 1);
  assert.equal(calls.length, 1);
  await close();
});

test('wraps a single-value reply and passes through a reply without a data field', async () => {
  const { client, close } = await connect({
    queue: [
      ok('https://drive.usercontent.google.com/download?id=abc'),
      json({ status: '200', message: null, mails: { 'a@b.co': 'valid' }, ttr: 1.2 }),
    ],
  });

  const drive = await client.callTool({
    name: 'get_drive_download_link',
    arguments: { url: 'https://drive.google.com/file/d/abc/view' },
  });
  const mail = await client.callTool({ name: 'verify_emails', arguments: { emails: ['a@b.co'] } });

  assert.deepEqual(JSON.parse(text(drive)), { direct_link: 'https://drive.usercontent.google.com/download?id=abc' });
  assert.deepEqual(JSON.parse(text(mail)), { message: null, mails: { 'a@b.co': 'valid' }, ttr: 1.2 });
  await close();
});

test('rejects invalid arguments before sending anything', async () => {
  const { client, calls, close } = await connect();
  const call = async (name, args) => text(await client.callTool({ name, arguments: args }));

  assert.match(await call('lookup_dns', {}), /Missing required argument: name/);
  assert.match(await call('translate_text', { text: 'hi' }), /Missing required argument: to/);
  assert.match(await call('generate_qr_code', { content: 'x', size: 'big' }), /size must be an integer/);
  assert.match(await call('generate_qr_code', { content: 'x', size: 2.5 }), /size must be an integer/);
  assert.match(await call('generate_qr_code', { content: 'x', size: 9999 }), /size must be <= 20/);
  assert.match(
    await call('generate_qr_code', { content: 'x', format: 'bmp' }),
    /format must be one of: png, jpg, svg, text/,
  );
  assert.match(await call('preview_link', { url: 'https://a.b', render: 1 }), /render must be a boolean/);
  assert.match(await call('verify_emails', { emails: 'a@b.co' }), /emails must be an array/);
  assert.match(await call('verify_emails', { emails: ['a@b.co'], key: 'stolen' }), /Unknown argument: key/);
  assert.match(await call('lookup_dns', { name: 'a.b', toString: 'x' }), /Unknown argument: toString/);
  assert.equal(calls.length, 0);
  await close();
});

test('reports an unknown tool as a protocol error', async () => {
  const { client, close } = await connect();

  await assert.rejects(client.callTool({ name: 'no_such_tool', arguments: {} }), /Unknown tool: no_such_tool/);
  await close();
});

test('explains how to add a key when the tool has none', async () => {
  const { client, calls, close } = await connect({ keys: 'zk_domain_abc' });

  const result = await client.callTool({ name: 'capture_screenshot', arguments: { url: 'https://zactonz.com' } });

  assert.equal(result.isError, true);
  assert.match(text(result), /"screen" product.*ZACTONZ_API_KEYS/s);
  assert.equal(calls.length, 0);
  await close();
});

test('returns API failures as tool errors with status, wait and request id', async () => {
  const { client, close } = await connect({
    queue: [
      json({ status: 400, message: 'The content cannot be encoded as ean13: the check digit is wrong' }, 400, {
        'x-request-id': 'abc',
      }),
      json({ status: 401, message: 'Missing or invalid API key' }, 401),
      json({ status: 429, message: 'Quota exceeded for this plan' }, 429, { 'retry-after': '3600' }),
    ],
  });
  const call = () => client.callTool({ name: 'generate_barcode', arguments: { content: 'x' } });

  const invalid = await call();
  assert.equal(invalid.isError, true);
  assert.equal(
    text(invalid),
    'The content cannot be encoded as ean13: the check digit is wrong Status 400. Request id abc.',
  );
  assert.match(text(await call()), /Check the key in ZACTONZ_API_KEYS/);
  assert.match(text(await call()), /Quota exceeded for this plan Status 429\. Wait 3600 seconds before trying again\./);
  await close();
});

test('check_api_key reports the plan and quota of a configured key', async () => {
  const data = { key: { product: 'qr', state: 'active' }, plan: { slug: 'free' }, quota: { day: { remaining: 480 } } };
  const { client, calls, close } = await connect({ queue: [ok(data)] });

  const result = await client.callTool({ name: 'check_api_key', arguments: { product: 'qr' } });
  const unknown = await client.callTool({ name: 'check_api_key', arguments: { product: 'nope' } });

  assert.deepEqual(JSON.parse(text(result)), data);
  assert.equal(calls[0].url, 'https://api.zactonz.com/auth/me/');
  assert.equal(calls[0].headers.Authorization, 'Bearer zk_qr_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(unknown.isError, true);
  await close();
});
