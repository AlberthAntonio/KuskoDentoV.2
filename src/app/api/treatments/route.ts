import { UpsertTreatmentSchema } from '@/lib/validators';
import { apiError, apiOk } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';
import { treatmentService } from '@/services/treatment.service';

export async function GET() {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const items = await treatmentService.getByClinic(clinicId);
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
    const parsed = UpsertTreatmentSchema.safeParse(body);
    if (!parsed.success) return apiError('Datos de tratamiento invalidos', 400);

    const item = await treatmentService.upsert(clinicId, parsed.data);
    return apiOk(item, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return apiError(message, 500);
  }
}
