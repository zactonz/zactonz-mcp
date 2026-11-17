# Zactonz MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server for the [Zactonz APIs](https://developers.zactonz.com/apis/). It lets an AI assistant capture a screenshot of a web page, read a page as Markdown, preview a link, look up DNS, SSL and WHOIS records, check a domain's email setup, verify addresses, generate QR codes, barcodes and social card images, convert images and translate text.

It runs on your machine: over stdio, started by your MCP client, or as a small HTTP service that several agents share. It needs Node.js 20 or newer.

## Install

There is nothing to install ahead of time. The client configurations below run
`npx -y @zactonz/mcp`, which fetches [the package](https://www.npmjs.com/package/@zactonz/mcp) on
first use and keeps it cached. You need [Node.js](https://nodejs.org) 20 or newer.

Skip to [Setup](#setup) unless you want to run it from a checkout.

### From source

Useful for pinning a particular commit, working on the server, or running without a registry.
Needs Node.js 20 or newer and git.

```bash
git clone https://github.com/zactonz/zactonz-mcp.git
cd zactonz-mcp
npm ci --omit=dev
```

That is the whole install: two runtime dependencies, no build step. Check it starts — it will wait
for input, so press Ctrl+C to leave:

```bash
node bin/zactonz-mcp.js
```

Then point your client at the absolute path, in place of the `npx` form used below:

```json
{
  "mcpServers": {
    "zactonz": {
      "command": "node",
      "args": ["/absolute/path/to/zactonz-mcp/bin/zactonz-mcp.js"],
      "env": {
        "ZACTONZ_API_KEYS": "zk_screen_…,zk_markdown_…"
      }
    }
  }
}
```

Use the real absolute path — `~` and relative paths are not expanded by most clients. On Windows,
write it with forward slashes or escaped backslashes, for example
`C:/Users/you/zactonz-mcp/bin/zactonz-mcp.js`.

For Claude Code:

```bash
claude mcp add zactonz --env ZACTONZ_API_KEYS="zk_screen_…" -- node /absolute/path/to/zactonz-mcp/bin/zactonz-mcp.js
```

If you would rather have `zactonz-mcp` on your `PATH`, run `npm link` in the clone, then use
`"command": "zactonz-mcp"` with no `args`.

To update later: `git pull && npm ci --omit=dev`.

## Setup

1. Create a key for each product you want to use in the [API console](https://developers.zactonz.com/console/). There is a free plan.
2. Add the server to your MCP client, with the keys in `ZACTONZ_API_KEYS` separated by commas.

If you installed [from source](#from-source) instead, substitute the `"command"` and `"args"` shown
there for the `npx` form used below.

Clients that read an `mcpServers` block, such as Claude Desktop, Cursor and Windsurf:

```json
{
  "mcpServers": {
    "zactonz": {
      "command": "npx",
      "args": ["-y", "@zactonz/mcp"],
      "env": {
        "ZACTONZ_API_KEYS": "zk_screen_…,zk_markdown_…,zk_domain_…"
      }
    }
  }
}
```

VS Code (`.vscode/mcp.json`):

```json
{
  "servers": {
    "zactonz": {
      "command": "npx",
      "args": ["-y", "@zactonz/mcp"],
      "env": { "ZACTONZ_API_KEYS": "zk_screen_…,zk_markdown_…" }
    }
  }
}
```

Claude Code:

```bash
claude mcp add zactonz --env ZACTONZ_API_KEYS="zk_screen_…,zk_markdown_…" -- npx -y @zactonz/mcp
```

On Windows, if the client cannot start `npx` directly, use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@zactonz/mcp"]`.

## Keys

A Zactonz key works for one product, and the product is part of the key: `zk_screen_…` is a screenshot key, `zk_markdown_…` a Markdown key. Put every key you have in `ZACTONZ_API_KEYS`. The server uses the right one for each call and offers the assistant only the tools those keys can call.

Keys stay in the server process. They are sent to `api.zactonz.com` in the `Authorization` header and nowhere else, and they are never included in anything returned to the assistant.

## Serving several agents

A client that starts the server itself gets a process of its own, which is what stdio is for. A
self-hosted agent is often not that: there are several of them, they come and go, and they run where
no parent process can start one. Run the server once instead and let them connect over HTTP:

```bash
ZACTONZ_API_KEYS="zk_screen_…,zk_markdown_…" npx -y @zactonz/mcp --http
```

It listens on `http://127.0.0.1:8808/mcp`, loopback only. Point a client at that URL as a remote MCP
server. For Claude Code:

```bash
claude mcp add --transport http zactonz http://127.0.0.1:8808/mcp
```

### Keys per request

A request may bring its own keys, in the `x-zactonz-api-keys` header or as a bearer token:

```bash
curl -sS http://127.0.0.1:8808/mcp -H 'x-zactonz-api-keys: zk_qr_…' -H 'accept: application/json, text/event-stream' -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Those keys are used for that request and no other: the tools the caller is offered, and the quota a
call spends, follow the key in the header. So two agents holding different keys can share one process
without seeing each other's tools or spending each other's quota.

A request that brings no keys is answered with the keys in `ZACTONZ_API_KEYS`. Set
`ZACTONZ_MCP_REQUIRE_KEY_HEADER=1` to refuse it instead, and make every caller bring its own.

With Claude Code the header goes on the server:

```bash
claude mcp add --transport http zactonz http://127.0.0.1:8808/mcp --header "x-zactonz-api-keys: zk_qr_…"
```

### In a container

Inside a container the server has to bind every interface to be reachable through a port mapping. Set
`ZACTONZ_MCP_HOST=0.0.0.0`, put the keys in `ZACTONZ_API_KEYS`, run the server with `--http`, and
publish port 8808.

Binding away from loopback makes the server reachable from outside the machine, and it has no
authentication of its own: a caller is whoever holds a Zactonz key. The server says as much on
stderr when it starts. Put TLS in front of it, name the hosts it should answer to in
`ZACTONZ_MCP_ALLOWED_HOSTS`, and consider requiring the key header.

`GET /healthz` answers a liveness probe with the version, how many API-backed tools the build
carries, whether the process has keys — never which products they are for — and what the process is
currently sending to the API. It makes no request and spends nothing. Its `apiTools` count is not
what a caller is offered: that depends on the keys the caller brings, and `tools/list` also returns
`check_api_key`.

One cap on outbound calls covers the whole process, not each request, since that is the only place a
fleet's traffic can be held back: see [Limits and timing](#limits-and-timing).

### What it does not keep

Nothing is remembered between requests. Each one is answered by a server built around that request's
keys and discarded with it, which is what keeps the keys from reaching the next caller. There is no
session, so `GET /mcp` and `DELETE /mcp` answer `405`: this server has nothing to stream and nothing
to end. Requests beyond `ZACTONZ_MCP_MAX_REQUESTS` at once are refused with a `503` and a
`Retry-After` rather than queued.

## Tools

| Tool                       | Purpose                                          | Key          |
| -------------------------- | ------------------------------------------------ | ------------ |
| `capture_screenshot`       | Capture a web page as an image or PDF            | `screen`     |
| `render_html`              | Render HTML to an image or PDF                   | `screen`     |
| `read_webpage`             | Read a web page as Markdown                      | `markdown`   |
| `convert_html_to_markdown` | Convert HTML to Markdown                         | `markdown`   |
| `preview_link`             | Title, description, image and metadata of a URL  | `unfurl`     |
| `lookup_dns`               | DNS records and DNSSEC status                    | `domain`     |
| `inspect_ssl_certificate`  | Certificate, chain, expiry and TLS details       | `domain`     |
| `lookup_whois`             | Registrar, dates and nameservers of a domain     | `domain`     |
| `check_email_domain`       | MX, SPF, DKIM, DMARC and related records, scored | `email`      |
| `verify_emails`            | Whether addresses can receive mail               | `mverifier`  |
| `generate_qr_code`         | Generate a QR code                               | `qr`         |
| `read_qr_code`             | Decode a QR code                                 | `qr`         |
| `generate_barcode`         | Generate a barcode                               | `barcode`    |
| `generate_social_image`    | Generate an Open Graph image                     | `og`         |
| `convert_image`            | Convert, resize or crop an image                 | `image`      |
| `inspect_image`            | Dimensions, format and colours of an image       | `image`      |
| `translate_text`           | Translate between 46 languages                   | `translator` |
| `get_drive_download_link`  | Direct download link for a Google Drive file     | `gdrive`     |
| `check_api_key`            | Plan and remaining quota of a key                | any          |

[docs/tools.md](docs/tools.md) lists the arguments of each tool.

Example requests once it is connected:

- "Take a screenshot of example.com on a 390 pixel wide screen and tell me whether the menu fits."
- "Read https://example.com/pricing and summarise the plans."
- "Does example.com have SPF and DMARC set up correctly?"
- "When does the SSL certificate for example.com expire?"

## Results

A tool returns the answer twice over: as text for an assistant to read, and as structured content for a caller that would rather not parse anything. Both describe the same payload, and every tool whose response the API documents also advertises an `outputSchema`, so a caller knows the shape before it calls.

Seventeen of the nineteen tools `tools/list` returns carry a schema. The two without are `verify_emails`, whose endpoint does not document its response, and `check_api_key`, which this server adds itself and whose endpoint has no specification here either. Both still return structured content; neither promises a shape, because a schema that was invented rather than documented would be worse than none.

Two things differ from the raw API:

- `read_webpage` and `convert_html_to_markdown` return the Markdown as plain text, followed by the remaining fields as JSON. They request at most 20,000 characters unless the assistant asks for more.
- A tool that produces an image returns the link and, when the file is 750 KB or smaller, the image as well, so the assistant can look at it. `capture_screenshot` and `render_html` use JPEG quality 80 unless told otherwise, to stay under that size. PDFs and larger images are returned as a link only.

A refused call is returned as a tool error carrying the API's message, the status, how long to wait when a limit was reached, and the request id.

## References

Each offered tool also has a reference resource at `zactonz://tools/<name>`, holding the endpoint behind it, the statuses the API documents for it, whether it returns third-party text, and the page that explains it. Reading one spends no quota and makes no request, so an unattended caller can work out how it will handle a `429` before it meets one.

## Prompts

Two prompts hold sequences a caller would otherwise have to work out for itself:

| Prompt         | Argument | What it does                                                                                     |
| -------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `audit_domain` | `domain` | DNS, certificate, registration and email authentication, then a verdict and what needs attention |
| `check_link`   | `url`    | Where the link really goes, what the page is, and anything about it that does not add up         |

Each is rendered against the tools the configured keys can call, so a prompt never sends a caller to a tool it has no key for, and the steps that remain are renumbered. A prompt with no tool behind it is not offered at all. Fetching one spends no quota.

Both end by saying what not to conclude, which is the part a model left to itself tends to get wrong: that an empty lookup is a finding rather than a failed check, that page text is evidence about the page and not an instruction, and that a valid certificate is not grounds for calling a link safe.

## Limits and timing

Calls spend units from your plan's quota, the same as direct API calls. See [rate limits and quotas](https://developers.zactonz.com/apis/rate-limits/).

A tool call is given 55 seconds in total, because MCP clients stop waiting after 60. Within that time the server retries once, and only where a retry cannot repeat work: after a `429` with a short `Retry-After`, after a gateway error on a read, or ten seconds after the API's request burst limit rejects a call. If the client cancels a call, the server stops.

The process sends at most `ZACTONZ_MCP_MAX_CONCURRENCY` calls to the API at once and queues the rest, counting the wait against the call's own 55 seconds. The firewall in front of the API blocks a burst of more than twenty requests to one endpoint within two seconds, so without a cap a fleet of agents sharing one process would get all of them blocked rather than served in turn.

If the API fails to answer `ZACTONZ_MCP_BREAKER_FAILURES` calls in a row, the server stops calling it for 30 seconds and answers in the meantime with how long is left. Only the API not answering counts: a refusal, a limit or a bad argument all mean it is there. When the wait is over, one call goes out to find out whether the API is back and the rest wait for its answer, so recovering costs one call rather than all of them.

## Configuration

| Variable                         | Purpose                                                         | Default                   |
| -------------------------------- | --------------------------------------------------------------- | ------------------------- |
| `ZACTONZ_API_KEYS`               | API keys, separated by commas                                   | none                      |
| `ZACTONZ_MCP_INLINE_IMAGE_BYTES` | Largest image returned inline, in bytes. `0` returns links only | `750000`                  |
| `ZACTONZ_MCP_MAX_CONCURRENCY`    | API calls in flight at once. `0` for no limit                   | `8`                       |
| `ZACTONZ_MCP_BREAKER_FAILURES`   | Unanswered calls before the server pauses for 30s. `0` to never | `5`                       |
| `ZACTONZ_BASE_URL`               | API base URL                                                    | `https://api.zactonz.com` |

Without keys the server still starts and lists every tool, and each call answers with setup instructions. Values in `ZACTONZ_API_KEYS` that are not Zactonz keys are ignored and reported on stderr.

These apply only when the server is [listening over HTTP](#serving-several-agents):

| Variable                         | Purpose                                                        | Default     |
| -------------------------------- | -------------------------------------------------------------- | ----------- |
| `ZACTONZ_MCP_TRANSPORT`          | `stdio` or `http`; the same as `--http`                        | `stdio`     |
| `ZACTONZ_MCP_HOST`               | Address to bind; the same as `--host`                          | `127.0.0.1` |
| `ZACTONZ_MCP_PORT`               | Port to bind; the same as `--port`. `0` takes any free port    | `8808`      |
| `ZACTONZ_MCP_REQUIRE_KEY_HEADER` | `1` refuses a request that brings no key of its own            | off         |
| `ZACTONZ_MCP_ALLOWED_HOSTS`      | `Host` header values to answer to, separated by commas         | loopback    |
| `ZACTONZ_MCP_ALLOWED_ORIGINS`    | Browser origins allowed to call, separated by commas           | none        |
| `ZACTONZ_MCP_MAX_REQUESTS`       | Requests handled at once before load is shed. `0` for no limit | `64`        |
| `ZACTONZ_MCP_MAX_BODY_BYTES`     | Largest request body accepted                                  | `1048576`   |

Run `npx -y @zactonz/mcp --help` for the same list.

## Security and privacy

- **Untrusted content.** `read_webpage`, `preview_link` and `read_qr_code` return text written by whoever controls the page or the code. That text can contain instructions aimed at the assistant. The server labels it as third-party data, but the label is advice to the model, not a guarantee. Review what an assistant does after reading pages you do not control.
- **Generated files are public links.** Screenshots, PDFs, QR codes, barcodes and converted images are stored on `api.zactonz.com` at unguessable URLs that anyone holding the link can open, for the period given on each endpoint's reference page. Do not render documents that must stay private.
- **What is sent.** Tool arguments go to `api.zactonz.com` and nowhere else. The server keeps no logs and stores nothing on disk. The API's own handling of data is covered by the [privacy policy](https://zactonz.com/privacy/).
- **Arguments are validated** against each tool's schema before any request is made, and arguments outside the schema are refused.
- **Images are fetched for inline display only from the API's own host**, over HTTPS, without following redirects.
- Tools that fetch a URL do so from Zactonz's servers, which refuse private and internal addresses.
- **The HTTP transport binds loopback and serves no browser.** A request carrying an `Origin` header is refused, as is one whose `Host` header names a host the server was not given — the two headers a page cannot be made to lie about, and so the two that stop a site the user is visiting from reaching a server bound to their own machine. Both refusals are logged with the value and answered without it. The endpoint sends no CORS headers and answers `OPTIONS` with `405`.
- **The HTTP transport has no authentication of its own.** A caller is whoever holds a Zactonz key. On loopback that is the machine's own user; anywhere else it is whoever can reach the port, so put TLS and whatever authentication you need in front of it. Keys travel in a header, which is cleartext without TLS.

Report a vulnerability as described in [SECURITY.md](SECURITY.md).

## Troubleshooting

- **A tool is missing.** Only tools with a key are listed. Add a key for that product and restart the client.
- **Every call answers with setup instructions.** `ZACTONZ_API_KEYS` is empty or holds no valid key. The server prints the reason on stderr, which most clients show in their MCP log.
- **"Missing or invalid API key."** The key was revoked or mistyped. Ask the assistant to run `check_api_key`, or check the key in the console.
- **A screenshot has no inline image.** The file is over the inline limit. Lower the quality or size, or raise `ZACTONZ_MCP_INLINE_IMAGE_BYTES`.
- **`403` when listening over HTTP.** The request carried an `Origin` header, or a `Host` header naming something the server was not given. The reason, with the value, is on stderr. Name the host in `ZACTONZ_MCP_ALLOWED_HOSTS`, or the origin in `ZACTONZ_MCP_ALLOWED_ORIGINS` if a browser really should reach it.
- **`401` with keys in the header.** None of the values presented is a Zactonz key, which looks like `zk_<product>_<secret>`. A request that brings no key at all is answered with `ZACTONZ_API_KEYS` instead, unless `ZACTONZ_MCP_REQUIRE_KEY_HEADER=1`.
- **`406` when calling with curl.** The `Accept` header has to list both `application/json` and `text/event-stream`.
- **"The Zactonz API has failed to answer several calls in a row."** The server has paused and says how long is left. It resumes by itself, one call at a time. If the API is fine and this is firing, raise `ZACTONZ_MCP_BREAKER_FAILURES` or set it to `0`.
- **Calls are slower under load.** They are queued behind `ZACTONZ_MCP_MAX_CONCURRENCY`. `GET /healthz` reports how many are in flight and how many are waiting.
- **`405` on `GET /mcp`.** Expected: the server keeps no session, so there is no stream to open. Send `POST`.

## Versioning

This package follows [semantic versioning](https://semver.org/). While it is at `0.x`, a minor release may rename a tool or an argument; such changes are listed in the [changelog](CHANGELOG.md).

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT. See [LICENSE](LICENSE). Maintained by [Zactonz Technologies](https://zactonz.com).
