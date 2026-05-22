export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

export async function uploadToHostinger(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('El archivo supera el limite de 20MB');
  }

  const formData = new FormData();
  formData.append('archivo', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<{ url?: string }> & { url?: string; error?: string };

  if (!response.ok) {
    throw new Error(body.error || `Error al subir el archivo (${response.status})`);
  }

  const url = body.data?.url ?? body.url;
  if (!url) {
    throw new Error(body.error || 'El servidor no devolvio una URL valida');
  }

  return url;
}
