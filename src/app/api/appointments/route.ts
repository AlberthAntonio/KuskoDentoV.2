import { CreateAppointmentSchema } from '@/lib/validators';
import { apiError, apiErrorFromUnknown, apiOk } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';
import { appointmentService } from '@/services/appointment.service';
import type { AppointmentsListView } from '@/types/dto';

function resolveAppointmentsView(value: string | null): AppointmentsListView {
  return value === 'billing' ? 'billing' : 'calendar';
}

export async function GET(request: Request) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const patientId = searchParams.get('patient_id');
    const view = resolveAppointmentsView(searchParams.get('view'));

    const items = await appointmentService.getByClinic(clinicId, date, status, patientId, view);
    return apiOk({ items });
  } catch (error) {
    return apiErrorFromUnknown(error, 500, 'api/appointments#get');
  }
}

export async function POST(request: Request) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const body = await request.json();
    const parsed = CreateAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Datos de cita invalidos', 400);
    }

    const created = await appointmentService.create(clinicId, parsed.data);
    return apiOk(created, 201);
  } catch (error) {
    return apiErrorFromUnknown(error, 500, 'api/appointments#post');
  }
}
