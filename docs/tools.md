# Tools

Every tool the server offers and the arguments each accepts. A tool is offered to the assistant only when a key for its product is configured.

<!-- Generated from specs/ by tools/generate.js. Edits made here are lost the next time it runs. -->

| Tool | Purpose | Key |
|---|---|---|
| `capture_screenshot` | Capture a screenshot of a web page | `screen` |
| `render_html` | Render HTML to an image or PDF | `screen` |
| `read_webpage` | Read a web page as Markdown | `markdown` |
| `convert_html_to_markdown` | Convert HTML to Markdown | `markdown` |
| `preview_link` | Preview a link | `unfurl` |
| `lookup_dns` | Look up DNS records | `domain` |
| `inspect_ssl_certificate` | Inspect an SSL certificate | `domain` |
| `lookup_whois` | Look up a domain registration | `domain` |
| `check_email_domain` | Check the email setup of a domain | `email` |
| `verify_emails` | Verify email addresses | `mverifier` |
| `generate_qr_code` | Generate a QR code | `qr` |
| `read_qr_code` | Read a QR code | `qr` |
| `generate_barcode` | Generate a barcode | `barcode` |
| `generate_social_image` | Generate a social card image | `og` |
| `convert_image` | Convert or resize an image | `image` |
| `inspect_image` | Inspect an image | `image` |
| `translate_text` | Translate text | `translator` |
| `get_drive_download_link` | Get a Google Drive download link | `gdrive` |
| `check_api_key` | Check the plan and remaining quota of a key | any |

## capture_screenshot

Loads a public web page in a headless browser and captures it as a JPEG, PNG or WebP image, or as a PDF. Returns a link to the file, and the image itself when it is small enough to look at directly. Suited to checking how a page renders or keeping a visual record of it.

- **Endpoint:** `POST /screen/url/`
- **Key:** `screen`
- **Full reference:** https://developers.zactonz.com/apis/screenshot-url/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | string | yes |  | Absolute URL of the page to capture. |
| `width` | integer | no | `1280` | Viewport width in pixels, 200 to 3840. Values outside the range are clamped. Default 1280. |
| `height` | integer | no | `1024` | Viewport height in pixels, 150 to 4320. Values outside the range are clamped. Default 1024. |
| `format` | string | no | `jpeg` | Output type. `jpeg` (default), `png`, `webp`, or `pdf` for a paged document. One of `jpeg`, `png`, `webp`, `pdf`. |
| `quality` | integer | no | `80` | JPEG quality from 1 to 100. Sent as 80 when omitted, which keeps most captures small enough to be returned inline. Ignored for other formats. |
| `delay` | integer | no | `5` | Seconds to wait after the page has loaded before capturing, 0 to 15. Default 5. |
| `orientation` | string | no | `portrait` | PDF only. One of `portrait`, `landscape`. |
| `paperWidth` | number | no | `6` | PDF only. Paper width in inches. |
| `paperHeight` | number | no | `6` | PDF only. Paper height in inches. |
| `marginTop` | number | no | `0.4` | PDF only. Top margin in inches, 0 to 5. Default 0.4. |
| `scale` | number | no | `1` | PDF only. Render scale. |
| `marginBottom` | number | no |  | PDF only. Bottom margin in inches, 0 to 5. Default 0.4. |
| `marginLeft` | number | no |  | PDF only. Left margin in inches, 0 to 5. Default 0.4. |
| `marginRight` | number | no |  | PDF only. Right margin in inches, 0 to 5. Default 0.4. |

## render_html

Renders an HTML document you provide as a JPEG, PNG or WebP image, or as a PDF: an invoice, a report, a certificate. Returns a link to the file, and the image itself when it is small enough. Images, fonts and stylesheets referenced by the HTML must use absolute URLs.

- **Endpoint:** `POST /screen/html/`
- **Key:** `screen`
- **Full reference:** https://developers.zactonz.com/apis/screenshot-html/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `html` | string | yes |  | The HTML document to render, up to 2 MB. |
| `width` | integer | no | `1280` | Viewport width in pixels, 200 to 3840. Values outside the range are clamped. Default 1280. |
| `height` | integer | no | `1024` | Viewport height in pixels, 150 to 4320. Values outside the range are clamped. Default 1024. |
| `format` | string | no | `jpeg` | Output type. `jpeg` (default), `png`, `webp`, or `pdf` for a paged document. One of `jpeg`, `png`, `webp`, `pdf`. |
| `quality` | integer | no | `80` | JPEG quality from 1 to 100. Sent as 80 when omitted, which keeps most captures small enough to be returned inline. Ignored for other formats. |

