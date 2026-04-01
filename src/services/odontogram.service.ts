import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const odontogramService = {
  async getByClinic(clinicId: string, patientId?: string | null) {
    return prisma.odontogram.findMany({
      where: {
        clinic_id: clinicId,
        ...(patientId ? { patient_id: patientId } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  },

  async create(clinicId: string, data: {
    patient_id: string;
    appointment_id?: string;
    data_json: Prisma.InputJsonValue;
    notes?: string;
  }) {
    const patient = await prisma.patient.findFirst({
      where: { id: data.patient_id, clinic_id: clinicId },
      select: { id: true },
    });

    if (!patient) {
      throw new Error('Paciente no encontrado');
    }

    if (data.appointment_id) {
      const appointment = await prisma.appointment.findFirst({
        where: { id: data.appointment_id, clinic_id: clinicId },
        select: { id: true },
      });

      if (!appointment) {
        throw new Error('Cita no encontrada');
      }
    }

    return prisma.odontogram.create({
      data: {
        clinic_id: clinicId,
        patient_id: data.patient_id,
        appointment_id: data.appointment_id,
        data_json: data.data_json,
        notes: data.notes,
      },
    });
  },
};