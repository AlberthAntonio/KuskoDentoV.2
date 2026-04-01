import { apiError, apiOk } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';
import { UpsertInventoryItemSchema } from '@/lib/validators';
import { inventoryService } from '@/services/inventory.service';

export async function GET() {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const items = await inventoryService.getByClinic(clinicId);
    return apiOk({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return apiError(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const body = await request.json();
    const parsed = UpsertInventoryItemSchema.safeParse(body);
    if (!parsed.success) return apiError('Datos de inventario invalidos', 400);

    const item = await inventoryService.upsert(clinicId, parsed.data);
    return apiOk(item, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return apiError(message, 500);
  }
}
