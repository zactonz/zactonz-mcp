export const CONSOLE_URL = 'https://developers.zactonz.com/console/';
export const KEYS_VARIABLE = 'ZACTONZ_API_KEYS';

/**
 * @typedef {object} Keyring
 * @property {string[]} products Products that have a key.
 * @property {string[]} rejected Masked prefixes of values that are not Zactonz keys.
 * @property {(product: string) => boolean} has
 * @property {(product: string) => string | undefined} get
 */

/**
 * Reads the keys in ZACTONZ_API_KEYS. A key names its product
 * (`zk_<product>_<secret>`), so each one is filed under that product. A value
 * in any other form is set aside and reported, never sent anywhere.
 *
 * @param {string | undefined | null} value Keys separated by commas or whitespace.
 * @returns {Keyring}
 */
export function parseKeys(value) {
  /** @type {Map<string, string>} */
  const keys = new Map();
  /** @type {string[]} */
  const rejected = [];
  for (const key of String(value ?? '')
    .split(/[\s,]+/)
    .filter(Boolean)) {
    const match = /^zk_([a-z0-9]+)_[A-Za-z0-9]+$/.exec(key);
    if (match) {
      keys.set(match[1], key);
    } else {
      rejected.push(`${key.slice(0, 6)}…`);
    }
  }
  return {
    products: [...keys.keys()],
    rejected,
    has: (product) => keys.has(product),
    get: (product) => keys.get(product),
  };
}

/**
 * @param {string} product
 * @returns {string}
 */
export function missingKeyMessage(product) {
  return (
    `No Zactonz API key is configured for the "${product}" product. ` +
    `Create one at ${CONSOLE_URL} and add it to the ${KEYS_VARIABLE} environment variable of this MCP server, ` +
    'separated from any other keys by a comma.'
  );
}
