/**
 * PROXY CONFIGURATION MODULE
 * Anti-Block Layer: Configure HTTP/HTTPS proxy for all requests
 */

const PROXY_URL = "http://127.0.0.1:7897";

/**
 * Setup proxy environment variables
 * This enables proxy for all HTTP/HTTPS requests in the current process
 */
export function setupProxy() {
  process.env.HTTPS_PROXY = PROXY_URL;
  process.env.HTTP_PROXY = PROXY_URL;
  console.log(`🔐 Proxy enabled: ${PROXY_URL}`);
}

/**
 * Get the current proxy URL
 * @returns {string} Proxy URL
 */
export function getProxyUrl() {
  return PROXY_URL;
}

/**
 * Check if proxy is currently configured
 * @returns {boolean} True if proxy environment variables are set
 */
export function isProxyEnabled() {
  return process.env.HTTPS_PROXY === PROXY_URL || process.env.HTTP_PROXY === PROXY_URL;
}

/**
 * Disable proxy (restore to no proxy)
 */
export function disableProxy() {
  delete process.env.HTTPS_PROXY;
  delete process.env.HTTP_PROXY;
  console.log('🔓 Proxy disabled');
}