## read_webpage

Fetches a public web page and returns its main content as Markdown, without navigation, adverts or scripts. For pages that build their content with JavaScript, set render to true.

- **Endpoint:** `GET /markdown/`
- **Key:** `markdown`
- **Full reference:** https://developers.zactonz.com/apis/markdown/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | string | yes |  | The page to read. |
| `mode` | string | no | `article` | `article` (default) keeps the main content. `full` converts the whole body. One of `article`, `full`. |
| `render` | boolean | no | `false` | When true, loads the page in a headless browser first. |
| `images` | boolean | no | `true` | When false, drops images from the output. |
| `links` | boolean | no | `true` | When false, replaces links with their text. |
| `max_chars` | integer | no | `20000` | Longest Markdown to return, in characters, from 1000 to 500000. Sent as 20000 when omitted. The reply says whether the text was cut short. |
| `fresh` | boolean | no | `false` | When true, bypasses the cache. |

## convert_html_to_markdown

Converts HTML you already hold to Markdown. Nothing is fetched.

- **Endpoint:** `POST /markdown/`
- **Key:** `markdown`
- **Full reference:** https://developers.zactonz.com/apis/markdown/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `html` | string | yes |  | The HTML to convert, up to 2 MB. |
| `mode` | string | no | `article` | `article` (default) keeps the main content. `full` converts the whole body. One of `article`, `full`. |
| `images` | boolean | no | `true` | When false, drops images from the output. |
| `links` | boolean | no | `true` | When false, replaces links with their text. |
| `max_chars` | integer | no | `20000` | Longest Markdown to return, in characters, from 1000 to 500000. Sent as 20000 when omitted. |

## preview_link

Reads the metadata of a public URL: title, description, preview image, favicon, site name, author, publication date, language and feeds. A quick way to learn what a link points to without reading the page.

- **Endpoint:** `GET /unfurl/`
- **Key:** `unfurl`
- **Full reference:** https://developers.zactonz.com/apis/link-preview/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | string | yes |  | The page to preview. `https://` is assumed when the scheme is omitted. |
| `render` | boolean | no | `false` | When true, loads the page in a headless browser before reading its tags. |
| `verify_image` | boolean | no | `false` | When true, downloads the preview image to confirm it exists and to report its real dimensions and type. |
| `fresh` | boolean | no | `false` | When true, bypasses the one-hour cache. |

## lookup_dns

Returns the DNS records of a host or domain (A, AAAA, MX, TXT, NS, CNAME, SOA, CAA, SRV) and its DNSSEC status.

- **Endpoint:** `GET /domain/dns/`
- **Key:** `domain`
- **Full reference:** https://developers.zactonz.com/apis/domain-dns/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | yes |  | Host or domain name. |
| `type` | array of strings | no |  | Record types to look up. Omit for A, AAAA, MX, TXT, NS, CNAME, SOA and CAA. |

## inspect_ssl_certificate

Connects to a host and reports its TLS certificate: issuer, subject, validity dates, days remaining, whether the chain is trusted and the name matches, and the protocol and cipher in use.

- **Endpoint:** `GET /domain/ssl/`
- **Key:** `domain`
- **Full reference:** https://developers.zactonz.com/apis/domain-ssl/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `host` | string | yes |  | Host name, or a URL from which the host is taken. |
| `port` | integer | no | `443` | TLS port: 443, 8443, 465, 993, 995, 636 or 5061. One of `443`, `8443`, `465`, `993`, `995`, `636`, `5061`. |
| `fresh` | boolean | no | `false` | When true, bypasses the cache. |

## lookup_whois

Returns the registration record of a domain from RDAP or WHOIS: registrar, creation, update and expiry dates, status codes, nameservers and abuse contact.

- **Endpoint:** `GET /domain/whois/`
- **Key:** `domain`
- **Full reference:** https://developers.zactonz.com/apis/domain-whois/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `domain` | string | yes |  | Domain name. A host name or URL is reduced to its registrable domain. |
| `raw` | boolean | no | `false` | When true, includes the raw WHOIS text when the fallback service was used. |

