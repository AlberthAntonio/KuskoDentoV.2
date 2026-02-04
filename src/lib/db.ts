"use client";

const DB_NAME = "KuskoDentoDB";
const DB_VERSION = 2;

export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin';
}

export interface Patient {
  id: string;
  dni: string;
  names: string;
  lastNames: string;
  age: number;
  phone: string;
  address: string;
  registrationDate: string;
}

export interface Treatment {
  id: string;
  name: string;
  price: number;
}

export interface PatientTreatment {
  id: string;
  patientId: string;
  treatmentId: string;
  actualPrice: number;
  date: string;
  notes?: string;
}

export interface Payment {
  id: string;
  patientId: string;
  treatmentId: string;
  amount: number;
  date: string;
  type: 'Adelanto' | 'Saldo' | 'Cancelado';
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

export interface Appointment {
  id: string;
  patientId: string;
  date: string;
  time: string;
  doctor: string;
}

export interface Odontogram {
  id: string;
  patientId: string;
  data: any; // JSON representation of tooth states
  date: string;
}

export class LocalDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('patients')) {
          db.createObjectStore('patients', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('treatments')) {
          db.createObjectStore('treatments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('patient_treatments')) {
          db.createObjectStore('patient_treatments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('payments')) {
          db.createObjectStore('payments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('radiographs')) {
          db.createObjectStore('radiographs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('consents')) {
          db.createObjectStore('consents', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('appointments')) {
          db.createObjectStore('appointments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('odontograms')) {
          db.createObjectStore('odontograms', { keyPath: 'id' });
        }
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

      request.onsuccess = () => resolve(request.result);
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
    const stores = ['users', 'patients', 'treatments', 'patient_treatments', 'payments', 'radiographs', 'consents', 'appointments', 'odontograms'];
    const data: any = {};

    for (const store of stores) {
      const items = await this.getAll(store);
      // For blobs, we need to convert them to base64 or similar if we want a pure JSON backup.
      // For simplicity in this demo, we'll try to serialize what we can.
      // In a real app, blobs would be handled with FileReader.
      data[store] = await Promise.all(items.map(async (item: any) => {
        if (item.fileBlob) {
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
