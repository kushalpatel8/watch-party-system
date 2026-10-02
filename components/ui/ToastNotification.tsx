'use client';

import { useToastStore, type ToastItem, type ToastType } from '@/store/toastStore';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Send,
  X,
} from 'lucide-react';

function getToastStyles(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-white/95 dark:bg-[#253248]/95 border-emerald-500/30 text-stone-900 dark:text-white shadow-[0_8px_25px_rgba(16,185,129,0.15)] dark:shadow-[0_8px_30px_rgba(16,185,129,0.2)]',
        icon: CheckCircle2,
        iconColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30',
        bar: 'bg-emerald-500',
      };
    case 'error':
      return {
        bg: 'bg-white/95 dark:bg-[#2d222b]/95 border-rose-500/30 text-stone-900 dark:text-white shadow-[0_8px_25px_rgba(244,63,94,0.15)] dark:shadow-[0_8px_30px_rgba(244,63,94,0.2)]',
        icon: XCircle,
        iconColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30',
        bar: 'bg-rose-500',
      };
    case 'warning':
      return {
        bg: 'bg-white/95 dark:bg-[#2d2822]/95 border-amber-500/30 text-stone-900 dark:text-white shadow-[0_8px_25px_rgba(245,158,11,0.15)] dark:shadow-[0_8px_30px_rgba(245,158,11,0.2)]',
        icon: AlertTriangle,
        iconColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30',
        bar: 'bg-amber-500',
      };
    case 'request':
      return {
        bg: 'bg-white/95 dark:bg-[#253248]/95 border-[#e8890c]/40 dark:border-amber-500/40 text-stone-900 dark:text-white shadow-[0_8px_25px_rgba(232,137,12,0.18)] dark:shadow-[0_8px_30px_rgba(245,158,11,0.25)]',
        icon: Send,
        iconColor: 'text-[#d97706] dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30',
        bar: 'bg-gradient-to-r from-[#e8890c] to-[#d97706]',
      };
    case 'info':
    default:
      return {
        bg: 'bg-white/95 dark:bg-[#253248]/95 border-stone-300/80 dark:border-white/10 text-stone-900 dark:text-white shadow-[0_8px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]',
        icon: Info,
        iconColor: 'text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-white/10 border border-stone-200 dark:border-white/10',
        bar: 'bg-stone-500 dark:bg-stone-400',
      };
  }
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-container"
      className="fixed top-3 sm:top-5 right-3 sm:right-5 left-3 sm:left-auto sm:max-w-sm z-[100] flex flex-col gap-2.5 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t: ToastItem) => {
        const styles = getToastStyles(t.type);
        const Icon = styles.icon;

        return (
          <div
            key={t.id}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-3.5 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 flex items-start gap-3 group ${styles.bg}`}
          >
            {/* Left Icon Pill */}
            <div className={`p-2 rounded-xl flex-shrink-0 flex items-center justify-center ${styles.iconColor}`}>
              <Icon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white leading-tight">
                {t.title}
              </p>
              {t.description && (
                <p className="text-[11px] sm:text-xs text-stone-600 dark:text-white/70 mt-0.5 leading-relaxed break-words">
                  {t.description}
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg text-stone-400 dark:text-white/40 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Bottom accent indicator */}
            <div className={`absolute bottom-0 left-0 right-0 h-[2px] opacity-80 ${styles.bar}`} />
          </div>
        );
      })}
    </div>
  );
}
