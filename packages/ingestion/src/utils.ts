export function validatePublicUrl(url: string): URL {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are allowed');
  }
  const hostname = parsed.hostname;
  // Block private/internal IPs
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.') ||
    hostname.startsWith('192.168.') ||
    hostname === '169.254.169.254' ||
    hostname.startsWith('169.254.') ||
    hostname === '[::1]' ||
    hostname === '0000:0000:0000:0000:0000:0000:0000:0001'
  ) {
    throw new Error('Access to private/internal URLs is not allowed');
  }
  return parsed;
}
