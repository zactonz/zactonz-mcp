/**
 * How each API endpoint is presented as a tool.
 *
 * Parameters, types and descriptions come from the specifications in specs/.
 * This file decides the rest: tool names, the descriptions a model reads, and
 * which parameters a tool hides, fixes or adds.
 *
 * Per tool:
 *   name, title, description
 *   readOnly   true when the tool only looks something up
 *   http       request method, when it differs from the specification
 *   force      parameters sent with a fixed value and not offered to the model
 *   hide       parameters not offered to the model
 *   only       offer just these parameters
 *   require    parameters that become required
 *   add        parameters the specification leaves out
 *   lists      parameters offered as arrays and sent comma-separated
 *   defaults   values sent when the model leaves a parameter out
 *   describe   replacement descriptions, by parameter
 *   wrap       field name for a reply whose data is a single value
 *   image      field holding the link of an image to return inline
 *   text       field returned as plain text ahead of the other fields
 *   untrusted  true when the reply carries text written by third parties
 */

const quality = {
  defaults: { quality: 80 },
  describe: {
    quality:
      'JPEG quality from 1 to 100. Sent as 80 when omitted, which keeps most captures small enough to be returned inline. Ignored for other formats.',
  },
};

const margin = (side) => ({
  name: `margin${side}`,
  type: 'number',
  description: `PDF only. ${side} margin in inches, 0 to 5. Default 0.4.`,
});

