import { cn } from "@/lib/utils";
import { CheckCircle, Clock, XCircle, User, Hash } from "lucide-react";

interface DeploymentCardProps {
  service: string;
  version: string;
  author: string;
  timestamp: string;
  status: 'success' | 'in-progress' | 'failed';
  commitHash: string;
  environment: string;
  className?: string;
  style?: React.CSSProperties;
}

export function DeploymentCard({
  service,
  version,
  author,
  timestamp,
  status,
  commitHash,
  environment,
  className,
  style
}: DeploymentCardProps) {
  const statusConfig = {
    success: {
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10'
    },
    'in-progress': {
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10'
    },
    failed: {
      icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10'
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className={cn("service-card", className)} style={style}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("p-1.5 rounded-full", config.bg)}>
              <StatusIcon className={cn("h-4 w-4", config.color)} />
            </div>
            <div>
              <h4 className="font-medium text-card-foreground">{service}</h4>
              <p className="text-xs text-muted-foreground">{version}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              <code className="font-mono">{commitHash}</code>
            </div>
            <span>{environment}</span>
          </div>
        </div>
        
        <div className="text-right">
          <div className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            {
              "status-healthy": status === 'success',
              "status-warning": status === 'in-progress',
              "status-error": status === 'failed',
            }
          )}>
            <span className="capitalize">{status === 'in-progress' ? 'In Progress' : status}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{timestamp}</p>
        </div>
      </div>
    </div>
  );
}