## check_email_domain

Audits how a domain is configured for email: MX, SPF, DKIM, DMARC, MTA-STS, TLS-RPT and BIMI records, whether it is a disposable or free mail provider, a score out of 100 and a list of findings.

- **Endpoint:** `GET /email/domain/`
- **Key:** `email`
- **Full reference:** https://developers.zactonz.com/apis/email-domain/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `domain` | string | yes |  | Domain to audit. An email address is accepted and reduced to its domain. |
| `selectors` | array of strings | no |  | DKIM selectors to check in addition to the common ones, up to 20. |
| `probe` | boolean | no | `false` | When true, connects to the primary MX to read its banner and STARTTLS support. |

## verify_emails

Checks whether email addresses can receive mail by asking the receiving mail server, without sending a message. Returns valid or invalid for each address. Can take up to a minute.

- **Endpoint:** `POST /mverifier/`
- **Key:** `mverifier`
- **Full reference:** https://developers.zactonz.com/apis/mail-verifier/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `emails` | array of strings | yes |  | The addresses to check, at most ten. |

## generate_qr_code

Encodes text or a URL as a QR code. Returns a link to the image and the image itself. With the text format it returns the code as rows of 0 and 1 instead.

- **Endpoint:** `GET /qr/enc/`
- **Key:** `qr`
- **Full reference:** https://developers.zactonz.com/apis/qr-encoder/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `content` | string | yes |  | The text or URL to encode, up to 4000 characters. |
| `format` | string | no | `png` | `png` (default), `jpg`, `svg`, or `text` for a 0/1 matrix in JSON. One of `png`, `jpg`, `svg`, `text`. |
| `size` | integer | no | `4` | Pixels per QR module, from `1` to `20`. |
| `accuracy` | string | no | `normal` | Error-correction level. Higher levels survive more damage but produce denser codes. One of `low`, `normal`, `good`, `high`. |
| `padding` | integer | no | `2` | Quiet zone around the code in modules, 0 to 20. Default 2. |
| `color` | string | no | `000000` | Foreground colour as six hex digits, for example `ff6700`, or a decimal RGB integer. Default black. |
| `bgcolor` | string | no | `FFFFFF` | Background colour as six hex digits, for example `ff6700`, or a decimal RGB integer. Default white. |

## read_qr_code

Decodes the QR code in an image and returns the text it holds.

- **Endpoint:** `POST /qr/dec/`
- **Key:** `qr`
- **Full reference:** https://developers.zactonz.com/apis/qr-decoder/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `image` | string | yes |  | A link to the image, or the base64-encoded image bytes when format is `base64`. |
| `format` | string | no | `url` | How `image` is given: `url` for a link, `base64` for the image bytes. One of `url`, `base64`. |

## generate_barcode

Renders a barcode: Code 128, Code 39, Code 93, EAN-13, EAN-8, UPC-A, UPC-E, ITF-14 or Codabar. Returns a link valid for 24 hours, the dimensions and the image itself.

- **Endpoint:** `GET /barcode/`
- **Key:** `barcode`
- **Full reference:** https://developers.zactonz.com/apis/barcode-encoder/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `content` | string | yes |  | The value to encode. Each symbology has its own alphabet and length, listed under the `type` parameter. |
| `type` | string | no | `code128` | `code128` (printable ASCII, up to 80 characters), `code39` (digits, capitals and `- . $ / + %`), `code93`, `ean13` (12 digits, or 13 with the check digit), `ean8` (7 or 8 digits), `upca` (11 or 12 digits), `upce` (6 to 8 digits), `itf14` (13 or 14 digits), `codabar` (a start and stop letter A to D around digits). One of `code128`, `code39`, `code93`, `ean13`, `ean8`, `upca`, `upce`, `itf14`, `codabar`. |
| `format` | string | no | `png` | `png` (default), `svg` or `jpg`. One of `png`, `svg`, `jpg`. |
| `scale` | integer | no | `2` | Width of the narrowest bar in pixels, 1 to 10. |
| `height` | integer | no | `60` | Bar height in pixels, 20 to 300. |
| `color` | string | no | `000000` | Bar colour as six hex digits. |
| `bgcolor` | string | no | `ffffff` | Background colour as six hex digits. |

## generate_social_image

