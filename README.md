# Zactonz MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server for the [Zactonz APIs](https://developers.zactonz.com/apis/). It lets an AI assistant capture a screenshot of a web page, read a page as Markdown, preview a link, look up DNS, SSL and WHOIS records, check a domain's email setup, verify addresses, generate QR codes, barcodes and social card images, convert images and translate text.

It runs on your machine over stdio and needs Node.js 18 or newer.

## Install

There is nothing to install ahead of time. The client configurations below run
`npx -y @zactonz/mcp`, which fetches [the package](https://www.npmjs.com/package/@zactonz/mcp) on
first use and keeps it cached. You need [Node.js](https://nodejs.org) 18 or newer.

Skip to [Setup](#setup) unless you want to run it from a checkout.

### From source

Useful for pinning a particular commit, working on the server, or running without a registry.
Needs Node.js 18 or newer and git.

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

A tool returns JSON text. Two things differ from the raw API:

- `read_webpage` and `convert_html_to_markdown` return the Markdown as plain text, followed by the remaining fields as JSON. They request at most 20,000 characters unless the assistant asks for more.
- A tool that produces an image returns the link and, when the file is 750 KB or smaller, the image as well, so the assistant can look at it. `capture_screenshot` and `render_html` use JPEG quality 80 unless told otherwise, to stay under that size. PDFs and larger images are returned as a link only.

A refused call is returned as a tool error carrying the API's message, the status, how long to wait when a limit was reached, and the request id.

## Limits and timing

Calls spend units from your plan's quota, the same as direct API calls. See [rate limits and quotas](https://developers.zactonz.com/apis/rate-limits/).

A tool call is given 55 seconds in total, because MCP clients stop waiting after 60. Within that time the server retries once, and only where a retry cannot repeat work: after a `429` with a short `Retry-After`, after a gateway error on a read, or ten seconds after the API's request burst limit rejects a call. If the client cancels a call, the server stops.

## Configuration

| Variable                         | Purpose                                                         | Default                   |
| -------------------------------- | --------------------------------------------------------------- | ------------------------- |
| `ZACTONZ_API_KEYS`               | API keys, separated by commas                                   | none                      |
| `ZACTONZ_MCP_INLINE_IMAGE_BYTES` | Largest image returned inline, in bytes. `0` returns links only | `750000`                  |
| `ZACTONZ_BASE_URL`               | API base URL                                                    | `https://api.zactonz.com` |

Without keys the server still starts and lists every tool, and each call answers with setup instructions. Values in `ZACTONZ_API_KEYS` that are not Zactonz keys are ignored and reported on stderr.

## Security and privacy

- **Untrusted content.** `read_webpage`, `preview_link` and `read_qr_code` return text written by whoever controls the page or the code. That text can contain instructions aimed at the assistant. The server labels it as third-party data, but the label is advice to the model, not a guarantee. Review what an assistant does after reading pages you do not control.
- **Generated files are public links.** Screenshots, PDFs, QR codes, barcodes and converted images are stored on `api.zactonz.com` at unguessable URLs that anyone holding the link can open, for the period given on each endpoint's reference page. Do not render documents that must stay private.
- **What is sent.** Tool arguments go to `api.zactonz.com` and nowhere else. The server keeps no logs and stores nothing on disk. The API's own handling of data is covered by the [privacy policy](https://zactonz.com/privacy/).
- **Arguments are validated** against each tool's schema before any request is made, and arguments outside the schema are refused.
- **Images are fetched for inline display only from the API's own host**, over HTTPS, without following redirects.
- Tools that fetch a URL do so from Zactonz's servers, which refuse private and internal addresses.

Report a vulnerability as described in [SECURITY.md](SECURITY.md).

## Troubleshooting

- **A tool is missing.** Only tools with a key are listed. Add a key for that product and restart the client.
- **Every call answers with setup instructions.** `ZACTONZ_API_KEYS` is empty or holds no valid key. The server prints the reason on stderr, which most clients show in their MCP log.
- **"Missing or invalid API key."** The key was revoked or mistyped. Ask the assistant to run `check_api_key`, or check the key in the console.
- **A screenshot has no inline image.** The file is over the inline limit. Lower the quality or size, or raise `ZACTONZ_MCP_INLINE_IMAGE_BYTES`.

## Versioning

This package follows [semantic versioning](https://semver.org/). While it is at `0.x`, a minor release may rename a tool or an argument; such changes are listed in the [changelog](CHANGELOG.md).

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT. See [LICENSE](LICENSE). Maintained by [Zactonz Technologies](https://zactonz.com).
