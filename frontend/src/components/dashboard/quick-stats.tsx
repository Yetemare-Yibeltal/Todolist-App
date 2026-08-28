'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  Equal,
  MoveHorizontal,
  GripVertical,
  Plus,
  Minus as MinusIcon,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Bookmark,
  BookmarkCheck,
  Share,
  Link,
  Copy,
  ExternalLink,
  FileText,
  Paperclip,
  Image,
  Video,
  Music,
  File,
  Download,
  Upload,
  RefreshCw,
  Clock,
  Timer,
  Play,
  Pause,
  Square,
  GitBranch,
  Layers,
  Zap,
  Sparkles,
  Rocket,
  Star,
  Heart,
  ThumbsUp,
  Flag,
  User,
  Users,
  MessageSquare,
  Eye,
  Bell,
  Settings,
  Trash2,
  Archive,
  MoreVertical,
  Loader2 as Loader2Icon,
  Check as CheckIcon,
  X as XIcon,
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  Search as SearchIcon,
  Filter as FilterIcon,
  SortAsc as SortAscIcon,
  SortDesc as SortDescIcon,
  Grid as GridIcon,
  List as ListIcon,
  Bookmark as BookmarkIcon,
  BookmarkCheck as BookmarkCheckIcon,
  Share as ShareIcon,
  Link as LinkIcon,
  Copy as CopyIcon,
  ExternalLink as ExternalLinkIcon,
  FileText as FileTextIcon,
  Paperclip as PaperclipIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  File as FileIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  RefreshCw as RefreshCwIcon,
  Clock as ClockIcon,
  Timer as TimerIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  Square as SquareIcon,
  GitBranch as GitBranchIcon,
  Layers as LayersIcon,
  Zap as ZapIcon,
  Sparkles as SparklesIcon,
  Rocket as RocketIcon,
  Star as StarIcon,
  Heart as HeartIcon,
  ThumbsUp as ThumbsUpIcon,
  Flag as FlagIcon,
  User as UserIcon,
  Users as UsersIcon,
  MessageSquare as MessageSquareIcon,
  Eye as EyeIcon,
  Bell as BellIcon,
  Settings as SettingsIcon,
  Trash2 as Trash2Icon,
  Archive as ArchiveIcon,
  MoreVertical as MoreVerticalIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

interface QuickStatsProps {
  className?: string;
  compact?: boolean;
  refreshInterval?: number;
  onStatClick?: (stat: string) => void;
}

interface StatItem {
  id: string;
  label: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'secondary';
  trend?: {
    data: number[];
    label: string;
  };
  description?: string;
  progress?: number;
  target?: number;
  onClick?: () => void;
}

