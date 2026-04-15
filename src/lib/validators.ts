import { z } from 'zod';

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const optionalEmail = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().email().optional());

const optionalCuid = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().cuid().optional());

export const LoginSchema = z.object({
  identifier: optionalTrimmedString,
  id: optionalTrimmedString,
  username: optionalTrimmedString,
  email: optionalTrimmedString,
  password: z.string().min(8),
  clinic_id: optionalCuid,
}).refine((data) => Boolean(data.identifier || data.id || data.username || data.email), {
  message: 'Debe enviar ID, usuario o correo',
  path: ['identifier'],
});

export const CreatePatientSchema = z.object({
  dni: z.string().min(5),
  full_name: z.string().min(2),
  phone: z.string().min(6),
  address: z.string().min(3),
  email: optionalEmail,
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  gender: z.string().optional(),
  medical_observations: z.string().optional(),
});

export const UpdatePatientSchema = CreatePatientSchema.partial();

export const CreateAppointmentSchema = z.object({
  patient_id: z.string().cuid(),
  doctor_id: z.string().cuid(),
  treatment_id: z.string().cuid().optional(),
  date: z.coerce.date(),
  time: z.string().min(4),
  cost: z.number().positive(),
  status: z.string().optional(),
});

export const CreatePaymentSchema = z.object({
  patient_id: z.string().cuid(),
  appointment_id: z.string().cuid(),
  amount: z.number().positive(),
  payment_method: z.string().min(2).optional(),
  notes: z.string().optional(),
  total_cost: z.number().positive().optional(),
});

export const AddPaymentHistorySchema = z.object({
  amount_paid: z.number().positive(),
  payment_method: z.string().min(2),
  reference: z.string().optional(),
});

export const UpsertTreatmentSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(2),
  price: z.number().nonnegative(),
});

export const UpsertInventoryItemSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(2),
  category: z.string().optional(),
  quantity: z.number().int().nonnegative(),
  min_quantity: z.number().int().nonnegative(),
  unit: z.string().optional(),
  unit_cost: z.number().nonnegative().optional(),
});
