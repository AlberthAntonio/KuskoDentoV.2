import { prisma } from '@/lib/prisma';

export const consentService = {
  async getByClinic(clinicId: string, patientId?: string | null) {
    return prisma.consent.findMany({
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
    consent_type: string;
    document_url: string;
    notes?: string;
  }) {
    const patient = await prisma.patient.findFirst({
      where: { id: data.patient_id, clinic_id: clinicId },
      select: { id: true },
    });

    if (!patient) {
      throw new Error('Paciente no encontrado');
    }

    return prisma.consent.create({
      data: {
        clinic_id: clinicId,
        patient_id: data.patient_id,
        appointment_id: data.appointment_id,
        consent_type: data.consent_type,
        accepted: true,
        accepted_at: new Date(),
        document_url: data.document_url,
        notes: data.notes,
      },
    });
  },

  async remove(clinicId: string, id: string) {
    const current = await prisma.consent.findFirst({
      where: { id, clinic_id: clinicId },
      select: { id: true },
    });

    if (!current) {
      throw new Error('Consentimiento no encontrado');
    }

    await prisma.consent.delete({ where: { id: current.id } });
    return { ok: true };
  },
};
