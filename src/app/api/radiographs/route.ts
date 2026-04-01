import { z } from 'zod';
import { apiError, apiOk } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';
import { radiographService } from '@/services/radiograph.service';

const CreateRadiographSchema = z.object({
  patient_id: z.string().cuid(),
  appointment_id: z.string().cuid().optional(),
  file_url: z.string().min(10),
  file_name: z.string().min(1),
  file_size: z.number().int().nonnegative(),
  mime_type: z.string().optional(),
  type: z.string().optional(),
  notes: z.string().optional(),
});

function resolveStatus(message: string): number {
  return message.toLowerCase().includes('no encontrado') ? 404 : 500;
}

export async function GET(request: Request) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    const items = await radiographService.getByClinic(clinicId, patientId);
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
    const parsed = CreateRadiographSchema.safeParse(body);
    if (!parsed.success) return apiError('Datos de radiografia invalidos', 400);

    const created = await radiographService.create(clinicId, parsed.data);
    return apiOk(created, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return apiError(message, resolveStatus(message));
  }
}
