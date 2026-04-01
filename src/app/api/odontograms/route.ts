import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { apiError, apiOk } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';
import { odontogramService } from '@/services/odontogram.service';

const CreateOdontogramSchema = z.object({
  patient_id: z.string().cuid(),
  appointment_id: z.string().cuid().optional(),
  data_json: z.record(z.string(), z.unknown()),
  notes: z.string().optional(),
});

function resolveStatus(message: string): number {
  const normalized = message.toLowerCase();
  if (normalized.includes('no encontrado')) return 404;
  return 500;
}

export async function GET(request: Request) {
  try {
    const { clinicId } = await getRequestContext();
    if (!clinicId) return apiError('No autorizado', 401);

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    const items = await odontogramService.getByClinic(clinicId, patientId);
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
    const parsed = CreateOdontogramSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Datos de odontograma invalidos', 400);
    }

    const created = await odontogramService.create(clinicId, {
      patient_id: parsed.data.patient_id,
      appointment_id: parsed.data.appointment_id,
      notes: parsed.data.notes,
      data_json: parsed.data.data_json as Prisma.InputJsonValue,
    });
    return apiOk(created, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return apiError(message, resolveStatus(message));
  }
}