import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface ServiceCardProps {
  name: string;
  description: string;
  status: 'healthy' | 'warning' | 'error';
  version: string;
  lastDeployed: string;
  url?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ServiceCard({
  name,
  description,
  status,
  version,
  lastDeployed,
  url,
  className,
  style
}: ServiceCardProps) {
  return (
    <div className={cn("service-card", className)} style={style}>
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-card-foreground text-sm sm:text-base truncate">{name}</h3>
            <div className={cn(
              "w-2 h-2 rounded-full shrink-0",
              {
                "bg-success": status === 'healthy',
                "bg-warning": status === 'warning',
                "bg-destructive": status === 'error',
              }
            )} />
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2">{description}</p>
        </div>
        {url && (
          <button className="text-muted-foreground hover:text-primary transition-colors shrink-0">
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs text-muted-foreground">
        <span className="truncate">Version {version}</span>
        <span className="truncate">Deployed {lastDeployed}</span>
      </div>
      
      <div className={cn(
        "status-indicator mt-3",
        {
          "status-healthy": status === 'healthy',
          "status-warning": status === 'warning',
          "status-error": status === 'error',
        }
      )}>
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          {
            "bg-success": status === 'healthy',
            "bg-warning": status === 'warning',
            "bg-destructive": status === 'error',
          }
        )} />
        <span className="capitalize">{status}</span>
      </div>
    </div>
  );
}