export function QuickStats({
  className,
  compact = false,
  refreshInterval = 60000,
  onStatClick,
}: QuickStatsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { tasks, stats, isLoading, refetch } = useTasks();
  const [statistics, setStatistics] = useState<StatItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    updateStatistics();
  }, [tasks, stats]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const updateStatistics = () => {
    if (!stats) return;

    const currentStats: StatItem[] = [
      {
        id: 'total_tasks',
        label: 'Total Tasks',
        value: stats.total || 0,
        icon: <FileText className="h-4 w-4" />,
        color: 'primary',
        description: 'All tasks across projects',
        onClick: () => router.push('/tasks'),
      },
      {
        id: 'completed_tasks',
        label: 'Completed',
        value: stats.done || 0,
        icon: <Check className="h-4 w-4" />,
        color: 'success',
        progress: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0,
        target: stats.total,
        description: 'Tasks completed',
        onClick: () => router.push('/tasks?status=done'),
      },
      {
        id: 'in_progress',
        label: 'In Progress',
        value: stats.inProgress || 0,
        icon: <Clock className="h-4 w-4" />,
        color: 'warning',
        description: 'Active tasks',
        onClick: () => router.push('/tasks?status=in_progress'),
      },
      {
        id: 'overdue',
        label: 'Overdue',
        value: stats.overdue || 0,
        icon: <AlertCircle className="h-4 w-4" />,
        color: 'destructive',
        change: {
          value: stats.overdue > 0 ? 100 : 0,
          direction: stats.overdue > 0 ? 'up' : 'down',
          label: 'vs completed',
        },
        description: 'Past due date',
        onClick: () => router.push('/tasks?filter=overdue'),
      },
      {
        id: 'completion_rate',
        label: 'Completion Rate',
        value: stats.completionRate ? `${Math.round(stats.completionRate)}%` : '0%',
        icon: <Target className="h-4 w-4" />,
        color: 'info',
        progress: stats.completionRate || 0,
        target: 100,
        description: 'Tasks completed',
        onClick: () => router.push('/reports'),
      },
      {
        id: 'time_spent',
        label: 'Time Spent',
        value: stats.totalTimeSpent ? formatTime(stats.totalTimeSpent) : '0h',
        icon: <Timer className="h-4 w-4" />,
        color: 'secondary',
        description: 'Total tracked time',
        onClick: () => router.push('/time-tracking'),
      },
      {
        id: 'priority_tasks',
        label: 'High Priority',
        value: (stats.byPriority?.urgent || 0) + (stats.byPriority?.critical || 0),
        icon: <Flag className="h-4 w-4" />,
        color: 'destructive',
        change: {
          value: ((stats.byPriority?.urgent || 0) + (stats.byPriority?.critical || 0)) > 0 ? 50 : 0,
          direction: ((stats.byPriority?.urgent || 0) + (stats.byPriority?.critical || 0)) > 0 ? 'up' : 'down',
          label: 'needs attention',
        },
        description: 'Urgent & critical tasks',
        onClick: () => router.push('/tasks?priority=urgent,critical'),
      },
      {
        id: 'productivity_score',
        label: 'Productivity',
        value: stats.productivity?.completionRate ? `${Math.round(stats.productivity.completionRate)}%` : '0%',
        icon: <Zap className="h-4 w-4" />,
        color: 'success',
        progress: stats.productivity?.completionRate || 0,
        target: 100,
        description: `${stats.productivity?.tasksPerDay || 0} tasks/day`,
        onClick: () => router.push('/reports/productivity'),
      },
    ];

    setStatistics(currentStats);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const refreshStats = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getColorClasses = (color: StatItem['color']) => {
    const classes = {
      primary: 'bg-primary/10 text-primary',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      destructive: 'bg-destructive/10 text-destructive',
      info: 'bg-info/10 text-info',
      secondary: 'bg-secondary/10 text-secondary-foreground',
    };
    return classes[color] || classes.secondary;
  };

  const getChangeIcon = (direction: 'up' | 'down' | 'neutral') => {
    const icons = {
      up: <ArrowUp className="h-3 w-3" />,
      down: <ArrowDown className="h-3 w-3" />,
      neutral: <Minus className="h-3 w-3" />,
    };
    return icons[direction];
  };

  const getChangeColor = (direction: 'up' | 'down' | 'neutral') => {
    const colors = {
      up: 'text-success',
      down: 'text-destructive',
      neutral: 'text-muted-foreground',
    };
    return colors[direction];
  };

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-4', className)}>
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (compact) {
    const compactStats = statistics.slice(0, 4);
    return (
      <div className={cn('grid grid-cols-2 gap-3', className)}>
        {compactStats.map((stat) => (
          <Card
            key={stat.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              stat.onClick?.();
              onStatClick?.(stat.id);
            }}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                  {stat.change && (
                    <div className="flex items-center gap-0.5">
                      <span className={cn('text-xs', getChangeColor(stat.change.direction))}>
                        {getChangeIcon(stat.change.direction)}
                        {Math.abs(stat.change.value)}%
                      </span>
                      {stat.change.label && (
                        <span className="text-[10px] text-muted-foreground">
                          {stat.change.label}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className={cn('rounded-full p-1.5', getColorClasses(stat.color))}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Quick Statistics</h3>
          <Badge variant="outline" className="text-[10px]">
            {isRefreshing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </>
            )}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={refreshStats}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4">
        {statistics.map((stat) => (
          <Card
            key={stat.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              stat.onClick?.();
              onStatClick?.(stat.id);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                  {stat.change && (
                    <div className="flex items-center gap-1">
                      <span className={cn('text-xs font-medium', getChangeColor(stat.change.direction))}>
                        {getChangeIcon(stat.change.direction)}
                        {Math.abs(stat.change.value)}%
                      </span>
                      {stat.change.label && (
                        <span className="text-[10px] text-muted-foreground">
                          {stat.change.label}
                        </span>
                      )}
                    </div>
                  )}
                  {stat.description && (
                    <p className="text-[10px] text-muted-foreground">{stat.description}</p>
                  )}
                </div>
                <div className={cn('rounded-full p-2', getColorClasses(stat.color))}>
                  {stat.icon}
                </div>
              </div>
              {stat.progress !== undefined && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                    <span>Progress</span>
                    <span>{stat.progress}%</span>
                  </div>
                  <Progress value={stat.progress} className="h-1" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default QuickStats;