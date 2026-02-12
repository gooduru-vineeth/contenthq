export function validatePublicUrl(url: string): URL {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are allowed');
  }
  const hostname = parsed.hostname;
  // Block private/internal IPs
  const isPrivate172 = (() => {
    if (!hostname.startsWith('172.')) return false;
    const second = parseInt(hostname.split('.')[1], 10);
    return second >= 16 && second <= 31;
  })();

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('10.') ||
    isPrivate172 ||
    hostname.startsWith('192.168.') ||
    hostname === '169.254.169.254' ||
    hostname.startsWith('169.254.') ||
    hostname === '[::1]' ||
    hostname === '0000:0000:0000:0000:0000:0000:0000:0001' ||
    hostname === '::1' ||
    hostname.startsWith('fc') ||
    hostname.startsWith('fd') ||
    hostname.startsWith('fe80')
  ) {
    throw new Error('Access to private/internal URLs is not allowed');
  }
  return parsed;
}
