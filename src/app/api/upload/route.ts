import { apiError, apiOk } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';

const HOSTINGER_URL = 'https://api.cuscodento.com/subir_archivo.php';
const UPLOAD_SECRET = process.env.UPLOAD_SECRET ?? process.env.NEXT_PUBLIC_UPLOAD_SECRET ?? '';
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf']);

export async function POST(request: Request) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    if (!UPLOAD_SECRET) return apiError('Servicio de archivos no configurado', 500);

    const formData = await request.formData();
    const file = formData.get('archivo') as File | null;

    if (!file) return apiError('No se recibio el archivo', 400);
    if (file.size > MAX_UPLOAD_BYTES) return apiError('El archivo supera el limite de 20MB', 400);
    if (file.type && !ALLOWED_MIME.has(file.type)) return apiError('Tipo de archivo no permitido', 415);

    const hostingerForm = new FormData();
    hostingerForm.append('archivo', file);

    const hostingerRes = await fetch(HOSTINGER_URL, {
      method: 'POST',
      headers: { Authorization: UPLOAD_SECRET },
      body: hostingerForm,
    });

    const data = (await hostingerRes.json().catch(() => null)) as
      | { success: boolean; url?: string; error?: string }
      | null;

    if (!hostingerRes.ok) {
      const status = hostingerRes.status === 413 ? 413 : 502;
      const msg = data?.error || `Error del servidor de archivos (${hostingerRes.status})`;
      return apiError(msg, status);
    }

    if (!data || !data.success || !data.url) {
      return apiError(data?.error || 'El servidor no devolvio una URL valida', 502);
    }

    return apiOk({ url: data.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return apiError(message, 500);
  }
}
