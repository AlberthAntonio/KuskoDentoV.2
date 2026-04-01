import { apiError, apiOk } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';
import { inventoryService } from '@/services/inventory.service';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const { id } = await params;
    const result = await inventoryService.remove(clinicId, id);
    return apiOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    const status = message === 'Item de inventario no encontrado' ? 404 : 500;
    return apiError(message, status);
  }
}