Creates an Open Graph image, the card shown when a link is shared, from a title and an optional subtitle, site label and logo. Returns a link valid for seven days and the image itself.

- **Endpoint:** `GET /og/`
- **Key:** `og`
- **Full reference:** https://developers.zactonz.com/apis/og-image/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string | yes |  | Main text, up to 120 characters. |
| `subtitle` | string | no |  | Secondary line, up to 200 characters. |
| `site` | string | no |  | Short label shown at the bottom, for example your domain, up to 60 characters. |
| `logo` | string | no |  | Public URL of a PNG, JPEG, WebP, GIF or SVG logo, up to 512 KB. |
| `template` | string | no | `card` | `card` (accent bar and logo), `minimal` (centred) or `split` (text beside an accent panel). One of `card`, `minimal`, `split`. |
| `theme` | string | no | `light` | `light` or `dark`. One of `light`, `dark`. |
| `accent` | string | no | `ff6700` | Accent colour as six hex digits. |
| `bg` | string | no |  | Background colour as six hex digits, overriding the theme. |
| `size` | string | no | `1200x630` | Pixel size. One of `1200x630`, `1200x600`, `1080x1080`, `1600x900`. |
| `font` | string | no | `titillium` | `titillium`, `system` or `serif`. One of `titillium`, `system`, `serif`. |
| `format` | string | no | `png` | `png` (default), `jpeg` or `webp`. One of `png`, `jpeg`, `webp`. |

## convert_image

Converts an image at a public URL to WebP, AVIF, JPEG, PNG or GIF, optionally resizing, cropping, rotating, flipping, blurring, sharpening or removing colour. Returns a link valid for 24 hours with the source and output details, and the image itself when it is small enough.

- **Endpoint:** `POST /image/`
- **Key:** `image`
- **Full reference:** https://developers.zactonz.com/apis/image-convert/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | string | yes |  | Public URL of the image to convert. |
| `format` | string | no | `webp` | Output format: `webp` (default), `avif`, `jpeg`, `png`, `gif`, or `keep` to keep the source format. One of `webp`, `avif`, `jpeg`, `png`, `gif`, `keep`. |
| `quality` | integer | no | `82` | 1 to 100 for lossy formats. |
| `width` | integer | no |  | Target width in pixels, up to 8000. Omit to derive from the height. |
| `height` | integer | no |  | Target height in pixels, up to 8000. Omit to derive from the width. |
| `fit` | string | no | `inside` | `inside` (default, shrink to fit, never enlarge), `cover` (fill and crop), `contain` (fit with padding, see `background`) or `fill` (stretch). One of `inside`, `cover`, `contain`, `fill`. |
| `background` | string | no |  | Six hex digits used to flatten transparency and to pad `contain`. JPEG output is flattened on white when unset. |
| `rotate` | integer | no |  | Clockwise degrees, 0 to 359. EXIF orientation is always applied first. |
| `flip` | string | no |  | `h`, `v` or `both`. One of `h`, `v`, `both`. |
| `grayscale` | boolean | no |  | When true, converts to grayscale. |
| `blur` | integer | no |  | Gaussian blur passes, 0 to 20. |
| `sharpen` | boolean | no |  | When true, applies a sharpening kernel. |

## inspect_image

Reports the width, height, format, file size, orientation, transparency and dominant colours of an image at a public URL.

- **Endpoint:** `POST /image/`
- **Key:** `image`
- **Full reference:** https://developers.zactonz.com/apis/image-convert/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | string | yes |  | Public URL of the image to inspect. |

## translate_text

Translates text from one language to another. 46 languages are supported.

- **Endpoint:** `POST /translator/`
- **Key:** `translator`
- **Full reference:** https://developers.zactonz.com/apis/translator/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `text` | string | yes |  | The text to translate. |
| `to` | string | yes |  | Two-letter code of the target language, such as `es`, `fr`, `de`, `ar` or `ur`. |
| `from` | string | no | `en` | Two-letter code of the source language, such as `en`. Defaults to English. |

## get_drive_download_link

Converts a Google Drive share link into a URL that downloads the file directly.

- **Endpoint:** `GET /gdrive/directlink/`
- **Key:** `gdrive`
- **Full reference:** https://developers.zactonz.com/apis/gdrive-direct-link/

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | string | yes |  | The Google Drive share link. |
