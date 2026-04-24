import { apiError, apiErrorFromUnknown, apiOk } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';
import { appointmentService } from '@/services/appointment.service';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const { id } = await params;
    const appointment = await appointmentService.getById(clinicId, id);

    if (!appointment) return apiError('Cita no encontrada', 404);
    return apiOk(appointment);
  } catch (error) {
    return apiErrorFromUnknown(error, 500, 'api/appointments/[id]#get');
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const body = await request.json();
    const { id } = await params;

    // Si solo se envía status, usar updateStatus (retrocompatible)
    const hasFullData = body.patient_id || body.doctor_id || body.date || body.time || body.cost !== undefined || body.services;

    if (hasFullData) {
      const updated = await appointmentService.update(clinicId, id, {
        patient_id: typeof body.patient_id === 'string' ? body.patient_id : undefined,
        doctor_id: typeof body.doctor_id === 'string' ? body.doctor_id : undefined,
        treatment_id: body.treatment_id !== undefined ? (body.treatment_id || null) : undefined,
        date: body.date ? new Date(body.date) : undefined,
        time: typeof body.time === 'string' ? body.time : undefined,
        cost: typeof body.cost === 'number' ? body.cost : undefined,
        status: typeof body.status === 'string' ? body.status : undefined,
        observations: typeof body.observations === 'string' ? body.observations : undefined,
        services: Array.isArray(body.services) ? body.services : undefined,
      });
      return apiOk(updated);
    }

    // Fallback: solo actualizar estado
    const status = typeof body?.status === 'string' ? body.status : '';
    if (!status) return apiError('Estado invalido', 400);

    const updated = await appointmentService.updateStatus(clinicId, id, status);
    return apiOk(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    const status = message === 'Cita no encontrada' ? 404 : 500;
    return apiErrorFromUnknown(error, status, 'api/appointments/[id]#patch');
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const { id } = await params;
    const result = await appointmentService.remove(clinicId, id);
    return apiOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    const status = message === 'Cita no encontrada' ? 404 : 500;
    return apiErrorFromUnknown(error, status, 'api/appointments/[id]#delete');
  }
}
