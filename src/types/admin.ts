export type AdminUserRole = 'admin' | 'clinic' | 'doctor' | 'assistant' | 'technician';

export type SubscriptionStatus = 'active' | 'suspended' | 'blocked';

export interface AdminUser {
  id: string;
  username?: string;
  role: AdminUserRole;
  fullName?: string;
  ownerName?: string;
  dni?: string;
  clinicId?: string;
  status?: 'active' | 'inactive';
  subscriptionFee?: number;
  subscriptionStatus: SubscriptionStatus;
  nextPaymentDate?: string;
  contractStartDate?: string;
  paymentFrequency?: 'monthly' | 'yearly';
  registeredByAdminId?: string;
  address?: string;
  colegiatura?: string;
  photo?: string;
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

export interface AdminReportsPayload {
  clinicsData: Array<{
    name: string;
    patients: number;
  }>;
  growthData: Array<{
    name: string;
    value: number;
  }>;
  stats: {
    totalClinics: number;
    totalPatients: number;
    totalAppointments: number;
    totalRevenue: number;
  };
}
