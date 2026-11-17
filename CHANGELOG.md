# Changelog

## 0.2.0 - 2026-11-17

Built for callers that are programs rather than people: a self-hosted agent reads
data, not prose, and has no one to ask when something is unclear.

### Added

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

### Changed

- `convert_html_to_markdown` is now marked as returning third-party text, as
  `read_webpage` already was. Nothing is fetched by it, so the HTML arrives from
  the caller — but that caller is frequently an agent passing on a page it fetched
  itself, and the fields returned are the same ones `read_webpage` returns.
- A tool result now carries `structuredContent`, where 0.1.0 deliberately returned
  text only. A client that ignored the field is unaffected.

## 0.1.0 - 2026-10-05

First public release.
