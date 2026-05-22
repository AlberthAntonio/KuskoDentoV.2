export async function uploadToHostinger(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('archivo', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Error al subir el archivo (${response.status})`);
  }

  const data = (await response.json()) as { url?: string; error?: string };

  if (!data.url) {
    throw new Error(data.error || 'El servidor no devolvio una URL valida');
  }

  return data.url;
}
