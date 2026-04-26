"use client";

import { createContext, useContext, useEffect, useState } from 'react';

type FocusState = {
  activeAppointmentId: string | null;
  activePatientId: string | null;
  activeStartAt: number | null;
  focusMode: boolean;
};

type FocusContextType = FocusState & {
  startFocus: (appointmentId: string, patientId: string) => void;
  stopFocus: () => void;
  setFocusMode: (active: boolean) => void;
  elapsedSeconds: number;
};

const FocusContext = createContext<FocusContextType | undefined>(undefined);
const FOCUS_STORAGE_KEY = 'cuscodento.focusState';

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FocusState>({
    activeAppointmentId: null,
    activePatientId: null,
    activeStartAt: null,
    focusMode: false,
  });

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FOCUS_STORAGE_KEY);
      if (saved) {
        setState(JSON.parse(saved));
      }
    } catch {
      localStorage.removeItem(FOCUS_STORAGE_KEY);
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (state.activeAppointmentId) {
      localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(FOCUS_STORAGE_KEY);
    }
  }, [state]);

  // Timer logic
  useEffect(() => {
    if (!state.activeStartAt) {
      setElapsedSeconds(0);
      return;
    }
    setElapsedSeconds(Math.floor((Date.now() - state.activeStartAt) / 1000));
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - state.activeStartAt!) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [state.activeStartAt]);

  const startFocus = (appointmentId: string, patientId: string) => {
    setState({
      activeAppointmentId: appointmentId,
      activePatientId: patientId,
      activeStartAt: Date.now(),
      focusMode: false, // Default is false, user turns it on manually
    });
  };

  const stopFocus = () => {
    setState({
      activeAppointmentId: null,
      activePatientId: null,
      activeStartAt: null,
      focusMode: false,
    });
  };

  const setFocusMode = (active: boolean) => {
    setState((prev) => ({ ...prev, focusMode: active }));
  };

  return (
    <FocusContext.Provider value={{ ...state, elapsedSeconds, startFocus, stopFocus, setFocusMode }}>
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const context = useContext(FocusContext);
  if (context === undefined) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
}
