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
    className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    Icon: Crown,
  },
  Moderator: {
    label: 'Mod',
    className: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    Icon: Shield,
  },
  Participant: {
    label: 'Viewer',
    className: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
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
