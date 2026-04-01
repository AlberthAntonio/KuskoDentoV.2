import { prisma } from '@/lib/prisma';

export const radiographService = {
  async getByClinic(clinicId: string, patientId?: string | null) {
    return prisma.radiograph.findMany({
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
    file_url: string;
    file_name: string;
    file_size: number;
    mime_type?: string;
    type?: string;
    notes?: string;
  }) {
    const patient = await prisma.patient.findFirst({
      where: { id: data.patient_id, clinic_id: clinicId },
      select: { id: true },
    });

    if (!patient) {
      throw new Error('Paciente no encontrado');
    }

    return prisma.radiograph.create({
      data: {
        clinic_id: clinicId,
        patient_id: data.patient_id,
        appointment_id: data.appointment_id,
        file_url: data.file_url,
        file_name: data.file_name,
        file_size: data.file_size,
        mime_type: data.mime_type,
        type: data.type || 'general',
        notes: data.notes,
      },
    });
  },

  async remove(clinicId: string, id: string) {
    const current = await prisma.radiograph.findFirst({
      where: { id, clinic_id: clinicId },
      select: { id: true },
    });

    if (!current) {
      throw new Error('Radiografia no encontrada');
    }

    await prisma.radiograph.delete({ where: { id: current.id } });
    return { ok: true };
  },
};