export default {
  'screenshot-url': [
    {
      name: 'capture_screenshot',
      title: 'Capture a screenshot of a web page',
      description:
        'Loads a public web page in a headless browser and captures it as a JPEG, PNG or WebP image, or as a PDF. Returns a link to the file, and the image itself when it is small enough to look at directly. Suited to checking how a page renders or keeping a visual record of it.',
      hide: ['download'],
      add: [margin('Bottom'), margin('Left'), margin('Right')],
      wrap: 'url',
      image: 'url',
      defaults: quality.defaults,
      describe: { ...quality.describe, marginTop: 'PDF only. Top margin in inches, 0 to 5. Default 0.4.' },
    },
  ],
  'screenshot-html': [
    {
      name: 'render_html',
      title: 'Render HTML to an image or PDF',
      description:
        'Renders an HTML document you provide as a JPEG, PNG or WebP image, or as a PDF: an invoice, a report, a certificate. Returns a link to the file, and the image itself when it is small enough. Images, fonts and stylesheets referenced by the HTML must use absolute URLs.',
      wrap: 'url',
      image: 'url',
      defaults: quality.defaults,
      describe: { ...quality.describe, html: 'The HTML document to render, up to 2 MB.' },
    },
  ],
  markdown: [
    {
      name: 'read_webpage',
      title: 'Read a web page as Markdown',
      description:
        'Fetches a public web page and returns its main content as Markdown, without navigation, adverts or scripts. For pages that build their content with JavaScript, set render to true.',
      readOnly: true,
      untrusted: true,
      force: { format: 'json' },
      require: ['url'],
      text: 'markdown',
      defaults: { max_chars: 20000 },
      describe: {
        url: 'The page to read.',
        max_chars:
          'Longest Markdown to return, in characters, from 1000 to 500000. Sent as 20000 when omitted. The reply says whether the text was cut short.',
      },
    },
    {
      name: 'convert_html_to_markdown',
      title: 'Convert HTML to Markdown',
      description: 'Converts HTML you already hold to Markdown. Nothing is fetched.',
      readOnly: true,
      http: 'POST',
      force: { format: 'json' },
      hide: ['url', 'render', 'fresh'],
      add: [{ name: 'html', type: 'string', required: true, description: 'The HTML to convert, up to 2 MB.' }],
      text: 'markdown',
      defaults: { max_chars: 20000 },
      describe: {
        max_chars: 'Longest Markdown to return, in characters, from 1000 to 500000. Sent as 20000 when omitted.',
      },
    },
  ],
  'link-preview': [
    {
      name: 'preview_link',
      title: 'Preview a link',
      description:
        'Reads the metadata of a public URL: title, description, preview image, favicon, site name, author, publication date, language and feeds. A quick way to learn what a link points to without reading the page.',
      readOnly: true,
      untrusted: true,
    },
  ],
  'domain-dns': [
    {
      name: 'lookup_dns',
      title: 'Look up DNS records',
      description:
        'Returns the DNS records of a host or domain (A, AAAA, MX, TXT, NS, CNAME, SOA, CAA, SRV) and its DNSSEC status.',
      readOnly: true,
      lists: ['type'],
      describe: { type: 'Record types to look up. Omit for A, AAAA, MX, TXT, NS, CNAME, SOA and CAA.' },
    },
  ],
  'domain-ssl': [
    {
      name: 'inspect_ssl_certificate',
      title: 'Inspect an SSL certificate',
      description:
        'Connects to a host and reports its TLS certificate: issuer, subject, validity dates, days remaining, whether the chain is trusted and the name matches, and the protocol and cipher in use.',
      readOnly: true,
    },
  ],
  'domain-whois': [
    {
      name: 'lookup_whois',
      title: 'Look up a domain registration',
      description:
        'Returns the registration record of a domain from RDAP or WHOIS: registrar, creation, update and expiry dates, status codes, nameservers and abuse contact.',
      readOnly: true,
    },
  ],
  'email-domain': [
    {
      name: 'check_email_domain',
      title: 'Check the email setup of a domain',
      description:
        'Audits how a domain is configured for email: MX, SPF, DKIM, DMARC, MTA-STS, TLS-RPT and BIMI records, whether it is a disposable or free mail provider, a score out of 100 and a list of findings.',
      readOnly: true,
      lists: ['selectors'],
      describe: { selectors: 'DKIM selectors to check in addition to the common ones, up to 20.' },
    },
  ],
  'mail-verifier': [
    {
      name: 'verify_emails',
      title: 'Verify email addresses',
      description:
        'Checks whether email addresses can receive mail by asking the receiving mail server, without sending a message. Returns valid or invalid for each address. Can take up to a minute.',
      hide: ['key'],
      lists: ['emails'],
      describe: { emails: 'The addresses to check, at most ten.' },
    },
  ],
  'qr-encoder': [
    {
      name: 'generate_qr_code',
      title: 'Generate a QR code',
      description:
        'Encodes text or a URL as a QR code. Returns a link to the image and the image itself. With the text format it returns the code as rows of 0 and 1 instead.',
      force: { resp: 'json' },
      describe: { content: 'The text or URL to encode, up to 4000 characters.' },
      image: 'qr',
    },
  ],
  'qr-decoder': [
    {
      name: 'read_qr_code',
      title: 'Read a QR code',
      description: 'Decodes the QR code in an image and returns the text it holds.',
      readOnly: true,
      untrusted: true,
      http: 'POST',
      wrap: 'content',
      describe: {
        image: 'A link to the image, or the base64-encoded image bytes when format is `base64`.',
        format: 'How `image` is given: `url` for a link, `base64` for the image bytes.',
      },
    },
  ],
  'barcode-encoder': [
    {
      name: 'generate_barcode',
      title: 'Generate a barcode',
      description:
        'Renders a barcode: Code 128, Code 39, Code 93, EAN-13, EAN-8, UPC-A, UPC-E, ITF-14 or Codabar. Returns a link valid for 24 hours, the dimensions and the image itself.',
      force: { resp: 'json' },
      image: 'barcode',
    },
  ],
  'og-image': [
    {
      name: 'generate_social_image',
      title: 'Generate a social card image',
      description:
        'Creates an Open Graph image, the card shown when a link is shared, from a title and an optional subtitle, site label and logo. Returns a link valid for seven days and the image itself.',
      force: { resp: 'json' },
      hide: ['k', 'sig'],
      image: 'image',
    },
  ],
  'image-convert': [
    {
      name: 'convert_image',
      title: 'Convert or resize an image',
      description:
        'Converts an image at a public URL to WebP, AVIF, JPEG, PNG or GIF, optionally resizing, cropping, rotating, flipping, blurring, sharpening or removing colour. Returns a link valid for 24 hours with the source and output details, and the image itself when it is small enough.',
      force: { resp: 'json' },
      hide: ['file', 'info'],
      require: ['url'],
      describe: { url: 'Public URL of the image to convert.' },
      image: 'image',
    },
    {
      name: 'inspect_image',
      title: 'Inspect an image',
      description:
        'Reports the width, height, format, file size, orientation, transparency and dominant colours of an image at a public URL.',
      readOnly: true,
      force: { info: '1' },
      only: ['url'],
      require: ['url'],
      describe: { url: 'Public URL of the image to inspect.' },
    },
  ],
  translator: [
    {
      name: 'translate_text',
      title: 'Translate text',
      description: 'Translates text from one language to another. 46 languages are supported.',
      readOnly: true,
      hide: ['key'],
      describe: {
        from: 'Two-letter code of the source language, such as `en`. Defaults to English.',
        to: 'Two-letter code of the target language, such as `es`, `fr`, `de`, `ar` or `ur`.',
      },
    },
  ],
  'gdrive-direct-link': [
    {
      name: 'get_drive_download_link',
      title: 'Get a Google Drive download link',
      description: 'Converts a Google Drive share link into a URL that downloads the file directly.',
      readOnly: true,
      wrap: 'direct_link',
    },
  ],
};
