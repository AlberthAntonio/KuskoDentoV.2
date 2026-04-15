import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { AppointmentBillingDTO, AppointmentCalendarDTO, AppointmentsListView } from '@/types/dto';

const appointmentCalendarSelect = {
  id: true,
  clinic_id: true,
  patient_id: true,
  doctor_id: true,
  treatment_id: true,
  date: true,
  time: true,
  status: true,
  cost: true,
  observations: true,
  patient: { select: { id: true, full_name: true } },
  doctor: { select: { id: true, full_name: true } },
  treatment: { select: { id: true, name: true, price: true } },
} as const;

const appointmentBillingSelect = {
  id: true,
  clinic_id: true,
  patient_id: true,
  doctor_id: true,
  treatment_id: true,
  date: true,
  time: true,
  status: true,
  cost: true,
  observations: true,
  patient: { select: { id: true, full_name: true, dni: true } },
  doctor: { select: { id: true, full_name: true } },
  treatment: { select: { id: true, name: true, price: true } },
} as const;

function resolveAppointmentSelect(view: AppointmentsListView) {
  return view === 'billing' ? appointmentBillingSelect : appointmentCalendarSelect;
}

export const appointmentService = {
  async getByClinic(
    clinicId: string,
    date?: string | null,
    status?: string | null,
    patientId?: string | null,
    view: AppointmentsListView = 'calendar'
  ) {
    const select = resolveAppointmentSelect(view);

    return prisma.appointment.findMany({
      where: {
        clinic_id: clinicId,
        ...(patientId ? { patient_id: patientId } : {}),
        ...(date
          ? {
              date: {
                gte: new Date(`${date}T00:00:00.000Z`),
                lte: new Date(`${date}T23:59:59.999Z`),
              },
            }
          : {}),
        ...(status ? { status } : {}),
      },
      select,
      orderBy: { date: 'asc' },
    }) as Promise<AppointmentCalendarDTO[] | AppointmentBillingDTO[]>;
  },

  async getById(clinicId: string, id: string) {
    return prisma.appointment.findFirst({
      where: { id, clinic_id: clinicId },
      select: appointmentBillingSelect,
    });
  },

  async create(clinicId: string, data: {
    patient_id: string;
    doctor_id: string;
    treatment_id?: string;
    date: Date;
    time: string;
    cost: number;
    status?: string;
  }) {
    return prisma.appointment.create({
      data: {
        clinic_id: clinicId,
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        treatment_id: data.treatment_id,
        date: data.date,
        time: data.time,
        cost: new Prisma.Decimal(data.cost),
        status: data.status || 'scheduled',
      },
    });
  },

  async updateStatus(clinicId: string, id: string, status: string) {
    const current = await prisma.appointment.findFirst({ where: { id, clinic_id: clinicId } });
    if (!current) {
      throw new Error('Cita no encontrada');
    }

    return prisma.appointment.update({
      where: { id },
      data: { status },
    });
  },

  async remove(clinicId: string, id: string) {
    const current = await prisma.appointment.findFirst({ where: { id, clinic_id: clinicId } });
    if (!current) {
      throw new Error('Cita no encontrada');
    }

    await prisma.appointment.delete({ where: { id } });
    return { ok: true };
  },
};
