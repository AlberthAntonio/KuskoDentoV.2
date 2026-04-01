"use client";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const body = (await response.json()) as ApiEnvelope<T> | T;

  if (!response.ok) {
    const error =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error?: string }).error || 'Error de API')
        : 'Error de API';
    throw new Error(error);
  }

  if (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    (body as ApiEnvelope<T>).success !== undefined
  ) {
    const wrapped = body as ApiEnvelope<T>;
    if (!wrapped.success) {
      throw new Error(wrapped.error || 'Error de API');
    }
    return wrapped.data as T;
  }

  return body as T;
}

const toNumber = (value: string | number | null | undefined) => Number(value ?? 0);
const toDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('es-PE');
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo convertir archivo'));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer archivo'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string, fallbackType = 'application/octet-stream'): Blob {
  const parts = dataUrl.split(',');
  if (parts.length < 2) {
    return new Blob([dataUrl], { type: fallbackType });
  }

  const header = parts[0];
  const body = parts[1];
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || fallbackType;

  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

function splitName(fullName: string): { names: string; lastNames: string } {
  const chunks = fullName.trim().split(/\s+/).filter(Boolean);
  if (chunks.length <= 1) {
    return { names: chunks[0] ?? fullName, lastNames: '' };
  }
  return {
    names: chunks.slice(0, -1).join(' '),
    lastNames: chunks[chunks.length - 1],
  };
}

export type UserRole = 'admin' | 'clinic' | 'doctor' | 'assistant' | 'technician';

export interface User {
  id: string;
  username?: string;
  password?: string;
  role: UserRole;
  fullName?: string;
  dni?: string;
  clinicId?: string;
  email?: string;
  status?: 'active' | 'inactive';
  subscriptionFee?: number;
  subscriptionStatus: 'active' | 'suspended' | 'blocked';
  nextPaymentDate?: string;
  contractStartDate?: string;
  paymentFrequency?: 'monthly' | 'yearly';
  registeredByAdminId?: string;
  primaryColor?: string;
  brandName?: string;
  slogan?: string;
  theme?: 'light' | 'dark' | 'system';
  lastLogin?: string;
  address?: string;
  colegiatura?: string;
  photo?: string;
}

export interface Patient {
  id: string;
  dni: string;
  names: string;
  lastNames: string;
  email?: string;
  phone: string;
  address: string;
  clinicId?: string;
  registrationDate?: string;
  attendedBy?: string;
  underTreatment?: boolean;
  proneToBleeding?: boolean;
  allergicToMeds?: boolean;
  consultationReason?: string;
  diagnostic?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  treatmentId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  scheduledAt?: string;
  time: string;
  status: 'Asignado' | 'Atendido';
  cost: number;
  clinicId?: string;
  observations?: string;
}

export interface Payment {
  id: string;
  patientId: string;
  appointmentId: string;
  treatmentName: string;
  totalPaid: number;
  balance: number;
  date: string;
  totalCost: number;
  history?: Array<{
    amount: number;
    date: string;
    method?: string;
  }>;
}

export interface SubscriptionPayment {
  id: string;
  clinicId?: string;
  clinicName?: string;
  amount: number;
  date: string;
  status?: 'pending' | 'paid';
  concept?: string;
  processedByAdminId?: string;
}

export interface Consent {
  id: string;
  patientId: string;
  type: string;
  date: string;
  fileBlob: Blob;
  fileType: string;
  fileName: string;
}

export interface Treatment {
  id: string;
  name: string;
  price: number;
  clinicId?: string;
}

export interface Radiograph {
  id: string;
  patientId: string;
  appointmentId?: string;
  fileUrl: string;
  type?: string;
  clinicId?: string;
  date: string;
  fileBlob: Blob;
  fileType: string;
  fileName: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit_cost?: number;
  minQuantity: number;
  clinicId?: string;
  category: string;
  unit: string;
  lastUpdated: string;
}

const PAYMENT_METHODS_STORAGE_KEY = 'kusko_payment_methods_v1';

function readPaymentMethodsStorage(): PaymentMethod[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PAYMENT_METHODS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PaymentMethod[]) : [];
  } catch {
    return [];
  }
}

function writePaymentMethodsStorage(items: PaymentMethod[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(items));
}

