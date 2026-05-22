export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const HOSTINGER_UPLOAD_URL = 'https://api.cuscodento.com/subir_archivo.php';

export async function uploadToHostinger(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('El archivo supera el limite de 20MB');
  }

  const secret = process.env.NEXT_PUBLIC_UPLOAD_SECRET;
  if (!secret) {
    throw new Error('Servicio de archivos no configurado');
  }

  const formData = new FormData();
  formData.append('archivo', file);

  const response = await fetch(HOSTINGER_UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: secret },
    body: formData,
  });

  const body = (await response.json().catch(() => null)) as
    | { success?: boolean; url?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(body?.error || `Error al subir el archivo (${response.status})`);
  }

  if (!body?.success || !body.url) {
    throw new Error(body?.error || 'El servidor no devolvio una URL valida');
  }

  return body.url;
}
