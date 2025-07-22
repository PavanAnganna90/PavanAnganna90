import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface StatusIndicatorProps {
  status: 'healthy' | 'warning' | 'error';
  label: string;
  className?: string;
}

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const Icon = {
    healthy: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
  }[status];

  return (
    <div className={cn(
      "status-indicator",
      {
        "status-healthy": status === 'healthy',
        "status-warning": status === 'warning',
        "status-error": status === 'error',
      },
      className
    )}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}