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
  appointment_treatments: {
    select: {
      treatment: { select: { id: true, name: true, price: true } },
      price: true,
      observations: true,
    }
  }
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
  appointment_treatments: {
    select: {
      treatment: { select: { id: true, name: true, price: true } },
      price: true,
      observations: true,
    }
  }
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
                gte: new Date(`${date}T00:00:00`),
                lte: new Date(`${date}T23:59:59.999`),
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
    observations?: string;
    duration_minutes?: number;
    services?: Array<{
      treatment_id: string;
      price: number;
      observations?: string;
    }>;
  }) {
    const primaryTreatmentId = data.treatment_id ?? data.services?.[0]?.treatment_id;

    return prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          clinic_id: clinicId,
          patient_id: data.patient_id,
          doctor_id: data.doctor_id,
          treatment_id: primaryTreatmentId,
          date: data.date,
          time: data.time,
          cost: new Prisma.Decimal(data.cost),
          status: data.status || 'scheduled',
          observations: data.observations,
          duration_minutes: data.duration_minutes,
        },
      });

      if (data.services && data.services.length > 0) {
        await tx.appointmentTreatment.createMany({
          data: data.services.map((service) => ({
            clinic_id: clinicId,
            appointment_id: created.id,
            treatment_id: service.treatment_id,
            price: new Prisma.Decimal(service.price),
            observations: service.observations,
          })),
        });
      }

      return created;
    });
  },

  async updateStatus(clinicId: string, id: string, status: string, duration_minutes?: number) {
    const current = await prisma.appointment.findFirst({ where: { id, clinic_id: clinicId } });
    if (!current) {
      throw new Error('Cita no encontrada');
    }

    return prisma.appointment.update({
      where: { id },
      data: { 
        status,
        ...(duration_minutes !== undefined ? { duration_minutes } : {})
      },
    });
  },

  async update(clinicId: string, id: string, data: {
    patient_id?: string;
    doctor_id?: string;
    treatment_id?: string | null;
    date?: Date;
    time?: string;
    cost?: number;
    status?: string;
    observations?: string;
    duration_minutes?: number;
    services?: Array<{
      treatment_id: string;
      price: number;
      observations?: string;
    }>;
  }) {
    const current = await prisma.appointment.findFirst({ where: { id, clinic_id: clinicId } });
    if (!current) {
      throw new Error('Cita no encontrada');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: {
          ...(data.patient_id ? { patient_id: data.patient_id } : {}),
          ...(data.doctor_id ? { doctor_id: data.doctor_id } : {}),
          ...(data.treatment_id !== undefined ? { treatment_id: data.treatment_id || null } : {}),
          ...(data.date ? { date: data.date } : {}),
          ...(data.time ? { time: data.time } : {}),
          ...(data.cost !== undefined ? { cost: new Prisma.Decimal(data.cost) } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.observations !== undefined ? { observations: data.observations } : {}),
          ...(data.duration_minutes !== undefined ? { duration_minutes: data.duration_minutes } : {}),
        },
      });

      // Si se enviaron servicios, reemplazar los existentes
      if (data.services !== undefined) {
        await tx.appointmentTreatment.deleteMany({
          where: { appointment_id: id, clinic_id: clinicId },
        });

        if (data.services.length > 0) {
          await tx.appointmentTreatment.createMany({
            data: data.services.map((service) => ({
              clinic_id: clinicId,
              appointment_id: id,
              treatment_id: service.treatment_id,
              price: new Prisma.Decimal(service.price),
              observations: service.observations,
            })),
          });
        }
      }

      return updated;
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
