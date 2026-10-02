import type { Role } from '@/types/roles';
import { cn } from '@/lib/utils';
import { Crown, Shield, User } from 'lucide-react';

interface RoleBadgeProps {
  role: Role;
  className?: string;
  showIcon?: boolean;
}

const roleConfig: Record<Role, { label: string; className: string; Icon: React.ComponentType<any> }> = {
  Host: {
    label: 'Host',
    className: 'bg-amber-100 dark:bg-amber-500/15 text-[#b45309] dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 font-bold',
    Icon: Crown,
  },
  Moderator: {
    label: 'Mod',
    className: 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-500/30 font-bold',
    Icon: Shield,
  },
  Participant: {
    label: 'Viewer',
    className: 'bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-white/80 border border-stone-300 dark:border-white/10 font-bold',
    Icon: User,
  },
};

export function RoleBadge({ role, className, showIcon = true }: RoleBadgeProps) {
  const { label, className: roleClass, Icon } = roleConfig[role];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
        roleClass,
        className
      )}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}
