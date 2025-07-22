'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Cloud, 
  Server, 
  Database,
  Zap,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { MetricCard } from '@/components/orbit/MetricCard';
import { StatusIndicator } from '@/components/orbit/StatusIndicator';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';

interface CostMetrics {
  totalCost: number;
  monthlyChange: number;
  projectedCost: number;
  budgetUtilization: number;
  providers: {
    aws: number;
    azure: number;
    gcp: number;
  };
  services: {
    compute: number;
    storage: number;
    network: number;
    database: number;
  };
  trends: number[];
  recommendations: {
    id: string;
    type: 'rightsizing' | 'reserved_instances' | 'spot_instances' | 'storage_optimization';
    title: string;
    description: string;
    potentialSavings: number;
    effort: 'low' | 'medium' | 'high';
  }[];
}

export default function CostAnalyticsPage() {
  const [costData, setCostData] = useState<CostMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch cost data
    const fetchCostData = async () => {
      setIsLoading(true);
      
      // Mock data - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: CostMetrics = {
        totalCost: 12847.32,
        monthlyChange: -8.5,
        projectedCost: 11764.88,
        budgetUtilization: 78.3,
        providers: {
          aws: 8950.45,
          azure: 2847.23,
          gcp: 1049.64
        },
        services: {
          compute: 6723.45,
          storage: 2134.67,
          network: 1889.23,
          database: 2099.97
        },
        trends: [15200, 14800, 14500, 13900, 13200, 12800, 12847],
        recommendations: [
          {
            id: '1',
            type: 'rightsizing',
            title: 'Rightsize EC2 Instances',
            description: 'Downsize 12 over-provisioned instances in us-east-1',
            potentialSavings: 2340,
            effort: 'low'
          },
          {
            id: '2',
            type: 'reserved_instances',
            title: 'Purchase Reserved Instances',
            description: 'Buy 1-year RIs for stable workloads (15 instances)',
            potentialSavings: 1870,
            effort: 'medium'
          },
          {
            id: '3',
            type: 'storage_optimization',
            title: 'Optimize Storage Classes',
            description: 'Move infrequently accessed data to IA/Glacier',
            potentialSavings: 890,
            effort: 'low'
          }
        ]
      };
      
      setCostData(mockData);
      setIsLoading(false);
    };

    fetchCostData();
  }, [selectedPeriod]);

  if (isLoading || !costData) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-4"></div>
            <div className="h-4 bg-muted rounded w-96 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const costMetrics = [
    {
      title: "Total Monthly Cost",
      value: `$${costData.totalCost.toLocaleString()}`,
      change: `${costData.monthlyChange > 0 ? '+' : ''}${costData.monthlyChange}% vs last month`,
      changeType: costData.monthlyChange <= 0 ? 'positive' : 'negative' as const,
      icon: DollarSign
    },
    {
      title: "Projected Cost",
      value: `$${costData.projectedCost.toLocaleString()}`,
      change: "Next 30 days forecast",
      changeType: 'neutral' as const,
      icon: TrendingUp
    },
    {
      title: "Budget Utilization",
      value: `${costData.budgetUtilization}%`,
      change: "of $16,400 monthly budget",
      changeType: costData.budgetUtilization < 85 ? 'positive' : 'negative' as const,
      icon: Calendar
    },
    {
      title: "Optimization Potential",
      value: `$${costData.recommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0).toLocaleString()}`,
      change: "Monthly savings available",
      changeType: 'positive' as const,
      icon: Zap
    }
  ];

  const providerData = [
    { label: 'AWS', value: costData.providers.aws, color: '#FF9900' },
    { label: 'Azure', value: costData.providers.azure, color: '#0078D4' },
    { label: 'GCP', value: costData.providers.gcp, color: '#4285F4' }
  ];

  const serviceData = [
    { label: 'Compute', value: costData.services.compute, color: '#10B981' },
    { label: 'Storage', value: costData.services.storage, color: '#3B82F6' },
    { label: 'Network', value: costData.services.network, color: '#8B5CF6' },
    { label: 'Database', value: costData.services.database, color: '#F59E0B' }
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Header */}
      <header className="border-b border-border bg-gradient-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold gradient-text-primary truncate">
                Cost Analytics
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Monitor and optimize your cloud infrastructure costs
              </p>
            </div>
            <div className="flex items-center gap-4">
              <StatusIndicator 
                status={costData.budgetUtilization < 85 ? "healthy" : "warning"} 
                label={`${costData.budgetUtilization}% Budget Used`} 
              />
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Cost Overview */}
        <section className="animate-fade-in">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Cost Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {costMetrics.map((metric, index) => (
              <MetricCard 
                key={metric.title}
                {...metric}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              />
            ))}
          </div>
        </section>

        {/* Cost Trend */}
        <section className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Cost Trend
          </h2>
          <div className="bg-gradient-card border border-border rounded-lg p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Monthly Cost Trend</h3>
              <div className="text-sm text-muted-foreground">
                Last 7 months
              </div>
            </div>
            <div className="h-64">
              <LineChart 
                data={costData.trends}
                height={200}
                showDots={true}
                colorIndex={0}
              />
            </div>
          </div>
        </section>

        {/* Provider & Service Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
          {/* Cloud Provider Costs */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              Cloud Provider Breakdown
            </h2>
            <div className="bg-gradient-card border border-border rounded-lg p-6 shadow-soft">
              <div className="h-48 mb-4">
                <BarChart 
                  data={providerData}
                  height={160}
                  showValues={true}
                />
              </div>
              <div className="space-y-2">
                {providerData.map((provider) => (
                  <div key={provider.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: provider.color }}
                      ></div>
                      <span>{provider.label}</span>
                    </div>
                    <span className="font-medium">${provider.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Service Category Costs */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              Service Category Breakdown
            </h2>
            <div className="bg-gradient-card border border-border rounded-lg p-6 shadow-soft">
              <div className="h-48 mb-4">
                <BarChart 
                  data={serviceData}
                  height={160}
                  showValues={true}
                />
              </div>
              <div className="space-y-2">
                {serviceData.map((service) => (
                  <div key={service.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: service.color }}
                      ></div>
                      <span>{service.label}</span>
                    </div>
                    <span className="font-medium">${service.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Cost Optimization Recommendations */}
        <section className="animate-fade-in" style={{ animationDelay: '600ms' }}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Cost Optimization Recommendations
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {costData.recommendations.map((recommendation, index) => (
              <div 
                key={recommendation.id}
                className="bg-gradient-card border border-border rounded-lg p-6 shadow-soft hover:shadow-md transition-all duration-200 animate-slide-up"
                style={{ animationDelay: `${(index + 6) * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {recommendation.type === 'rightsizing' && <Server className="h-4 w-4 text-primary" />}
                    {recommendation.type === 'reserved_instances' && <Calendar className="h-4 w-4 text-primary" />}
                    {recommendation.type === 'spot_instances' && <Zap className="h-4 w-4 text-primary" />}
                    {recommendation.type === 'storage_optimization' && <Database className="h-4 w-4 text-primary" />}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      recommendation.effort === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                      recommendation.effort === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                    }`}>
                      {recommendation.effort} effort
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      ${recommendation.potentialSavings.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">monthly</div>
                  </div>
                </div>
                
                <h3 className="font-semibold mb-2">{recommendation.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {recommendation.description}
                </p>
                
                <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                  Apply Recommendation
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}