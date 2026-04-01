import { apiError, apiOk } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';
import { consentService } from '@/services/consent.service';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const { id } = await params;
    const result = await consentService.remove(clinicId, id);
    return apiOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    const status = message === 'Consentimiento no encontrado' ? 404 : 500;
    return apiError(message, status);
  }
}
