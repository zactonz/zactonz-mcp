# Changelog

## 0.2.0 - 2026-11-17

Built for callers that are programs rather than people: a self-hosted agent reads
data, not prose, has no one to ask when something is unclear, and is rarely the
only one of its kind. So this release answers in data as well as text, explains
each tool for free, and can be run once and shared instead of started per client.

### Added

- A streamable HTTP transport, started with `--http`, so one process can serve a
  fleet of agents instead of one parent process. It binds `127.0.0.1:8808` by
  default and speaks MCP at `/mcp`. Stdio remains the default and is unchanged.
- Keys per request, in the `x-zactonz-api-keys` header or as a bearer token.
  They are used for that request alone: the tools a caller is offered and the
  quota a call spends follow the key in the header, so agents holding different
  keys can share one process. A request that brings none is answered with the
  keys in `ZACTONZ_API_KEYS`, unless `ZACTONZ_MCP_REQUIRE_KEY_HEADER=1`.
- `GET /healthz`, for a container or an orchestrator to probe. It reports the
  version, how many tools there are and how many keys the process holds — never
  which products they are for — and it spends nothing.
- Every tool whose response the API documents now advertises an `outputSchema`,
  generated from the specification, and every call returns `structuredContent`
  alongside the text. Seventeen of the eighteen tools carry a schema;
  `verify_emails` does not, because its response is not specified and a schema
  must not be invented.
- A reference resource per tool at `zactonz://tools/<name>`, carrying the endpoint,
  the statuses the API documents for it, whether it returns third-party text, and
  its documentation page. Reading one makes no request and spends no quota, so a
  caller can learn how to handle a limit before it reaches one. Only tools the
  configured keys can call are listed, for the same reason the tool list is
  filtered.

### Security

- The HTTP transport refuses a request carrying an `Origin` header, and one whose
  `Host` header names a host the server was not given. Those are the two headers
  a page cannot be made to lie about, and so the two that stop a site the user is
  visiting from reaching a server bound to their own machine. Neither value is
  reflected in the answer; both are logged for the operator. No CORS headers are
  sent, and `OPTIONS` is answered with `405`.
- Binding anywhere other than loopback is reported on stderr at startup, with
  what it means: the server has no authentication of its own, and keys travel in
  cleartext without TLS in front of it.
- Requests beyond `ZACTONZ_MCP_MAX_REQUESTS` at once are refused with `503` and a
  `Retry-After` rather than queued, and a body over
  `ZACTONZ_MCP_MAX_BODY_BYTES` is refused rather than read.

### Changed

- `convert_html_to_markdown` is now marked as returning third-party text, as
  `read_webpage` already was. Nothing is fetched by it, so the HTML arrives from
  the caller — but that caller is frequently an agent passing on a page it fetched
  itself, and the fields returned are the same ones `read_webpage` returns.
- A tool result now carries `structuredContent`, where 0.1.0 deliberately returned
  text only. A client that ignored the field is unaffected.

## 0.1.0 - 2026-10-05

First public release.
