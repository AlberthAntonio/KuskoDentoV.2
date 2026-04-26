export type PatientsListView = 'summary' | 'lookup' | 'full';
export type AppointmentsListView = 'calendar' | 'billing';

export interface JwtClaimsDTO {
  sub: string;
  clinic_id: string;
  role: string;
}

export interface PatientSummaryDTO {
  id: string;
  dni: string;
  full_name: string;
}

export interface PatientLookupDTO {
  id: string;
  dni: string;
  full_name: string;
}

export interface PatientFullListDTO {
  id: string;
  clinic_id: string;
  dni: string;
  full_name: string;
  email: string | null;
  phone: string;
  address: string;
  created_at: Date;
  under_treatment: boolean;
  prone_to_bleeding: boolean;
  allergic_to_meds: boolean;
  medical_observations: string | null;
}

export interface PatientDetailDTO {
  id: string;
  clinic_id: string;
  dni: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string;
  address: string;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  gender: string | null;
  under_treatment: boolean;
  prone_to_bleeding: boolean;
  allergic_to_meds: boolean;
  medical_observations: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AppointmentCalendarDTO {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  treatment_id: string | null;
  date: Date;
  time: string;
  status: string;
  cost: unknown;
  observations: string | null;
  patient: {
    id: string;
    full_name: string;
  };
  doctor: {
    id: string;
    full_name: string | null;
  };
  treatment: {
    id: string;
    name: string;
    price: unknown;
  } | null;
  appointment_treatments: Array<{
    treatment: {
      id: string;
      name: string;
      price: unknown;
    } | null;
    price: unknown;
    observations: string | null;
  }>;
}

export interface AppointmentBillingDTO {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  treatment_id: string | null;
  date: Date;
  time: string;
  status: string;
  cost: unknown;
  observations: string | null;
  patient: {
    id: string;
    full_name: string;
    dni: string;
  };
  doctor: {
    id: string;
    full_name: string | null;
  };
  treatment: {
    id: string;
    name: string;
    price: unknown;
  } | null;
  appointment_treatments: Array<{
    treatment: {
      id: string;
      name: string;
      price: unknown;
    } | null;
    price: unknown;
    observations: string | null;
  }>;
}
