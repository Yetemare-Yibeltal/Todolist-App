'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useTasks } from '@/hooks/useTasks';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  ListTodo,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Star,
  Zap,
  Target,
  Award,
  BarChart3,
  PieChart,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Info,
  Eye,
  MessageSquare,
  Link,
  FileText,
  Tag,
  Flag,
  Timer,
  CalendarDays,
  GitBranch,
  Layers,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon: React.ReactNode;
  description?: string;
  progress?: number;
  target?: number;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  trend?: {
    data: number[];
    label: string;
  };
  onClick?: () => void;
  loading?: boolean;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  footer?: React.ReactNode;
}

interface StatsCardsProps {
  className?: string;
  userId?: string;
  teamId?: string;
  projectId?: string;
  timeRange?: 'today' | 'week' | 'month' | 'year';
}

const StatCard = ({
  title,
  value,
  change,
  icon,
  description,
  progress,
  target,
  color = 'default',
  trend,
  onClick,
  loading = false,
  subtitle,
  badge,
  badgeColor,
  footer,
}: StatCardProps) => {
  const colorClasses = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    info: 'bg-info/10 text-info',
  };

  const progressColorClasses = {
    default: 'bg-muted',
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
    info: 'bg-info',
  };

  const iconColors = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    info: 'text-info',
  };

  const changeColors = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  const changeIcons = {
    up: <ArrowUp className="h-3 w-3" />,
    down: <ArrowDown className="h-3 w-3" />,
    neutral: <Minus className="h-3 w-3" />,
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-2 w-full" />
          <div className="mt-3 flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'h-full transition-all duration-200 hover:shadow-md',
        onClick && 'cursor-pointer hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {badge && (
                <Badge variant="secondary" className={cn('text-xs', badgeColor)}>
                  {badge}
                </Badge>
              )}
            </div>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
              {target && (
                <p className="text-sm text-muted-foreground">
                  / {target}
                </p>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn(
            'rounded-full p-2.5',
            colorClasses[color]
          )}>
            <span className={cn('h-5 w-5', iconColors[color])}>
              {icon}
            </span>
          </div>
        </div>

        {progress !== undefined && (
          <div className="mt-4">
            <Progress
              value={progress}
              className={cn('h-2', progressColorClasses[color])}
            />
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>{progress}%</span>
              {target && <span>Target: {target}</span>}
            </div>
          </div>
        )}

        {change && (
          <div className="mt-3 flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-0.5 text-sm font-medium',
              changeColors[change.direction]
            )}>
              {changeIcons[change.direction]}
              <span>{Math.abs(change.value)}%</span>
            </div>
            {change.label && (
              <span className="text-xs text-muted-foreground">
                {change.label}
              </span>
            )}
          </div>
        )}

        {trend && (
          <div className="mt-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>{trend.label}</span>
            </div>
          </div>
        )}

        {footer && (
          <div className="mt-3 border-t pt-3">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export function StatsCards({
  className,
  userId,
  teamId,
  projectId,
  timeRange = 'week',
}: StatsCardsProps) {
  const { stats, isLoading, error } = useTasks();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 1000);
    return () => clearTimeout(timer);
  }, [stats]);

  const formatValue = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const getChangeDirection = (current: number, previous: number): 'up' | 'down' | 'neutral' => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'neutral';
  };

  const getChangeValue = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (isLoading) {
    return (
      <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
        {[...Array(8)].map((_, i) => (
          <StatCard key={i} title="Loading" value="--" icon={<Activity />} loading />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-4 text-center py-8">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-2 text-sm text-muted-foreground">Failed to load statistics</p>
      </div>
    );
  }

  const defaultStats = {
    total: 0,
    todo: 0,
    inProgress: 0,
    inReview: 0,
    done: 0,
    archived: 0,
    overdue: 0,
    completionRate: 0,
    averageCompletionTime: 0,
    totalTimeSpent: 0,
    byPriority: {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
      critical: 0,
    },
    byStatus: {
      todo: 0,
      inProgress: 0,
      inReview: 0,
      done: 0,
      archived: 0,
    },
    productivity: {
      tasksPerDay: 0,
      completionRate: 0,
      averageTimeToComplete: 0,
      totalTasksCreated: 0,
      totalTasksCompleted: 0,
    },
  };

  const data = stats || defaultStats;

  const statCards = [
    {
      title: 'Total Tasks',
      value: formatValue(data.total || 0),
      icon: <ListTodo className="h-5 w-5" />,
      color: 'primary' as const,
      description: `Across all projects and teams`,
      badge: 'Active',
      badgeColor: 'bg-primary/10 text-primary',
      footer: (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Eye className="h-3 w-3" />
          <span>View all tasks</span>
        </div>
      ),
    },
    {
      title: 'Completed',
      value: formatValue(data.done || 0),
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'success' as const,
      progress: data.total > 0 ? Math.round((data.done / data.total) * 100) : 0,
      target: data.total,
      description: `Completion rate: ${data.total > 0 ? Math.round((data.done / data.total) * 100) : 0}%`,
      change: {
        value: getChangeValue(data.done, data.todo + data.inProgress),
        direction: getChangeDirection(data.done, data.todo + data.inProgress),
        label: 'vs active tasks',
      },
    },
    {
      title: 'In Progress',
      value: formatValue(data.inProgress || 0),
      icon: <Clock className="h-5 w-5" />,
      color: 'warning' as const,
      description: `${data.inReview || 0} in review`,
      badge: 'Active',
      badgeColor: 'bg-warning/10 text-warning',
      footer: (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Timer className="h-3 w-3" />
          <span>Avg time: ${data.averageCompletionTime || 0}h</span>
        </div>
      ),
    },
    {
      title: 'Overdue',
      value: formatValue(data.overdue || 0),
      icon: <AlertCircle className="h-5 w-5" />,
      color: 'destructive' as const,
      description: `Tasks past their due date`,
      change: {
        value: getChangeValue(data.overdue, data.done),
        direction: getChangeDirection(data.overdue, data.done),
        label: 'vs completed',
      },
      badge: 'Urgent',
      badgeColor: 'bg-destructive/10 text-destructive',
    },
    {
      title: 'Completion Rate',
      value: `${data.total > 0 ? Math.round((data.done / data.total) * 100) : 0}%`,
      icon: <Target className="h-5 w-5" />,
      color: 'info' as const,
      progress: data.total > 0 ? Math.round((data.done / data.total) * 100) : 0,
      target: 100,
      description: `${data.done} of ${data.total} tasks completed`,
      change: {
        value: getChangeValue(data.done, data.total - data.done),
        direction: getChangeDirection(data.done, data.total - data.done),
        label: 'completion trend',
      },
    },
    {
      title: 'Productivity',
      value: `${data.productivity?.completionRate || 0}%`,
      icon: <Zap className="h-5 w-5" />,
      color: 'success' as const,
      description: `${data.productivity?.tasksPerDay || 0} tasks per day`,
      badge: 'Score',
      badgeColor: 'bg-success/10 text-success',
      footer: (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>${data.productivity?.totalTasksCreated || 0} created</span>
        </div>
      ),
    },
    {
      title: 'Time Spent',
      value: `${Math.round((data.totalTimeSpent || 0) / 3600)}h`,
      icon: <Timer className="h-5 w-5" />,
      color: 'info' as const,
      description: `Total time tracked on tasks`,
      badge: 'Tracked',
      badgeColor: 'bg-info/10 text-info',
      footer: (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          <span>This ${timeRange}</span>
        </div>
      ),
    },
    {
      title: 'Priority Tasks',
      value: formatValue((data.byPriority?.urgent || 0) + (data.byPriority?.critical || 0)),
      icon: <Flag className="h-5 w-5" />,
      color: 'destructive' as const,
      description: `${data.byPriority?.critical || 0} critical, ${data.byPriority?.urgent || 0} urgent`,
      badge: 'High',
      badgeColor: 'bg-destructive/10 text-destructive',
      change: {
        value: getChangeValue(
          (data.byPriority?.urgent || 0) + (data.byPriority?.critical || 0),
          data.byPriority?.high || 0
        ),
        direction: getChangeDirection(
          (data.byPriority?.urgent || 0) + (data.byPriority?.critical || 0),
          data.byPriority?.high || 0
        ),
        label: 'vs high priority',
      },
    },
  ];

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {statCards.map((card, index) => (
        <div
          key={index}
          className={cn(
            'transition-all duration-500',
            animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
          style={{ transitionDelay: `${index * 50}ms` }}
        >
          <StatCard {...card} />
        </div>
      ))}
    </div>
  );
}

export default StatsCards;