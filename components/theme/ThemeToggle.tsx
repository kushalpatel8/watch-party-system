'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <div className={`p-2 rounded-xl bg-white dark:bg-[#151f38] border border-stone-200 dark:border-white/10 w-9 h-9 flex items-center justify-center ${className}`}>
        <div className="w-4 h-4 rounded-full bg-amber-500/30 animate-pulse" />
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`p-2 rounded-xl bg-white dark:bg-[#151f38] hover:bg-stone-50 dark:hover:bg-[#1a2544] border border-stone-200 dark:border-white/10 text-amber-500 dark:text-amber-400 transition-all shadow-xs cursor-pointer active:scale-90 flex items-center justify-center group ${className}`}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20 group-hover:rotate-45 transition-transform duration-300" />
      ) : (
        <Moon className="w-4 h-4 text-amber-500 fill-amber-500/20 group-hover:-rotate-12 transition-transform duration-300" />
      )}
    </button>
  );
}