export interface Odontogram {
  id: string;
  patientId: string;
  appointmentId?: string;
  data_json?: unknown;
  clinicId?: string;
  date: string;
  data: Record<number, any>;
  diagnostic?: string;
}

export interface PaymentMethod {
  id: string;
  name?: string;
  type: 'cash' | 'card' | 'check' | 'transfer' | 'bank' | 'qr';
  active?: boolean;
  label?: string;
  value?: string;
  qrImage?: string;
}

export const db = {
  async getAll<T = unknown>(table: string): Promise<T[]> {
    try {
      if (table === 'payments') {
        const data = await apiGet<{ items?: Array<{
          id: string;
          patient_id: string;
          appointment_id: string;
          total_cost: string | number;
          total_paid: string | number;
          balance: string | number;
          created_at?: string;
          appointment?: { treatment?: { name?: string | null } | null } | null;
          payment_histories?: Array<{
            amount_paid: string | number;
            payment_date: string;
            payment_method?: string | null;
          }>;
        }> }>('/api/payments');

        const items = (data.items || []).map((item) => ({
          id: item.id,
          patientId: item.patient_id,
          appointmentId: item.appointment_id,
          treatmentName: item.appointment?.treatment?.name || 'Consulta',
          totalPaid: toNumber(item.total_paid),
          balance: toNumber(item.balance),
          totalCost: toNumber(item.total_cost),
          date: toDate(item.created_at),
          history: (item.payment_histories || []).map((h) => ({
            amount: toNumber(h.amount_paid),
            date: toDate(h.payment_date),
            method: h.payment_method || undefined,
          })),
        }));

        return items as T[];
      }

      if (table === 'appointments') {
        const data = await apiGet<{ items?: Array<{
          id: string;
          clinic_id: string;
          patient_id: string;
          treatment_id?: string | null;
          doctor?: { full_name?: string | null } | null;
          date: string;
          time: string;
          status: string;
          cost: string | number;
          observations?: string | null;
        }> }>('/api/appointments');

        const items = (data.items || []).map((item) => ({
          id: item.id,
          clinicId: item.clinic_id,
          patientId: item.patient_id,
          treatmentId: item.treatment_id || '',
          doctorId: '',
          doctorName: item.doctor?.full_name || 'No asignado',
          date: toDate(item.date),
          scheduledAt: item.date,
          time: item.time,
          status: item.status === 'completed' ? 'Atendido' : 'Asignado',
          cost: toNumber(item.cost),
          observations: item.observations || undefined,
        }));

        return items as T[];
      }

      if (table === 'patients') {
        const data = await apiGet<{ items?: Array<{
          id: string;
          clinic_id: string;
          dni: string;
          full_name: string;
          email?: string | null;
          phone: string;
          address: string;
          created_at?: string;
          under_treatment?: boolean;
          prone_to_bleeding?: boolean;
          allergic_to_meds?: boolean;
          medical_observations?: string | null;
        }> }>('/api/patients?limit=200');

        const items = (data.items || []).map((item) => {
          const names = splitName(item.full_name);
          const observations = (item.medical_observations || '').split('|').map((v) => v.trim()).filter(Boolean);

          return {
            id: item.id,
            dni: item.dni,
            names: names.names,
            lastNames: names.lastNames,
            email: item.email || undefined,
            phone: item.phone,
            address: item.address,
            clinicId: item.clinic_id,
            registrationDate: toDate(item.created_at),
            attendedBy: undefined,
            underTreatment: Boolean(item.under_treatment),
            proneToBleeding: Boolean(item.prone_to_bleeding),
            allergicToMeds: Boolean(item.allergic_to_meds),
            consultationReason: observations[0] || 'No registrado',
            diagnostic: observations.slice(1).join(' | ') || 'Evaluacion inicial',
          };
        });

        return items as T[];
      }

      if (table === 'odontograms') {
        const data = await apiGet<{ items?: Array<{
          id: string;
          patient_id: string;
          appointment_id?: string | null;
          data_json: unknown;
          notes?: string | null;
          created_at: string;
        }> }>('/api/odontograms');

        const items = (data.items || []).map((item) => ({
          id: item.id,
          patientId: item.patient_id,
          appointmentId: item.appointment_id || undefined,
          data_json: item.data_json,
          data: (item.data_json as Record<number, any>) || {},
          diagnostic: item.notes || undefined,
          date: item.created_at,
        }));

        return items as T[];
      }

      if (table === 'treatments') {
        const data = await apiGet<{ items?: Array<{
          id: string;
          name: string;
          price: string | number;
          clinic_id: string;
        }> }>('/api/treatments');

        const items = (data.items || []).map((item) => ({
          id: item.id,
          name: item.name,
          price: toNumber(item.price),
          clinicId: item.clinic_id,
        }));

        return items as T[];
      }

      if (table === 'inventory') {
        const data = await apiGet<{ items?: Array<{
          id: string;
          name: string;
          quantity: number;
          min_quantity: number;
          category?: string | null;
          description?: string | null;
          unit_cost?: string | number;
          clinic_id: string;
          updated_at: string;
        }> }>('/api/inventory');

        const items = (data.items || []).map((item) => {
          const description = item.description || '';
          const unit = description.startsWith('UNIT:') ? description.replace('UNIT:', '').trim() : 'Unidades';

          return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit_cost: toNumber(item.unit_cost),
            minQuantity: item.min_quantity,
            clinicId: item.clinic_id,
            category: item.category || 'Varios',
            unit,
            lastUpdated: item.updated_at,
          };
        });

        return items as T[];
      }

      if (table === 'payment_methods') {
        return readPaymentMethodsStorage() as T[];
      }

      if (table === 'radiographs') {
        const data = await apiGet<{ items?: Array<{
          id: string;
          patient_id: string;
          appointment_id?: string | null;
          file_url: string;
          file_name: string;
          mime_type?: string | null;
          type?: string | null;
          created_at: string;
          clinic_id: string;
        }> }>('/api/radiographs');

        const items = (data.items || []).map((item) => ({
          id: item.id,
          patientId: item.patient_id,
          appointmentId: item.appointment_id || undefined,
          fileUrl: item.file_url,
          type: item.type || undefined,
          clinicId: item.clinic_id,
          date: toDate(item.created_at),
          fileBlob: dataUrlToBlob(item.file_url, item.mime_type || 'image/*'),
          fileType: item.mime_type || 'image/*',
          fileName: item.file_name,
        }));

        return items as T[];
      }

      if (table === 'consents') {
        const data = await apiGet<{ items?: Array<{
          id: string;
          patient_id: string;
          consent_type: string;
          document_url?: string | null;
          accepted_at?: string | null;
        }> }>('/api/consents');

        const items = (data.items || [])
          .filter((item) => Boolean(item.document_url))
          .map((item) => ({
            id: item.id,
            patientId: item.patient_id,
            type: item.consent_type,
            date: toDate(item.accepted_at),
            fileBlob: dataUrlToBlob(item.document_url as string),
            fileType: (item.document_url || '').split(';')[0].replace('data:', '') || 'application/pdf',
            fileName: item.consent_type,
          }));

        return items as T[];
      }
    } catch {
      return [] as T[];
    }

    return [] as T[];
  },
  async getAllUsers(): Promise<User[]> {
    return [];
  },
  async getAllPatients(): Promise<Patient[]> {
    return [];
  },
  async getAllAppointments(): Promise<Appointment[]> {
    return [];
  },
  async getAllPayments(): Promise<Payment[]> {
    return [];
  },
  async getById<T = unknown>(table: string, id: string): Promise<T | null> {
    try {
      if (table === 'patients') {
        const item = await apiGet<{
          id: string;
          dni: string;
          full_name: string;
          email?: string | null;
          phone: string;
          address: string;
          created_at?: string;
          under_treatment?: boolean;
          prone_to_bleeding?: boolean;
          allergic_to_meds?: boolean;
          medical_observations?: string | null;
        }>(`/api/patients/${id}`);

        const names = splitName(item.full_name);
        const observations = (item.medical_observations || '').split('|').map((v) => v.trim()).filter(Boolean);

        return {
          id: item.id,
          dni: item.dni,
          names: names.names,
          lastNames: names.lastNames,
          email: item.email || undefined,
          phone: item.phone,
          address: item.address,
          registrationDate: toDate(item.created_at),
          attendedBy: undefined,
          underTreatment: Boolean(item.under_treatment),
          proneToBleeding: Boolean(item.prone_to_bleeding),
          allergicToMeds: Boolean(item.allergic_to_meds),
          consultationReason: observations[0] || 'No registrado',
          diagnostic: observations.slice(1).join(' | ') || 'Evaluacion inicial',
        } as T;
      }
    } catch {
      return null;
    }

    return null;
  },
  async exportData(): Promise<string> {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      data: {},
    });
  },
  async importData(_data: unknown): Promise<void> {},
  put: async (tableOrData: string | unknown, maybeData?: unknown): Promise<null> => {
    const table = typeof tableOrData === 'string' ? tableOrData : undefined;
    const payload = (typeof tableOrData === 'string' ? maybeData : tableOrData) as Record<string, unknown> | undefined;

    if (table === 'odontograms' && payload) {
      const response = await fetch('/api/odontograms', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: payload.patientId,
          appointment_id: payload.appointmentId,
          data_json: payload.data,
          notes: payload.diagnostic,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'No se pudo guardar el odontograma');
      }

      return null;
    }

    if (table === 'treatments' && payload) {
      const response = await fetch('/api/treatments', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: payload.id,
          name: payload.name,
          price: toNumber(payload.price as string | number),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'No se pudo guardar el tratamiento');
      }

      return null;
    }

    if (table === 'inventory' && payload) {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: payload.id,
          name: payload.name,
          category: payload.category,
          quantity: Number(payload.quantity || 0),
          min_quantity: Number(payload.minQuantity || 0),
          unit: payload.unit,
          unit_cost: Number(payload.unit_cost || 0),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'No se pudo guardar el item de inventario');
      }

      return null;
    }

    if (table === 'payment_methods' && payload) {
      const current = readPaymentMethodsStorage();
      const id = String(payload.id || crypto.randomUUID());
      const next = [
        ...current.filter((item) => item.id !== id),
        {
          id,
          type: (payload.type as PaymentMethod['type']) || 'bank',
          label: String(payload.label || ''),
          value: String(payload.value || ''),
          qrImage: payload.qrImage ? String(payload.qrImage) : undefined,
        },
      ];
      writePaymentMethodsStorage(next);
      return null;
    }

    if ((table === 'radiographs' || table === 'consents') && payload) {
      const fileBlob = payload.fileBlob instanceof Blob ? payload.fileBlob : null;
      if (!fileBlob) {
        throw new Error('Archivo invalido');
      }

      const fileUrl = await blobToDataUrl(fileBlob);

      if (table === 'radiographs') {
        const response = await fetch('/api/radiographs', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patient_id: payload.patientId,
            appointment_id: payload.appointmentId,
            file_url: fileUrl,
            file_name: payload.fileName,
            file_size: Number(fileBlob.size || 0),
            mime_type: payload.fileType,
            type: payload.type,
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || 'No se pudo guardar la radiografia');
        }

        return null;
      }

      const response = await fetch('/api/consents', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: payload.patientId,
          appointment_id: payload.appointmentId,
          consent_type: payload.fileName,
          document_url: fileUrl,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'No se pudo guardar el consentimiento');
      }

      return null;
    }

    throw new Error(`Operacion put no soportada para ${String(table || 'desconocido')}`);

    return null;
  },
  delete: async (table: string, id: string) => {
    if (table === 'treatments') {
      const response = await fetch(`/api/treatments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'No se pudo eliminar el tratamiento');
      }

      return null;
    }

    if (table === 'inventory') {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'No se pudo eliminar el item de inventario');
      }

      return null;
    }

    if (table === 'payment_methods') {
      const current = readPaymentMethodsStorage();
      writePaymentMethodsStorage(current.filter((item) => item.id !== id));
      return null;
    }

    if (table === 'radiographs') {
      const response = await fetch(`/api/radiographs/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'No se pudo eliminar la radiografia');
      }

      return null;
    }

    if (table === 'consents') {
      const response = await fetch(`/api/consents/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'No se pudo eliminar el consentimiento');
      }

      return null;
    }

    throw new Error(`Operacion delete no soportada para ${table}`);
    return null;
  },
};