
"use client";

const DB_NAME = "KuskoDentoDB";
const DB_VERSION = 9;

export type UserRole = 'admin' | 'clinic' | 'doctor' | 'assistant' | 'technician';

export interface User {
  id: string;
  username?: string; 
  password?: string; 
  role: UserRole;
  fullName?: string;
  dni?: string;
  address?: string;
  photo?: string;
  colegiatura?: string;
  clinicId?: string; 
  lastLogin?: string;
  status?: 'active' | 'inactive';
  subscriptionFee?: number;
  nextPaymentDate?: string;
  contractStartDate?: string;
  paymentFrequency?: 'monthly' | 'yearly';
  subscriptionStatus: 'active' | 'suspended' | 'blocked';
  registeredByAdminId?: string;
  primaryColor?: string; // Campo para personalización de color
}

export interface Patient {
  id: string;
  dni: string;
  names: string;
  lastNames: string;
  email?: string;
  phone: string;
  address: string;
  photo?: string;
  age?: number;
  registrationDate: string;
  underTreatment: boolean;
  proneToBleeding: boolean;
  allergicToMeds: boolean;
  allergiesDetail?: string;
  hypertensive: boolean;
  diabetic: boolean;
  pregnant: boolean;
  consultationReason: string;
  diagnostic: string;
  medicalObservations: string;
  attendedBy: string;
  clinicId?: string;
}

export interface Treatment {
  id: string;
  name: string;
  price: number;
  clinicId?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  treatmentId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  observations: string;
  status: 'Asignado' | 'Atendido';
  cost: number;
  applyDiscount: boolean;
  paidAmount: number;
  balance: number;
  clinicId?: string;
}

export interface PaymentHistory {
  date: string;
  time: string;
  amount: number;
}

export interface Payment {
  id: string;
  patientId: string;
  appointmentId: string;
  treatmentName: string;
  amount: number;
  totalCost: number;
  totalPaid: number;
  balance: number;
  date: string;
  time: string;
  observations: string;
  history?: PaymentHistory[];
  clinicId?: string;
}

export interface Radiograph {
  id: string;
  patientId: string;
  fileName: string;
  fileType: string;
  fileBlob: Blob;
  date: string;
}

export interface Consent {
  id: string;
  patientId: string;
  fileName: string;
  fileType: string;
  fileBlob: Blob;
  date: string;
}

export interface Odontogram {
  id: string;
  patientId: string;
  data: any;
  date: string;
  diagnostic?: string;
}

export interface SubscriptionPayment {
  id: string;
  clinicId: string;
  clinicName: string;
  amount: number;
  date: string;
  concept: string;
  processedByAdminId?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'qr' | 'bank';
  label: string;
  value: string;
  qrImage?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  lastUpdated: string;
  clinicId: string;
}

export class LocalDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        const stores = [
          'users', 'patients', 'treatments', 'patient_treatments', 'appointments', 
          'payments', 'radiographs', 'consents', 'odontograms', 'subscription_payments',
          'payment_methods', 'inventory'
        ];

        stores.forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | undefined> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName: string, data: any): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async exportData(): Promise<string> {
    await this.init();
    const stores = ['users', 'patients', 'treatments', 'patient_treatments', 'appointments', 'payments', 'radiographs', 'consents', 'odontograms', 'subscription_payments', 'payment_methods', 'inventory'];
    const data: any = {};

    for (const store of stores) {
      const items = await this.getAll(store);
      data[store] = await Promise.all(items.map(async (item: any) => {
        if (item.fileBlob instanceof Blob) {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(item.fileBlob);
          });
          return { ...item, fileBlob: base64 };
        }
        return item;
      }));
    }

    return JSON.stringify(data);
  }

  async importData(jsonData: string): Promise<void> {
    await this.init();
    const data = JSON.parse(jsonData);
    const stores = Object.keys(data);

    for (const storeName of stores) {
      if (!this.db!.objectStoreNames.contains(storeName)) continue;
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.clear();

      for (const item of data[storeName]) {
        let finalItem = { ...item };
        if (typeof item.fileBlob === 'string' && item.fileBlob.startsWith('data:')) {
          const res = await fetch(item.fileBlob);
          finalItem.fileBlob = await res.blob();
        }
        store.put(finalItem);
      }
    }
  }
}

export const db = new LocalDB();
