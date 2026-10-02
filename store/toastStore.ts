import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'request';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
  timestamp: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = nanoid();
    const newToast: ToastItem = {
      ...toast,
      id,
      timestamp: Date.now(),
      duration: toast.duration ?? 4500,
    };
    set((state) => ({
      toasts: [...state.toasts.slice(-4), newToast], // keep max 5 at once
    }));

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, newToast.duration);
    }

    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

// Quick helper functions
export const toast = {
  success: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().addToast({ title, description, type: 'success', duration }),
  error: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().addToast({ title, description, type: 'error', duration }),
  info: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().addToast({ title, description, type: 'info', duration }),
  warning: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().addToast({ title, description, type: 'warning', duration }),
  request: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().addToast({ title, description, type: 'request', duration }),
};
