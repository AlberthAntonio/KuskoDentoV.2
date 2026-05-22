import { apiError, apiOk } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';

const API_KEY = process.env.UPLOAD_API_KEY || 'YUfyutVYTbyutVGYTcY&57576)(&/JkuY)';
const UPLOAD_URL = 'https://api.cuscodento.com/subir_archivo.php';

export async function POST(request: Request) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) return apiError('No se proporcionó archivo', 400);

    if (file.size > 2 * 1024 * 1024) {
      return apiError('El archivo es mayor a 2MB', 400);
    }

    const uploadFormData = new FormData();
    uploadFormData.append('archivo', file);

    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': API_KEY,
      },
      body: uploadFormData,
    });

    if (!response.ok) {
      return apiError('Error al subir archivo a servidor', 500);
    }

    const result = await response.json();
    if (!result.success) {
      return apiError(result.error || 'Error en servidor', 500);
    }

    return apiOk({ url: result.url });
  } catch {
    return apiError('Error al procesar archivo', 500);
  }
}
