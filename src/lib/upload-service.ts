const UPLOAD_URL = 'https://api.cuscodento.com/subir_archivo.php';
const UPLOAD_SECRET = process.env.NEXT_PUBLIC_UPLOAD_SECRET ?? '';

export async function uploadToHostinger(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('archivo', file);

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: UPLOAD_SECRET,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Error al conectar con el servidor de archivos (${response.status})`);
  }

  const data = (await response.json()) as { success: boolean; url?: string; error?: string };

  if (!data.success || !data.url) {
    throw new Error(data.error || 'El servidor no devolvió una URL válida');
  }

  return data.url;
}
