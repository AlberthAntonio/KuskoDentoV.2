import { apiError } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';

export async function GET(request: Request) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) return apiError('Falta parámetro path', 400);

    const fileUrl = `https://api.cuscodento.com/${filePath}`;
    const response = await fetch(fileUrl);

    if (!response.ok) {
      return apiError('Archivo no encontrado', 404);
    }

    const buffer = await response.arrayBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filePath.split('/').pop()}"`,
      },
    });
  } catch {
    return apiError('Error al descargar archivo', 500);
  }
}
