import { prisma } from '@/lib/prisma';
import type {
  PatientDetailDTO,
  PatientFullListDTO,
  PatientLookupDTO,
  PatientSummaryDTO,
  PatientsListView,
} from '@/types/dto';

const patientSummarySelect = {
  id: true,
  dni: true,
  full_name: true,
} as const;

const patientFullListSelect = {
  id: true,
  clinic_id: true,
  dni: true,
  full_name: true,
  email: true,
  phone: true,
  address: true,
  created_at: true,
  under_treatment: true,
  prone_to_bleeding: true,
  allergic_to_meds: true,
  medical_observations: true,
} as const;

const patientDetailSelect = {
  id: true,
  clinic_id: true,
  dni: true,
  full_name: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  postal_code: true,
  gender: true,
  under_treatment: true,
  prone_to_bleeding: true,
  allergic_to_meds: true,
  medical_observations: true,
  created_at: true,
  updated_at: true,
} as const;

function resolveListSelect(view: PatientsListView) {
  if (view === 'full') return patientFullListSelect;
  return patientSummarySelect;
}

export const patientService = {
  async getByClinic(clinicId: string, page = 1, limit = 20, view: PatientsListView = 'summary') {
    const skip = (page - 1) * limit;
    const select = resolveListSelect(view);

    const [items, total] = await Promise.all([
      prisma.patient.findMany({
        where: { clinic_id: clinicId },
        select,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where: { clinic_id: clinicId } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    } as {
      items: PatientSummaryDTO[] | PatientFullListDTO[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  },

  async getById(clinicId: string, patientId: string) {
    return prisma.patient.findFirst({
      where: { id: patientId, clinic_id: clinicId },
      select: patientDetailSelect,
    }) as Promise<PatientDetailDTO | null>;
  },

  async create(clinicId: string, data: {
    dni: string;
    full_name: string;
    phone: string;
    address: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    gender?: string;
    medical_observations?: string;
  }) {
    const exists = await prisma.patient.findFirst({
      where: { clinic_id: clinicId, dni: data.dni },
      select: { id: true },
    });

    if (exists) {
      throw new Error('DNI ya registrado en esta clinica');
    }

    return prisma.patient.create({
      data: {
        clinic_id: clinicId,
        dni: data.dni,
        full_name: data.full_name,
        phone: data.phone,
        address: data.address,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        gender: data.gender,
        medical_observations: data.medical_observations,
      },
    });
  },

  async update(clinicId: string, patientId: string, data: Record<string, unknown>) {
    const current = await prisma.patient.findFirst({ where: { id: patientId, clinic_id: clinicId } });
    if (!current) {
      throw new Error('Paciente no encontrado');
    }

    return prisma.patient.update({
      where: { id: patientId },
      data: {
        full_name: typeof data.full_name === 'string' ? data.full_name : current.full_name,
        phone: typeof data.phone === 'string' ? data.phone : current.phone,
        address: typeof data.address === 'string' ? data.address : current.address,
        email: typeof data.email === 'string' ? data.email : current.email,
        first_name: typeof data.first_name === 'string' ? data.first_name : current.first_name,
        last_name: typeof data.last_name === 'string' ? data.last_name : current.last_name,
        city: typeof data.city === 'string' ? data.city : current.city,
        state: typeof data.state === 'string' ? data.state : current.state,
        postal_code: typeof data.postal_code === 'string' ? data.postal_code : current.postal_code,
        gender: typeof data.gender === 'string' ? data.gender : current.gender,
        medical_observations:
          typeof data.medical_observations === 'string'
            ? data.medical_observations
            : current.medical_observations,
      },
    });
  },

  async remove(clinicId: string, patientId: string) {
    const current = await prisma.patient.findFirst({ where: { id: patientId, clinic_id: clinicId } });
    if (!current) {
      throw new Error('Paciente no encontrado');
    }

    await prisma.patient.delete({ where: { id: patientId } });
    return { ok: true };
  },

  async search(clinicId: string, query: string) {
    return prisma.patient.findMany({
      where: {
        clinic_id: clinicId,
        OR: [
          { dni: { contains: query } },
          { full_name: { contains: query } },
        ],
      },
      select: patientSummarySelect,
      orderBy: { created_at: 'desc' },
      take: 50,
    }) as Promise<PatientLookupDTO[]>;
  },
};
