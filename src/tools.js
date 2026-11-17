// Generated from specs/ by tools/generate.js. Edits made here are lost the next time it runs.
export default [
  {
    "name": "capture_screenshot",
    "title": "Capture a screenshot of a web page",
    "description": "Loads a public web page in a headless browser and captures it as a JPEG, PNG or WebP image, or as a PDF. Returns a link to the file, and the image itself when it is small enough to look at directly. Suited to checking how a page renders or keeping a visual record of it.",
    "reference": "https://developers.zactonz.com/apis/screenshot-url/",
    "product": "screen",
    "method": "POST",
    "path": "/screen/url/",
    "readOnly": false,
    "untrusted": false,
    "fixed": {},
    "defaults": {
      "quality": 80
    },
    "wrap": "url",
    "image": "url",
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "description": "Absolute URL of the page to capture."
        },
        "width": {
          "type": "integer",
          "description": "Viewport width in pixels, 200 to 3840. Values outside the range are clamped. Default 1280.",
          "minimum": 200,
          "maximum": 3840,
          "default": 1280
        },
        "height": {
          "type": "integer",
          "description": "Viewport height in pixels, 150 to 4320. Values outside the range are clamped. Default 1024.",
          "minimum": 150,
          "maximum": 4320,
          "default": 1024
        },
        "format": {
          "type": "string",
          "description": "Output type. `jpeg` (default), `png`, `webp`, or `pdf` for a paged document.",
          "enum": [
            "jpeg",
            "png",
            "webp",
            "pdf"
          ],
          "default": "jpeg"
        },
        "quality": {
          "type": "integer",
          "description": "JPEG quality from 1 to 100. Sent as 80 when omitted, which keeps most captures small enough to be returned inline. Ignored for other formats.",
          "minimum": 1,
          "maximum": 100,
          "default": 80
        },
        "delay": {
          "type": "integer",
          "description": "Seconds to wait after the page has loaded before capturing, 0 to 15. Default 5.",
          "minimum": 0,
          "maximum": 15,
          "default": 5
        },
        "orientation": {
          "type": "string",
          "description": "PDF only.",
          "enum": [
            "portrait",
            "landscape"
          ],
          "default": "portrait"
        },
        "paperWidth": {
          "type": "number",
          "description": "PDF only. Paper width in inches.",
          "default": 6
        },
        "paperHeight": {
          "type": "number",
          "description": "PDF only. Paper height in inches.",
          "default": 6
        },
        "marginTop": {
          "type": "number",
          "description": "PDF only. Top margin in inches, 0 to 5. Default 0.4.",
          "default": 0.4
        },
        "scale": {
          "type": "number",
          "description": "PDF only. Render scale.",
          "default": 1
        },
        "marginBottom": {
          "type": "number",
          "description": "PDF only. Bottom margin in inches, 0 to 5. Default 0.4."
        },
        "marginLeft": {
          "type": "number",
          "description": "PDF only. Left margin in inches, 0 to 5. Default 0.4."
        },
        "marginRight": {
          "type": "number",
          "description": "PDF only. Right margin in inches, 0 to 5. Default 0.4."
        }
      },
      "required": [
        "url"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": [
            "string",
            "null"
          ],
          "description": "Absolute URL of the saved image or PDF, or an error message."
        }
      },
      "required": [
        "url"
      ]
    },
    "statusCodes": [
      {
        "code": 200,
        "title": "OK",
        "description": "The capture was saved. Note that this endpoint returns `status` as a string."
      },
      {
        "code": 400,
        "title": "Bad request",
        "description": "`url` was missing, or `quality` was `0` for JPEG output."
      },
      {
        "code": "502",
        "title": "Not rendered",
        "description": "The browser could not load or capture the page within the time limit."
      }
    ]
  },
  {
    "name": "render_html",
    "title": "Render HTML to an image or PDF",
    "description": "Renders an HTML document you provide as a JPEG, PNG or WebP image, or as a PDF: an invoice, a report, a certificate. Returns a link to the file, and the image itself when it is small enough. Images, fonts and stylesheets referenced by the HTML must use absolute URLs.",
    "reference": "https://developers.zactonz.com/apis/screenshot-html/",
    "product": "screen",
    "method": "POST",
    "path": "/screen/html/",
    "readOnly": false,
    "untrusted": false,
    "fixed": {},
    "defaults": {
      "quality": 80
    },
    "wrap": "url",
    "image": "url",
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "html": {
          "type": "string",
          "description": "The HTML document to render, up to 2 MB."
        },
        "width": {
          "type": "integer",
          "description": "Viewport width in pixels, 200 to 3840. Values outside the range are clamped. Default 1280.",
          "minimum": 200,
          "maximum": 3840,
          "default": 1280
        },
        "height": {
          "type": "integer",
          "description": "Viewport height in pixels, 150 to 4320. Values outside the range are clamped. Default 1024.",
          "minimum": 150,
          "maximum": 4320,
          "default": 1024
        },
        "format": {
          "type": "string",
          "description": "Output type. `jpeg` (default), `png`, `webp`, or `pdf` for a paged document.",
          "enum": [
            "jpeg",
            "png",
            "webp",
            "pdf"
          ],
          "default": "jpeg"
        },
        "quality": {
          "type": "integer",
          "description": "JPEG quality from 1 to 100. Sent as 80 when omitted, which keeps most captures small enough to be returned inline. Ignored for other formats.",
          "minimum": 1,
          "maximum": 100,
          "default": 80
        }
      },
      "required": [
        "html"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": [
            "string",
            "null"
          ],
          "description": "Absolute URL of the saved image or PDF, or an error message."
        }
      },
      "required": [
        "url"
      ]
    },
    "statusCodes": [
      {
        "code": 200,
        "title": "OK",
        "description": "The capture was saved. Note that this endpoint returns `status` as a string."
      },
      {
        "code": 400,
        "title": "Bad request",
        "description": "`html` was missing, or `quality` was `0` for JPEG output."
      },
      {
        "code": "413",
        "title": "Too large",
        "description": "The HTML body exceeds 2 MB."
      },
      {
        "code": "502",
        "title": "Not rendered",
        "description": "The browser could not load or capture the page within the time limit."
      }
    ]
  },
  {
    "name": "read_webpage",
    "title": "Read a web page as Markdown",
    "description": "Fetches a public web page and returns its main content as Markdown, without navigation, adverts or scripts. For pages that build their content with JavaScript, set render to true.",
    "reference": "https://developers.zactonz.com/apis/markdown/",
    "product": "markdown",
    "method": "GET",
    "path": "/markdown/",
    "readOnly": true,
    "untrusted": true,
    "fixed": {
      "format": "json"
    },
    "defaults": {
      "max_chars": 20000
    },
    "wrap": null,
    "image": null,
    "text": "markdown",
    "inputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "description": "The page to read."
        },
        "mode": {
          "type": "string",
          "description": "`article` (default) keeps the main content. `full` converts the whole body.",
          "enum": [
            "article",
            "full"
          ],
          "default": "article"
        },
        "render": {
          "type": "boolean",
          "description": "When true, loads the page in a headless browser first.",
          "default": false
        },
        "images": {
          "type": "boolean",
          "description": "When false, drops images from the output.",
          "default": true
        },
        "links": {
          "type": "boolean",
          "description": "When false, replaces links with their text.",
          "default": true
        },
        "max_chars": {
          "type": "integer",
          "description": "Longest Markdown to return, in characters, from 1000 to 500000. Sent as 20000 when omitted. The reply says whether the text was cut short.",
          "minimum": 1000,
          "maximum": 500000,
          "default": 20000
        },
        "fresh": {
          "type": "boolean",
          "description": "When true, bypasses the cache.",
          "default": false
        }
      },
      "required": [
        "url"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": [
            "string",
            "null"
          ],
          "description": "Final URL."
        },
        "title": {
          "type": [
            "string",
            "null"
          ],
          "description": "Article title."
        },
        "byline": {
          "type": [
            "string",
            "null"
          ],
          "description": "Author when declared."
        },
        "excerpt": {
          "type": [
            "string",
            "null"
          ],
          "description": "Short summary."
        },
        "site_name": {
          "type": [
            "string",
            "null"
          ],
          "description": "Site name."
        },
        "language": {
          "type": [
            "string",
            "null"
          ],
          "description": "Page language."
        },
        "image": {
          "type": [
            "string",
            "null"
          ],
          "description": "Lead image URL."
        },
        "published_time": {
          "type": [
            "string",
            "null"
          ],
          "description": "Publication date as declared."
        },
        "mode": {
          "type": [
            "string",
            "null"
          ],
          "description": "`article` or `full`; falls back to `full` when no article could be isolated."
        },
        "word_count": {
          "type": [
            "integer",
            "null"
          ],
          "description": "Words in the Markdown."
        },
        "length": {
          "type": [
            "integer",
            "null"
          ],
          "description": "Characters in the Markdown."
        },
        "truncated": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether `max_chars` cut the output."
        },
        "markdown": {
          "type": [
            "string",
            "null"
          ],
          "description": "The Markdown."
        },
        "rendered": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether a browser was used."
        },
        "from_cache": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether the answer came from the cache."
        }
      }
    },
    "statusCodes": [
      {
        "code": "400",
        "title": "Bad request",
        "description": "Neither `url` nor `html` was provided, or the URL is not reachable from here."
      },
      {
        "code": "413",
        "title": "Too large",
        "description": "The page or the posted HTML exceeds the size limit."
      },
      {
        "code": "415",
        "title": "Not HTML",
        "description": "The URL does not serve HTML or plain text."
      },
      {
        "code": "422",
        "title": "Unreachable",
        "description": "The page could not be fetched."
      },
      {
        "code": "401",
        "title": "Unauthorized",
        "description": "The Authorization header is missing or the key is not recognised."
      },
      {
        "code": "403",
        "title": "Forbidden",
        "description": "The key is not licensed for this product."
      },
      {
        "code": "429",
        "title": "Too many requests",
        "description": "The per-minute rate or the plan quota is exhausted. Retry after the seconds given in `Retry-After`."
      }
    ]
  },
  {
    "name": "convert_html_to_markdown",
    "title": "Convert HTML to Markdown",
    "description": "Converts HTML you already hold to Markdown. Nothing is fetched.",
    "reference": "https://developers.zactonz.com/apis/markdown/",
    "product": "markdown",
    "method": "POST",
    "path": "/markdown/",
    "readOnly": true,
    "untrusted": true,
    "fixed": {
      "format": "json"
    },
    "defaults": {
      "max_chars": 20000
    },
    "wrap": null,
    "image": null,
    "text": "markdown",
    "inputSchema": {
      "type": "object",
      "properties": {
        "html": {
          "type": "string",
          "description": "The HTML to convert, up to 2 MB."
        },
        "mode": {
          "type": "string",
          "description": "`article` (default) keeps the main content. `full` converts the whole body.",
          "enum": [
            "article",
            "full"
          ],
          "default": "article"
        },
        "images": {
          "type": "boolean",
          "description": "When false, drops images from the output.",
          "default": true
        },
        "links": {
          "type": "boolean",
          "description": "When false, replaces links with their text.",
          "default": true
        },
        "max_chars": {
          "type": "integer",
          "description": "Longest Markdown to return, in characters, from 1000 to 500000. Sent as 20000 when omitted.",
          "minimum": 1000,
          "maximum": 500000,
          "default": 20000
        }
      },
      "required": [
        "html"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": [
            "string",
            "null"
          ],
          "description": "Final URL."
        },
        "title": {
          "type": [
            "string",
            "null"
          ],
          "description": "Article title."
        },
        "byline": {
          "type": [
            "string",
            "null"
          ],
          "description": "Author when declared."
        },
        "excerpt": {
          "type": [
            "string",
            "null"
          ],
          "description": "Short summary."
        },
        "site_name": {
          "type": [
            "string",
            "null"
          ],
          "description": "Site name."
        },
        "language": {
          "type": [
            "string",
            "null"
          ],
          "description": "Page language."
        },
        "image": {
          "type": [
            "string",
            "null"
          ],
          "description": "Lead image URL."
        },
        "published_time": {
          "type": [
            "string",
            "null"
          ],
          "description": "Publication date as declared."
        },
        "mode": {
          "type": [
            "string",
            "null"
          ],
          "description": "`article` or `full`; falls back to `full` when no article could be isolated."
        },
        "word_count": {
          "type": [
            "integer",
            "null"
          ],
          "description": "Words in the Markdown."
        },
        "length": {
          "type": [
            "integer",
            "null"
          ],
          "description": "Characters in the Markdown."
        },
        "truncated": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether `max_chars` cut the output."
        },
        "markdown": {
          "type": [
            "string",
            "null"
          ],
          "description": "The Markdown."
        },
        "rendered": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether a browser was used."
        },
        "from_cache": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether the answer came from the cache."
        }
      }
    },
    "statusCodes": [
      {
        "code": "400",
        "title": "Bad request",
        "description": "Neither `url` nor `html` was provided, or the URL is not reachable from here."
      },
      {
        "code": "413",
        "title": "Too large",
        "description": "The page or the posted HTML exceeds the size limit."
      },
      {
        "code": "415",
        "title": "Not HTML",
        "description": "The URL does not serve HTML or plain text."
      },
      {
        "code": "422",
        "title": "Unreachable",
        "description": "The page could not be fetched."
      },
      {
        "code": "401",
        "title": "Unauthorized",
        "description": "The Authorization header is missing or the key is not recognised."
      },
      {
        "code": "403",
        "title": "Forbidden",
        "description": "The key is not licensed for this product."
      },
      {
        "code": "429",
        "title": "Too many requests",
        "description": "The per-minute rate or the plan quota is exhausted. Retry after the seconds given in `Retry-After`."
      }
    ]
  },
  {
    "name": "preview_link",
    "title": "Preview a link",
    "description": "Reads the metadata of a public URL: title, description, preview image, favicon, site name, author, publication date, language and feeds. A quick way to learn what a link points to without reading the page.",
    "reference": "https://developers.zactonz.com/apis/link-preview/",
    "product": "unfurl",
    "method": "GET",
    "path": "/unfurl/",
    "readOnly": true,
    "untrusted": true,
    "fixed": {},
    "defaults": {},
    "wrap": null,
    "image": null,
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "description": "The page to preview. `https://` is assumed when the scheme is omitted."
        },
        "render": {
          "type": "boolean",
          "description": "When true, loads the page in a headless browser before reading its tags.",
          "default": false
        },
        "verify_image": {
          "type": "boolean",
          "description": "When true, downloads the preview image to confirm it exists and to report its real dimensions and type.",
          "default": false
        },
        "fresh": {
          "type": "boolean",
          "description": "When true, bypasses the one-hour cache.",
          "default": false
        }
      },
      "required": [
        "url"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": [
            "string",
            "null"
          ],
          "description": "URL as requested."
        },
        "final_url": {
          "type": [
            "string",
            "null"
          ],
          "description": "URL after redirects."
        },
        "status": {
          "type": [
            "integer",
            "null"
          ],
          "description": "HTTP status of the page."
        },
        "title": {
          "type": [
            "string",
            "null"
          ],
          "description": "Best title from Open Graph, Twitter or the title tag."
        },
        "description": {
          "type": [
            "string",
            "null"
          ],
          "description": "Best description."
        },
        "site_name": {
          "type": [
            "string",
            "null"
          ],
          "description": "Site name."
        },
        "type": {
          "type": [
            "string",
            "null"
          ],
          "description": "Open Graph type."
        },
        "canonical": {
          "type": [
            "string",
            "null"
          ],
          "description": "Canonical URL."
        },
        "image": {
          "type": [
            "object",
            "null"
          ],
          "description": "Preview image: `url`, `width`, `height`, `alt`, `type`, and with `verify_image` also `verified` and `bytes`."
        },
        "favicon": {
          "type": [
            "string",
            "null"
          ],
          "description": "Best icon URL."
        },
        "icons": {
          "type": [
            "array",
            "null"
          ],
          "description": "All declared icons with `rel`, `sizes` and `type`.",
          "items": {
            "type": "object"
          }
        },
        "language": {
          "type": [
            "string",
            "null"
          ],
          "description": "Value of `<html lang>`."
        },
        "locale": {
          "type": [
            "string",
            "null"
          ],
          "description": "Open Graph locale."
        },
        "author": {
          "type": [
            "string",
            "null"
          ],
          "description": "Author."
        },
        "published_time": {
          "type": [
            "string",
            "null"
          ],
          "description": "Publication date as declared."
        },
        "modified_time": {
          "type": [
            "string",
            "null"
          ],
          "description": "Modification date as declared."
        },
        "keywords": {
          "type": [
            "array",
            "null"
          ],
          "description": "Meta keywords.",
          "items": {
            "type": "string"
          }
        },
        "theme_color": {
          "type": [
            "string",
            "null"
          ],
          "description": "Theme colour."
        },
        "twitter": {
          "type": [
            "object",
            "null"
          ],
          "description": "`card`, `site`, `creator`."
        },
        "feeds": {
          "type": [
            "array",
            "null"
          ],
          "description": "RSS, Atom or JSON feeds with `url`, `type`, `title`.",
          "items": {
            "type": "object"
          }
        },
        "oembed": {
          "type": [
            "string",
            "null"
          ],
          "description": "oEmbed endpoint if declared."
        },
        "rendered": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether a browser was used."
        },
        "from_cache": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether the answer came from the cache."
        }
      }
    },
    "statusCodes": [
      {
        "code": "400",
        "title": "Bad request",
        "description": "`url` is missing, malformed, or points at a host that is not reachable from here."
      },
      {
        "code": "413",
        "title": "Too large",
        "description": "The page is larger than 2 MB."
      },
      {
        "code": "415",
        "title": "Not HTML",
        "description": "The URL does not serve an HTML document."
      },
      {
        "code": "422",
        "title": "Unreachable",
        "description": "The page could not be fetched, or it answered with an error status given in `upstream_status`."
      },
      {
        "code": "401",
        "title": "Unauthorized",
        "description": "The Authorization header is missing or the key is not recognised."
      },
      {
        "code": "403",
        "title": "Forbidden",
        "description": "The key is not licensed for this product."
      },
      {
        "code": "429",
        "title": "Too many requests",
        "description": "The per-minute rate or the plan quota is exhausted. Retry after the seconds given in `Retry-After`."
      }
    ]
  },
  {
    "name": "lookup_dns",
    "title": "Look up DNS records",
    "description": "Returns the DNS records of a host or domain (A, AAAA, MX, TXT, NS, CNAME, SOA, CAA, SRV) and its DNSSEC status.",
    "reference": "https://developers.zactonz.com/apis/domain-dns/",
    "product": "domain",
    "method": "GET",
    "path": "/domain/dns/",
    "readOnly": true,
    "untrusted": false,
    "fixed": {},
    "defaults": {},
    "wrap": null,
    "image": null,
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Host or domain name."
        },
        "type": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 1,
          "description": "Record types to look up. Omit for A, AAAA, MX, TXT, NS, CNAME, SOA and CAA."
        }
      },
      "required": [
        "name"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "name": {
          "type": [
            "string",
            "null"
          ],
          "description": "Name queried."
        },
        "records": {
          "type": [
            "object",
            "null"
          ],
          "description": "One list per type. A and AAAA carry `address`; MX `priority` and `exchange`; TXT `text`; CNAME, NS and PTR `target`; SOA the zone fields; CAA `flags`, `tag`, `value`; SRV `priority`, `weight`, `port`, `target`. Every record has `name` and `ttl`."
        },
        "dnssec": {
          "type": [
            "object",
            "null"
          ],
          "description": "`ds_records` and `validated_by_resolver`."
        },
        "queried_at": {
          "type": [
            "string",
            "null"
          ],
          "description": "Timestamp."
        }
      }
    },
    "statusCodes": [
      {
        "code": "400",
        "title": "Bad request",
        "description": "`name` is missing or a record type is not supported."
      },
      {
        "code": "401",
        "title": "Unauthorized",
        "description": "The Authorization header is missing or the key is not recognised."
      },
      {
        "code": "403",
        "title": "Forbidden",
        "description": "The key is not licensed for this product."
      },
      {
        "code": "429",
        "title": "Too many requests",
        "description": "The per-minute rate or the plan quota is exhausted. Retry after the seconds given in `Retry-After`."
      }
    ]
  },
  {
    "name": "inspect_ssl_certificate",
    "title": "Inspect an SSL certificate",
    "description": "Connects to a host and reports its TLS certificate: issuer, subject, validity dates, days remaining, whether the chain is trusted and the name matches, and the protocol and cipher in use.",
    "reference": "https://developers.zactonz.com/apis/domain-ssl/",
    "product": "domain",
    "method": "GET",
    "path": "/domain/ssl/",
    "readOnly": true,
    "untrusted": false,
    "fixed": {},
    "defaults": {},
    "wrap": null,
    "image": null,
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "host": {
          "type": "string",
          "description": "Host name, or a URL from which the host is taken."
        },
        "port": {
          "type": "integer",
          "description": "TLS port: 443, 8443, 465, 993, 995, 636 or 5061.",
          "enum": [
            443,
            8443,
            465,
            993,
            995,
            636,
            5061
          ],
          "default": 443
        },
        "fresh": {
          "type": "boolean",
          "description": "When true, bypasses the cache.",
          "default": false
        }
      },
      "required": [
        "host"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "host": {
          "type": [
            "string",
            "null"
          ],
          "description": "Host inspected."
        },
        "ip": {
          "type": [
            "string",
            "null"
          ],
          "description": "Address connected to."
        },
        "port": {
          "type": [
            "integer",
            "null"
          ],
          "description": "Port."
        },
        "connect_ms": {
          "type": [
            "integer",
            "null"
          ],
          "description": "Handshake time in milliseconds."
        },
        "protocol": {
          "type": [
            "string",
            "null"
          ],
          "description": "Negotiated protocol, for example `TLSv1.3`."
        },
        "cipher": {
          "type": [
            "string",
            "null"
          ],
          "description": "Negotiated cipher."
        },
        "valid": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "True when the chain is trusted, the name matches and the certificate is within its dates."
        },
        "hostname_match": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether the certificate covers `host`."
        },
        "trusted_chain": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether the chain verifies against the CA store."
        },
        "chain_error": {
          "type": [
            "string",
            "null"
          ],
          "description": "Verification error when the chain fails."
        },
        "expired": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether the certificate has expired."
        },
        "not_yet_valid": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether the certificate is not yet valid."
        },
        "self_signed": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether issuer equals subject."
        },
        "days_remaining": {
          "type": [
            "integer",
            "null"
          ],
          "description": "Days until expiry, negative when expired."
        },
        "certificate": {
          "type": [
            "object",
            "null"
          ],
          "description": "Leaf certificate: `subject`, `issuer`, `san`, `serial`, `signature_algorithm`, `key_type`, `key_bits`, `not_before_iso`, `not_after_iso`, `fingerprint_sha256`."
        },
        "chain": {
          "type": [
            "array",
            "null"
          ],
          "description": "Every certificate the server sent, in the same shape.",
          "items": {
            "type": "object"
          }
        }
      }
    },
    "statusCodes": [
      {
        "code": "400",
        "title": "Bad request",
        "description": "`host` is missing, not a host name, on a disallowed port, or not reachable from here."
      },
      {
        "code": "422",
        "title": "No TLS",
        "description": "The host did not complete a TLS handshake or presented no certificate."
      },
      {
        "code": "401",
        "title": "Unauthorized",
        "description": "The Authorization header is missing or the key is not recognised."
      },
      {
        "code": "403",
        "title": "Forbidden",
        "description": "The key is not licensed for this product."
      },
      {
        "code": "429",
        "title": "Too many requests",
        "description": "The per-minute rate or the plan quota is exhausted. Retry after the seconds given in `Retry-After`."
      }
    ]
  },
  {
    "name": "lookup_whois",
    "title": "Look up a domain registration",
    "description": "Returns the registration record of a domain from RDAP or WHOIS: registrar, creation, update and expiry dates, status codes, nameservers and abuse contact.",
    "reference": "https://developers.zactonz.com/apis/domain-whois/",
    "product": "domain",
    "method": "GET",
    "path": "/domain/whois/",
    "readOnly": true,
    "untrusted": false,
    "fixed": {},
    "defaults": {},
    "wrap": null,
    "image": null,
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "domain": {
          "type": "string",
          "description": "Domain name. A host name or URL is reduced to its registrable domain."
        },
        "raw": {
          "type": "boolean",
          "description": "When true, includes the raw WHOIS text when the fallback service was used.",
          "default": false
        }
      },
      "required": [
        "domain"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "domain": {
          "type": [
            "string",
            "null"
          ],
          "description": "Registrable domain."
        },
        "source": {
          "type": [
            "string",
            "null"
          ],
          "description": "`rdap` or `whois`."
        },
        "registry": {
          "type": [
            "string",
            "null"
          ],
          "description": "RDAP base URL or WHOIS server used."
        },
        "registrar": {
          "type": [
            "string",
            "null"
          ],
          "description": "Registrar name."
        },
        "abuse_contact": {
          "type": [
            "string",
            "null"
          ],
          "description": "Registrar abuse email when published."
        },
        "status": {
          "type": [
            "array",
            "null"
          ],
          "description": "EPP status codes.",
          "items": {
            "type": "string"
          }
        },
        "created": {
          "type": [
            "string",
            "null"
          ],
          "description": "Registration date."
        },
        "updated": {
          "type": [
            "string",
            "null"
          ],
          "description": "Last change."
        },
        "expires": {
          "type": [
            "string",
            "null"
          ],
          "description": "Expiry date."
        },
        "nameservers": {
          "type": [
            "array",
            "null"
          ],
          "description": "Delegated nameservers.",
          "items": {
            "type": "string"
          }
        },
        "dnssec": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether the delegation is signed."
        },
        "raw": {
          "type": [
            "string",
            "null"
          ],
          "description": "Raw WHOIS text, only with `raw=1` on the fallback path."
        }
      }
    },
    "statusCodes": [
      {
        "code": "400",
        "title": "Bad request",
        "description": "`domain` is missing or not a domain name."
      },
      {
        "code": "404",
        "title": "Not found",
        "description": "The registry has no record for this domain."
      },
      {
        "code": "422",
        "title": "No service",
        "description": "No RDAP or WHOIS service is known for that top-level domain, or it did not answer."
      },
      {
        "code": "503",
        "title": "Registry busy",
        "description": "The registry is rate limiting; retry shortly."
      },
      {
        "code": "401",
        "title": "Unauthorized",
        "description": "The Authorization header is missing or the key is not recognised."
      },
      {
        "code": "403",
        "title": "Forbidden",
        "description": "The key is not licensed for this product."
      },
      {
        "code": "429",
        "title": "Too many requests",
        "description": "The per-minute rate or the plan quota is exhausted. Retry after the seconds given in `Retry-After`."
      }
    ]
  },
  {
    "name": "check_email_domain",
    "title": "Check the email setup of a domain",
    "description": "Audits how a domain is configured for email: MX, SPF, DKIM, DMARC, MTA-STS, TLS-RPT and BIMI records, whether it is a disposable or free mail provider, a score out of 100 and a list of findings.",
    "reference": "https://developers.zactonz.com/apis/email-domain/",
    "product": "email",
    "method": "GET",
    "path": "/email/domain/",
    "readOnly": true,
    "untrusted": false,
    "fixed": {},
    "defaults": {},
    "wrap": null,
    "image": null,
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "domain": {
          "type": "string",
          "description": "Domain to audit. An email address is accepted and reduced to its domain."
        },
        "selectors": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 1,
          "description": "DKIM selectors to check in addition to the common ones, up to 20."
        },
        "probe": {
          "type": "boolean",
          "description": "When true, connects to the primary MX to read its banner and STARTTLS support.",
          "default": false
        }
      },
      "required": [
        "domain"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "domain": {
          "type": [
            "string",
            "null"
          ],
          "description": "Domain audited."
        },
        "score": {
          "type": [
            "integer",
            "null"
          ],
          "description": "0 to 100."
        },
        "grade": {
          "type": [
            "string",
            "null"
          ],
          "description": "A to F."
        },
        "disposable": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Known disposable-address provider."
        },
        "free_provider": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Consumer webmail provider."
        },
        "mx": {
          "type": [
            "array",
            "null"
          ],
          "description": "MX hosts with `priority`, `exchange`, `addresses` and, with `probe=1`, `smtp` (`reachable`, `banner`, `starttls`).",
          "items": {
            "type": "object"
          }
        },
        "spf": {
          "type": [
            "object",
            "null"
          ],
          "description": "`present`, `record`, `valid`, `all` qualifier, DNS `lookups`, `mechanisms`."
        },
        "dkim": {
          "type": [
            "array",
            "null"
          ],
          "description": "Keys found: `selector`, `key_type`, `key_bits`, `revoked`, `testing`.",
          "items": {
            "type": "object"
          }
        },
        "dmarc": {
          "type": [
            "object",
            "null"
          ],
          "description": "`present`, `record`, `policy`, `subdomain_policy`, `pct`, `rua`, `ruf`, `adkim`, `aspf`."
        },
        "mta_sts": {
          "type": [
            "object",
            "null"
          ],
          "description": "`present`, `record`, fetched `policy`."
        },
        "tls_rpt": {
          "type": [
            "object",
            "null"
          ],
          "description": "`present`, `record`."
        },
        "bimi": {
          "type": [
            "object",
            "null"
          ],
          "description": "`present`, `record`."
        },
        "findings": {
          "type": [
            "array",
            "null"
          ],
          "description": "Each with `code`, `severity` (`critical`, `warning`, `info`) and `message`.",
          "items": {
            "type": "object"
          }
        },
        "checked_selectors": {
          "type": [
            "array",
            "null"
          ],
          "description": "Selectors that were queried.",
          "items": {
            "type": "string"
          }
        },
        "checked_at": {
          "type": [
            "string",
            "null"
          ],
          "description": "Timestamp."
        }
      }
    },
    "statusCodes": [
      {
        "code": "400",
        "title": "Bad request",
        "description": "`domain` is missing or not a domain name."
      },
      {
        "code": "401",
        "title": "Unauthorized",
        "description": "The Authorization header is missing or the key is not recognised."
      },
      {
        "code": "403",
        "title": "Forbidden",
        "description": "The key is not licensed for this product."
      },
      {
        "code": "429",
        "title": "Too many requests",
        "description": "The per-minute rate or the plan quota is exhausted. Retry after the seconds given in `Retry-After`."
      }
    ]
  },
  {
    "name": "verify_emails",
    "title": "Verify email addresses",
    "description": "Checks whether email addresses can receive mail by asking the receiving mail server, without sending a message. Returns valid or invalid for each address. Can take up to a minute.",
    "reference": "https://developers.zactonz.com/apis/mail-verifier/",
    "product": "mverifier",
    "method": "POST",
    "path": "/mverifier/",
    "readOnly": false,
    "untrusted": false,
    "fixed": {},
    "defaults": {},
    "wrap": null,
    "image": null,
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "emails": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 1,
          "description": "The addresses to check, at most ten."
        }
      },
      "required": [
        "emails"
      ],
      "additionalProperties": false
    },
    "statusCodes": [
      {
        "code": 200,
        "title": "OK",
        "description": "Processed. If `mails` is absent, `message` explains why (no addresses sent, or more than ten)."
      },
      {
        "code": 400,
        "title": "Missing API key",
        "description": "`key` was absent."
      },
      {
        "code": 403,
        "title": "Invalid key",
        "description": "`key` is not recognised."
      },
      {
        "code": 406,
        "title": "Key expired",
        "description": "The key's validity period has ended. Contact support to renew it."
      }
    ]
  },
  {
    "name": "generate_qr_code",
    "title": "Generate a QR code",
    "description": "Encodes text or a URL as a QR code. Returns a link to the image and the image itself. With the text format it returns the code as rows of 0 and 1 instead.",
    "reference": "https://developers.zactonz.com/apis/qr-encoder/",
    "product": "qr",
    "method": "GET",
    "path": "/qr/enc/",
    "readOnly": false,
    "untrusted": false,
    "fixed": {
      "resp": "json"
    },
    "defaults": {},
    "wrap": null,
    "image": "qr",
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "content": {
          "type": "string",
          "description": "The text or URL to encode, up to 4000 characters."
        },
        "format": {
          "type": "string",
          "description": "`png` (default), `jpg`, `svg`, or `text` for a 0/1 matrix in JSON.",
          "enum": [
            "png",
            "jpg",
            "svg",
            "text"
          ],
          "default": "png"
        },
        "size": {
          "type": "integer",
          "description": "Pixels per QR module, from `1` to `20`.",
          "minimum": 1,
          "maximum": 20,
          "default": 4
        },
        "accuracy": {
          "type": "string",
          "description": "Error-correction level. Higher levels survive more damage but produce denser codes.",
          "enum": [
            "low",
            "normal",
            "good",
            "high"
          ],
          "default": "normal"
        },
        "padding": {
          "type": "integer",
          "description": "Quiet zone around the code in modules, 0 to 20. Default 2.",
          "default": 2
        },
        "color": {
          "type": "string",
          "description": "Foreground colour as six hex digits, for example `ff6700`, or a decimal RGB integer. Default black.",
          "default": "000000"
        },
        "bgcolor": {
          "type": "string",
          "description": "Background colour as six hex digits, for example `ff6700`, or a decimal RGB integer. Default white.",
          "default": "FFFFFF"
        }
      },
      "required": [
        "content"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "qr": {
          "type": [
            "string",
            "null"
          ],
          "description": "Absolute URL of the generated image (`png` and `jpg` formats)."
        },
        "text": {
          "type": [
            "string",
            "null"
          ],
          "description": "Inline SVG markup or the text matrix (`svg` and `text` formats only)."
        },
        "size": {
          "type": [
            "integer",
            "null"
          ],
          "description": "Module size that was applied."
        },
        "accuracy": {
          "type": [
            "string",
            "null"
          ],
          "description": "Error-correction level as a single letter: `L`, `M`, `Q` or `H`."
        },
        "format": {
          "type": [
            "string",
            "null"
          ],
          "description": "Output format that was applied."
        }
      }
    },
    "statusCodes": [
      {
        "code": 200,
        "title": "OK",
        "description": "The code was generated."
      },
      {
        "code": 400,
        "title": "Missing content",
        "description": "`content` was empty or absent. `data` carries the message."
      },
      {
        "code": 500,
        "title": "Encoding failed",
        "description": "The encoder could not build the matrix. Shorten the content or lower `accuracy`."
      }
    ]
  },
  {
    "name": "read_qr_code",
    "title": "Read a QR code",
    "description": "Decodes the QR code in an image and returns the text it holds.",
    "reference": "https://developers.zactonz.com/apis/qr-decoder/",
    "product": "qr",
    "method": "POST",
    "path": "/qr/dec/",
    "readOnly": true,
    "untrusted": true,
    "fixed": {},
    "defaults": {},
    "wrap": "content",
    "image": null,
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "image": {
          "type": "string",
          "description": "A link to the image, or the base64-encoded image bytes when format is `base64`."
        },
        "format": {
          "type": "string",
          "description": "How `image` is given: `url` for a link, `base64` for the image bytes.",
          "enum": [
            "url",
            "base64"
          ],
          "default": "url"
        }
      },
      "required": [
        "image"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "content": {
          "type": [
            "string",
            "null"
          ],
          "description": "The text encoded in the QR code, or an error message for non-200 statuses."
        }
      },
      "required": [
        "content"
      ]
    },
    "statusCodes": [
      {
        "code": 200,
        "title": "OK",
        "description": "A code was found and decoded."
      },
      {
        "code": 400,
        "title": "Missing image",
        "description": "`image` was empty or absent."
      },
      {
        "code": 401,
        "title": "Image not usable",
        "description": "The URL was invalid, not `http(s)`, pointed at a private host, exceeded 8 MB, or the base64 payload could not be decoded. `data` says which."
      },
      {
        "code": 422,
        "title": "No QR code found",
        "description": "The image loaded but no QR code could be read from it."
      }
    ]
  },
  {
    "name": "generate_barcode",
    "title": "Generate a barcode",
    "description": "Renders a barcode: Code 128, Code 39, Code 93, EAN-13, EAN-8, UPC-A, UPC-E, ITF-14 or Codabar. Returns a link valid for 24 hours, the dimensions and the image itself.",
    "reference": "https://developers.zactonz.com/apis/barcode-encoder/",
    "product": "barcode",
    "method": "GET",
    "path": "/barcode/",
    "readOnly": false,
    "untrusted": false,
    "fixed": {
      "resp": "json"
    },
    "defaults": {},
    "wrap": null,
    "image": "barcode",
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "content": {
          "type": "string",
          "description": "The value to encode. Each symbology has its own alphabet and length, listed under the `type` parameter."
        },
        "type": {
          "type": "string",
          "description": "`code128` (printable ASCII, up to 80 characters), `code39` (digits, capitals and `- . $ / + %`), `code93`, `ean13` (12 digits, or 13 with the check digit), `ean8` (7 or 8 digits), `upca` (11 or 12 digits), `upce` (6 to 8 digits), `itf14` (13 or 14 digits), `codabar` (a start and stop letter A to D around digits).",
          "enum": [
            "code128",
            "code39",
            "code93",
            "ean13",
            "ean8",
            "upca",
            "upce",
            "itf14",
            "codabar"
          ],
          "default": "code128"
        },
        "format": {
          "type": "string",
          "description": "`png` (default), `svg` or `jpg`.",
          "enum": [
            "png",
            "svg",
            "jpg"
          ],
          "default": "png"
        },
        "scale": {
          "type": "integer",
          "description": "Width of the narrowest bar in pixels, 1 to 10.",
          "minimum": 1,
          "maximum": 10,
          "default": 2
        },
        "height": {
          "type": "integer",
          "description": "Bar height in pixels, 20 to 300.",
          "minimum": 20,
          "maximum": 300,
          "default": 60
        },
        "color": {
          "type": "string",
          "description": "Bar colour as six hex digits.",
          "default": "000000"
        },
        "bgcolor": {
          "type": "string",
          "description": "Background colour as six hex digits.",
          "default": "ffffff"
        }
      },
      "required": [
        "content"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "barcode": {
          "type": [
            "string",
            "null"
          ],
          "description": "Temporary link to the rendered image."
        },
        "type": {
          "type": [
            "string",
            "null"
          ],
          "description": "Symbology used."
        },
        "content": {
          "type": [
            "string",
            "null"
          ],
          "description": "Value encoded."
        },
        "format": {
          "type": [
            "string",
            "null"
          ],
          "description": "Image format."
        },
        "width": {
          "type": [
            "integer",
            "null"
          ],
          "description": "Pixel width, null for SVG."
        },
        "height": {
          "type": [
            "integer",
            "null"
          ],
          "description": "Pixel height, null for SVG."
        },
        "expires_in": {
          "type": [
            "integer",
            "null"
          ],
          "description": "Seconds the link stays valid."
        }
      }
    },
    "statusCodes": [
      {
        "code": "400",
        "title": "Bad request",
        "description": "`content` is missing, or it does not fit the chosen symbology. The message says which rule failed."
      },
      {
        "code": "401",
        "title": "Unauthorized",
        "description": "The Authorization header is missing or the key is not recognised."
      },
      {
        "code": "403",
        "title": "Forbidden",
        "description": "The key is not licensed for this product."
      },
      {
        "code": "429",
        "title": "Too many requests",
        "description": "The per-minute rate or the plan quota is exhausted. Retry after the seconds given in `Retry-After`."
      }
    ]
  },
  {
    "name": "generate_social_image",
    "title": "Generate a social card image",
    "description": "Creates an Open Graph image, the card shown when a link is shared, from a title and an optional subtitle, site label and logo. Returns a link valid for seven days and the image itself.",
    "reference": "https://developers.zactonz.com/apis/og-image/",
    "product": "og",
    "method": "GET",
    "path": "/og/",
    "readOnly": false,
    "untrusted": false,
    "fixed": {
      "resp": "json"
    },
    "defaults": {},
    "wrap": null,
    "image": "image",
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "description": "Main text, up to 120 characters."
        },
        "subtitle": {
          "type": "string",
          "description": "Secondary line, up to 200 characters."
        },
        "site": {
          "type": "string",
          "description": "Short label shown at the bottom, for example your domain, up to 60 characters."
        },
        "logo": {
          "type": "string",
          "description": "Public URL of a PNG, JPEG, WebP, GIF or SVG logo, up to 512 KB."
        },
        "template": {
          "type": "string",
          "description": "`card` (accent bar and logo), `minimal` (centred) or `split` (text beside an accent panel).",
          "enum": [
            "card",
            "minimal",
            "split"
          ],
          "default": "card"
        },
        "theme": {
          "type": "string",
          "description": "`light` or `dark`.",
          "enum": [
            "light",
            "dark"
          ],
          "default": "light"
        },
        "accent": {
          "type": "string",
          "description": "Accent colour as six hex digits.",
          "default": "ff6700"
        },
        "bg": {
          "type": "string",
          "description": "Background colour as six hex digits, overriding the theme."
        },
        "size": {
          "type": "string",
          "description": "Pixel size.",
          "enum": [
            "1200x630",
            "1200x600",
            "1080x1080",
            "1600x900"
          ],
          "default": "1200x630"
        },
        "font": {
          "type": "string",
          "description": "`titillium`, `system` or `serif`.",
          "enum": [
            "titillium",
            "system",
            "serif"
          ],
          "default": "titillium"
        },
        "format": {
          "type": "string",
          "description": "`png` (default), `jpeg` or `webp`.",
          "enum": [
            "png",
            "jpeg",
            "webp"
          ],
          "default": "png"
        }
      },
      "required": [
        "title"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "image": {
          "type": [
            "string",
            "null"
          ],
          "description": "Hosted link to the card."
        },
        "format": {
          "type": [
            "string",
            "null"
          ],
          "description": "Image format."
        },
        "size": {
          "type": [
            "string",
            "null"
          ],
          "description": "Pixel size."
        },
        "cached": {
          "type": [
            "boolean",
            "null"
          ],
          "description": "Whether the card came from the cache."
        }
      }
    },
    "statusCodes": [
      {
        "code": "400",
        "title": "Bad request",
        "description": "`title` is missing or a parameter is out of range."
      },
      {
        "code": "422",
        "title": "Logo unavailable",
        "description": "The logo URL did not return an image."
      },
      {
        "code": "503",
        "title": "Renderer busy",
        "description": "All render slots are in use. Retry after a few seconds."
      },
      {
        "code": "504",
        "title": "Timeout",
        "description": "Rendering did not finish within the time limit."
      },
      {
        "code": "401",
        "title": "Unauthorized",
        "description": "The Authorization header is missing or the key is not recognised."
      },
      {
        "code": "403",
        "title": "Forbidden",
        "description": "The key is not licensed for this product."
      },
      {
        "code": "429",
        "title": "Too many requests",
        "description": "The per-minute rate or the plan quota is exhausted. Retry after the seconds given in `Retry-After`."
      }
    ]
  },
  {
    "name": "convert_image",
    "title": "Convert or resize an image",
    "description": "Converts an image at a public URL to WebP, AVIF, JPEG, PNG or GIF, optionally resizing, cropping, rotating, flipping, blurring, sharpening or removing colour. Returns a link valid for 24 hours with the source and output details, and the image itself when it is small enough.",
    "reference": "https://developers.zactonz.com/apis/image-convert/",
    "product": "image",
    "method": "POST",
    "path": "/image/",
    "readOnly": false,
    "untrusted": false,
    "fixed": {
      "resp": "json"
    },
    "defaults": {},
    "wrap": null,
    "image": "image",
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "description": "Public URL of the image to convert."
        },
        "format": {
          "type": "string",
          "description": "Output format: `webp` (default), `avif`, `jpeg`, `png`, `gif`, or `keep` to keep the source format.",
          "enum": [
            "webp",
            "avif",
            "jpeg",
            "png",
            "gif",
            "keep"
          ],
          "default": "webp"
        },
        "quality": {
          "type": "integer",
          "description": "1 to 100 for lossy formats.",
          "minimum": 1,
          "maximum": 100,
          "default": 82
        },
        "width": {
          "type": "integer",
          "description": "Target width in pixels, up to 8000. Omit to derive from the height."
        },
        "height": {
          "type": "integer",
          "description": "Target height in pixels, up to 8000. Omit to derive from the width."
        },
        "fit": {
          "type": "string",
          "description": "`inside` (default, shrink to fit, never enlarge), `cover` (fill and crop), `contain` (fit with padding, see `background`) or `fill` (stretch).",
          "enum": [
            "inside",
            "cover",
            "contain",
            "fill"
          ],
          "default": "inside"
        },
        "background": {
          "type": "string",
          "description": "Six hex digits used to flatten transparency and to pad `contain`. JPEG output is flattened on white when unset."
        },
        "rotate": {
          "type": "integer",
          "description": "Clockwise degrees, 0 to 359. EXIF orientation is always applied first."
        },
        "flip": {
          "type": "string",
          "description": "`h`, `v` or `both`.",
          "enum": [
            "h",
            "v",
            "both"
          ]
        },
        "grayscale": {
          "type": "boolean",
          "description": "When true, converts to grayscale."
        },
        "blur": {
          "type": "integer",
          "description": "Gaussian blur passes, 0 to 20."
        },
        "sharpen": {
          "type": "boolean",
          "description": "When true, applies a sharpening kernel."
        }
      },
      "required": [
        "url"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "source": {
          "type": [
            "object",
            "null"
          ],
          "description": "Dimensions, format, byte size, EXIF orientation, animation and alpha of the input."
        },
        "output": {
          "type": [
            "object",
            "null"
          ],
          "description": "Dimensions, format, byte size and quality of the result. Absent with `info=1`."
        },
        "colors": {
          "type": [
            "object",
            "null"
          ],
          "description": "With `info=1`: `dominant` list of `{hex, share}` and the `average` colour."
        },
        "image": {
          "type": [
            "string",
            "null"
          ],
          "description": "With `resp=json`: hosted link valid for 24 hours."
        }
      }
    },
    "statusCodes": [
      {
        "code": "400",
        "title": "Bad request",
        "description": "No `file` upload and no `url` were sent, or a parameter is invalid."
      },
      {
        "code": "413",
        "title": "Too large",
        "description": "The upload exceeds your plan's limit or the image exceeds 25 megapixels."
      },
      {
        "code": "415",
        "title": "Unsupported",
        "description": "The bytes are not a JPEG, PNG, GIF, WebP, AVIF or BMP image."
      },
      {
        "code": "401",
        "title": "Unauthorized",
        "description": "The Authorization header is missing or the key is not recognised."
      },
      {
        "code": "403",
        "title": "Forbidden",
        "description": "The key is not licensed for this product."
      },
      {
        "code": "429",
        "title": "Too many requests",
        "description": "The per-minute rate or the plan quota is exhausted. Retry after the seconds given in `Retry-After`."
      }
    ]
  },
  {
    "name": "inspect_image",
    "title": "Inspect an image",
    "description": "Reports the width, height, format, file size, orientation, transparency and dominant colours of an image at a public URL.",
    "reference": "https://developers.zactonz.com/apis/image-convert/",
    "product": "image",
    "method": "POST",
    "path": "/image/",
    "readOnly": true,
    "untrusted": false,
    "fixed": {
      "info": "1"
    },
    "defaults": {},
    "wrap": null,
    "image": null,
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "description": "Public URL of the image to inspect."
        }
      },
      "required": [
        "url"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "source": {
          "type": [
            "object",
            "null"
          ],
          "description": "Dimensions, format, byte size, EXIF orientation, animation and alpha of the input."
        },
        "output": {
          "type": [
            "object",
            "null"
          ],
          "description": "Dimensions, format, byte size and quality of the result. Absent with `info=1`."
        },
        "colors": {
          "type": [
            "object",
            "null"
          ],
          "description": "With `info=1`: `dominant` list of `{hex, share}` and the `average` colour."
        },
        "image": {
          "type": [
            "string",
            "null"
          ],
          "description": "With `resp=json`: hosted link valid for 24 hours."
        }
      }
    },
    "statusCodes": [
      {
        "code": "400",
        "title": "Bad request",
        "description": "No `file` upload and no `url` were sent, or a parameter is invalid."
      },
      {
        "code": "413",
        "title": "Too large",
        "description": "The upload exceeds your plan's limit or the image exceeds 25 megapixels."
      },
      {
        "code": "415",
        "title": "Unsupported",
        "description": "The bytes are not a JPEG, PNG, GIF, WebP, AVIF or BMP image."
      },
      {
        "code": "401",
        "title": "Unauthorized",
        "description": "The Authorization header is missing or the key is not recognised."
      },
      {
        "code": "403",
        "title": "Forbidden",
        "description": "The key is not licensed for this product."
      },
      {
        "code": "429",
        "title": "Too many requests",
        "description": "The per-minute rate or the plan quota is exhausted. Retry after the seconds given in `Retry-After`."
      }
    ]
  },
  {
    "name": "translate_text",
    "title": "Translate text",
    "description": "Translates text from one language to another. 46 languages are supported.",
    "reference": "https://developers.zactonz.com/apis/translator/",
    "product": "translator",
    "method": "POST",
    "path": "/translator/",
    "readOnly": true,
    "untrusted": false,
    "fixed": {},
    "defaults": {},
    "wrap": null,
    "image": null,
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "text": {
          "type": "string",
          "description": "The text to translate."
        },
        "to": {
          "type": "string",
          "description": "Two-letter code of the target language, such as `es`, `fr`, `de`, `ar` or `ur`."
        },
        "from": {
          "type": "string",
          "description": "Two-letter code of the source language, such as `en`. Defaults to English.",
          "default": "en"
        }
      },
      "required": [
        "text",
        "to"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "from": {
          "type": [
            "string",
            "null"
          ],
          "description": "Source language code that was used."
        },
        "to": {
          "type": [
            "string",
            "null"
          ],
          "description": "Target language code."
        },
        "text": {
          "type": [
            "string",
            "null"
          ],
          "description": "The translated text."
        }
      }
    },
    "statusCodes": [
      {
        "code": 200,
        "title": "OK",
        "description": "Translated."
      },
      {
        "code": 400,
        "title": "Rejected",
        "description": "Invalid key, a missing `text` or `to`, an unsupported language code, or the translation engine being unavailable. `errors` lists the reason."
      }
    ]
  },
  {
    "name": "get_drive_download_link",
    "title": "Get a Google Drive download link",
    "description": "Converts a Google Drive share link into a URL that downloads the file directly.",
    "reference": "https://developers.zactonz.com/apis/gdrive-direct-link/",
    "product": "gdrive",
    "method": "GET",
    "path": "/gdrive/directlink/",
    "readOnly": true,
    "untrusted": false,
    "fixed": {},
    "defaults": {},
    "wrap": "direct_link",
    "image": null,
    "text": null,
    "inputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "description": "The Google Drive share link."
        }
      },
      "required": [
        "url"
      ],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "direct_link": {
          "type": [
            "string",
            "null"
          ],
          "description": "The direct download URL, or an explanation for non-200 statuses."
        }
      },
      "required": [
        "direct_link"
      ]
    },
    "statusCodes": [
      {
        "code": 200,
        "title": "OK",
        "description": "Resolved."
      },
      {
        "code": 400,
        "title": "Missing url",
        "description": "`url` was empty or absent."
      },
      {
        "code": 403,
        "title": "Could not resolve",
        "description": "The file is private, was removed, or Google is throttling it. `data` carries the reason."
      }
    ]
  }
];
