/**
 * PROXY CONFIGURATION MODULE
 * Anti-Block Layer: Configure HTTP/HTTPS proxy for all requests
 * Reads from process.env.HTTPS_PROXY; if unset, does nothing (no error).
 */

/**
 * Setup proxy environment variables from env
 * If HTTPS_PROXY is set, enables proxy for all HTTP/HTTPS requests in the current process.
 * If unset, silently skips (no env set, no log, no error).
 */
export function setupProxy() {
  const proxyUrl = process.env.HTTPS_PROXY;
  if (proxyUrl) {
    process.env.HTTPS_PROXY = proxyUrl;
    process.env.HTTP_PROXY = proxyUrl;
    console.log(`🔐 Proxy enabled: ${proxyUrl}`);
  }
}

/**
 * Get the current proxy URL
 * @returns {string|undefined} Proxy URL or undefined if not set
 */
export function getProxyUrl() {
  return process.env.HTTPS_PROXY;
}

/**
 * Check if proxy is currently configured
 * @returns {boolean} True if proxy environment variables are set
 */
export function isProxyEnabled() {
  return !!(process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
}

/**
 * Disable proxy (restore to no proxy)
 */
export function disableProxy() {
  delete process.env.HTTPS_PROXY;
  delete process.env.HTTP_PROXY;
  console.log('🔓 Proxy disabled');
}
