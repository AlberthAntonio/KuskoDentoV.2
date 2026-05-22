import { apiError } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';

const HOSTINGER_BASE = 'https://api.cuscodento.com';
const SAFE_PATH = /^[a-zA-Z0-9._\-/]+$/;

export async function GET(request: Request) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) return apiError('Falta parámetro path', 400);
    if (filePath.includes('..') || filePath.startsWith('/') || !SAFE_PATH.test(filePath)) {
      return apiError('Ruta de archivo invalida', 400);
    }

    const fileUrl = `${HOSTINGER_BASE}/${filePath}`;
    const response = await fetch(fileUrl);

    if (!response.ok) {
      return apiError('Archivo no encontrado', 404);
    }

    const buffer = await response.arrayBuffer();
    const safeName = (filePath.split('/').pop() ?? 'archivo').replace(/[^a-zA-Z0-9._-]/g, '_');

    return new Response(buffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${safeName}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return apiError('Error al descargar archivo', 500);
  }
}
