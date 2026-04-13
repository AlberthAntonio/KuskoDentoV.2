type ExternalUploadResponse = {
  success?: boolean;
  url?: string;
  error?: string;
};

const EXTERNAL_UPLOAD_URL = "https://api.cuscodento.com/subir_archivo.php";
const EXTERNAL_UPLOAD_AUTH = process.env.NEXT_PUBLIC_UPLOAD_SECRET || '';

export async function subirArchivoExterno(archivo: File): Promise<string | null> {
  if (!EXTERNAL_UPLOAD_AUTH) {
    console.error('Error al subir archivo: falta NEXT_PUBLIC_UPLOAD_SECRET');
    return null;
  }

  const formData = new FormData();
  formData.append('archivo', archivo);

  try {
    const response = await fetch(EXTERNAL_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: EXTERNAL_UPLOAD_AUTH,
      },
      body: formData,
    });

    const rawBody = await response.text();
    const data = (() => {
      try {
        return JSON.parse(rawBody) as ExternalUploadResponse;
      } catch {
        return null;
      }
    })();

    if (response.ok && data?.success === true && typeof data.url === 'string') {
      return data.url;
    }

    console.error('Error al subir archivo:', {
      status: response.status,
      statusText: response.statusText,
      serverError: data?.error,
      body: rawBody,
    });
    return null;
  } catch (error) {
    console.error('Error al subir archivo:', error);
    return null;
  }
}
