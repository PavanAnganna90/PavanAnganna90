import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  className?: string;
  style?: React.CSSProperties;
}

export const MetricCard = React.memo(function MetricCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon: Icon,
  className,
  style
}: MetricCardProps) {
  return (
    <div className={cn("metric-card", className)} style={style}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change && (
            <p className={cn(
              "text-sm mt-2 flex items-center gap-1",
              {
                "text-success": changeType === 'positive',
                "text-destructive": changeType === 'negative',
                "text-muted-foreground": changeType === 'neutral',
              }
            )}>
              <span>{change}</span>
            </p>
          )}
        </div>
        <div className="bg-primary/10 p-3 rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.change === nextProps.change &&
    prevProps.changeType === nextProps.changeType &&
    prevProps.icon === nextProps.icon &&
    prevProps.className === nextProps.className
  );
});