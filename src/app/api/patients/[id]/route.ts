import { UpdatePatientSchema } from '@/lib/validators';
import { apiError, apiOk } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';
import { patientService } from '@/services/patient.service';

function resolvePatientErrorStatus(message: string): number {
  return message.toLowerCase().includes('no encontrado') ? 404 : 500;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const { id } = await params;
    const patient = await patientService.getById(clinicId, id);

    if (!patient) return apiError('Paciente no encontrado', 404);
    return apiOk(patient);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return apiError(message, 500);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const body = await request.json();
    const parsed = UpdatePatientSchema.safeParse(body);
    if (!parsed.success) return apiError('Datos de actualizacion invalidos', 400);

    const { id } = await params;
    const updated = await patientService.update(clinicId, id, parsed.data);
    return apiOk(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    const status = resolvePatientErrorStatus(message);
    return apiError(message, status);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const { id } = await params;
    const result = await patientService.remove(clinicId, id);
    return apiOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    const status = resolvePatientErrorStatus(message);
    return apiError(message, status);
  }
}
