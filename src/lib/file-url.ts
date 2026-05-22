const HOSTINGER_HOST = 'api.cuscodento.com';

export function getProxyUrl(fileUrl: string): string;
export function getProxyUrl(fileUrl: string | null | undefined): string | undefined;
export function getProxyUrl(fileUrl: string | null | undefined): string | undefined {
  if (!fileUrl) return undefined;
  if (fileUrl.startsWith('data:') || fileUrl.startsWith('blob:')) return fileUrl;

  try {
    const url = new URL(fileUrl);
    if (url.hostname !== HOSTINGER_HOST) return fileUrl;
    const path = url.pathname.replace(/^\//, '');
    return `/api/files/download?path=${encodeURIComponent(path)}`;
  } catch {
    return fileUrl;
  }
}
