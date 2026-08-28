'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
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
  Calendar,
  Target,
  BarChart,
  PieChart,
  Activity,
  LineChart,
  AreaChart,
  ScatterChart,
  RadarChart,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Minus as MinusIcon2,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  Equal as EqualIcon,
  MoveHorizontal as MoveHorizontalIcon,
  GripVertical as GripVerticalIcon,
  Plus as PlusIcon,
  Minus as MinusIcon3,
  XCircle as XCircleIcon,
  AlertCircle as AlertCircleIcon,
  AlertTriangle as AlertTriangleIcon,
  Info as InfoIcon,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

// Recharts imports
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ComposedChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ReferenceLine,
  ReferenceArea,
  Brush,
  ErrorBar,
} from 'recharts';

interface ProductivityChartProps {
  className?: string;
  userId?: string;
  teamId?: string;
  timeRange?: '7d' | '30d' | '90d' | '12m';
  chartType?: 'area' | 'bar' | 'line' | 'composed';
  onDataPointClick?: (data: any) => void;
  compact?: boolean;
}

interface ChartDataPoint {
  date: string;
  tasksCreated: number;
  tasksCompleted: number;
  tasksInProgress: number;
  overdue: number;
  completionRate: number;
  timeSpent: number;
  productivityScore: number;
}

interface ChartSeries {
  name: string;
  dataKey: string;
  color: string;
  type: 'area' | 'bar' | 'line' | 'scatter';
}

const COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#eab308',
  destructive: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  orange: '#f97316',
  teal: '#14b8a6',
  indigo: '#6366f1',
};

const chartColors = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.destructive,
  COLORS.info,
  COLORS.purple,
  COLORS.pink,
  COLORS.orange,
  COLORS.teal,
  COLORS.indigo,
];

const chartSeries: ChartSeries[] = [
  {
    name: 'Created',
    dataKey: 'tasksCreated',
    color: COLORS.primary,
    type: 'bar',
  },
  {
    name: 'Completed',
    dataKey: 'tasksCompleted',
    color: COLORS.success,
    type: 'bar',
  },
  {
    name: 'In Progress',
    dataKey: 'tasksInProgress',
    color: COLORS.warning,
    type: 'area',
  },
  {
    name: 'Overdue',
    dataKey: 'overdue',
    color: COLORS.destructive,
    type: 'line',
  },
  {
    name: 'Productivity Score',
    dataKey: 'productivityScore',
    color: COLORS.purple,
    type: 'line',
  },
];

export function ProductivityChart({
  className,
  userId,
  teamId,
  timeRange: initialTimeRange = '7d',
  chartType: initialChartType = 'area',
  onDataPointClick,
  compact = false,
}: ProductivityChartProps) {
  const { user } = useAuth();
  const { tasks, stats, isLoading } = useTasks();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>(initialTimeRange);
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line' | 'composed'>(initialChartType);
  const [selectedMetric, setSelectedMetric] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isLoading && tasks) {
      generateChartData();
    }
  }, [tasks, stats, isLoading, timeRange]);

  const generateChartData = useCallback(() => {
    setIsGenerating(true);

    try {
      let days = 7;
      let intervals = 7;
      
      switch (timeRange) {
        case '7d':
          days = 7;
          intervals = 7;
          break;
        case '30d':
          days = 30;
          intervals = 30;
          break;
        case '90d':
          days = 90;
          intervals = 90;
          break;
        case '12m':
          days = 365;
          intervals = 12;
          break;
      }

      const data: ChartDataPoint[] = [];
      const now = new Date();

      for (let i = intervals - 1; i >= 0; i--) {
        const date = subDays(now, i);
        const dayTasks = tasks?.filter(t => {
          const createdDate = new Date(t.createdAt);
          return isSameDay(createdDate, date);
        }) || [];

        const completedTasks = dayTasks.filter(t => t.status === 'done');
        const inProgressTasks = dayTasks.filter(t => t.status === 'in_progress');
        const overdueTasks = dayTasks.filter(t => 
          t.dueDate && new Date(t.dueDate) < date && t.status !== 'done'
        );

        const totalTasks = dayTasks.length;
        const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

        let productivityScore = 0;
        if (completedTasks.length > 0) {
          productivityScore = Math.min(
            (completedTasks.length / Math.max(1, totalTasks)) * 100 +
            (1 - (overdueTasks.length / Math.max(1, totalTasks))) * 20,
            100
          );
        }

        data.push({
          date: format(date, 'MMM d'),
          tasksCreated: dayTasks.length,
          tasksCompleted: completedTasks.length,
          tasksInProgress: inProgressTasks.length,
          overdue: overdueTasks.length,
          completionRate: Math.round(completionRate),
          timeSpent: dayTasks.reduce((sum, t) => sum + (t.timeTracking?.totalSeconds || 0), 0),
          productivityScore: Math.round(productivityScore),
        });
      }

      setChartData(data);
    } catch (error) {
      console.error('Failed to generate chart data:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [tasks, stats, timeRange]);

  const getFilteredData = () => {
    if (selectedMetric === 'all') return chartData;
    return chartData.map(point => ({
      ...point,
      tasksCreated: selectedMetric === 'created' ? point.tasksCreated : 0,
      tasksCompleted: selectedMetric === 'completed' ? point.tasksCompleted : 0,
      tasksInProgress: selectedMetric === 'inprogress' ? point.tasksInProgress : 0,
      overdue: selectedMetric === 'overdue' ? point.overdue : 0,
      completionRate: selectedMetric === 'rate' ? point.completionRate : 0,
      productivityScore: selectedMetric === 'productivity' ? point.productivityScore : 0,
    }));
  };

  const getVisibleSeries = () => {
    if (selectedMetric === 'all') return chartSeries;
    const metricMap: Record<string, string> = {
      'created': 'tasksCreated',
      'completed': 'tasksCompleted',
      'inprogress': 'tasksInProgress',
      'overdue': 'overdue',
      'rate': 'completionRate',
      'productivity': 'productivityScore',
    };
    const dataKey = metricMap[selectedMetric];
    return chartSeries.filter(s => s.dataKey === dataKey);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="rounded-lg border bg-popover p-3 shadow-md">
        <p className="text-sm font-medium mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">
                {typeof entry.value === 'number' && entry.value % 1 !== 0
                  ? entry.value.toFixed(1)
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    const data = getFilteredData();
    const series = getVisibleSeries();

    if (data.length === 0) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No data available</p>
          </div>
        </div>
      );
    }

    const ChartComponent = (props: any) => {
      switch (chartType) {
        case 'bar':
          return <BarChart {...props} />;
        case 'line':
          return <LineChart {...props} />;
        case 'composed':
          return <ComposedChart {...props} />;
        default:
          return <AreaChart {...props} />;
      }
    };

    const CommonProps = {
      data,
      margin: { top: 10, right: 10, left: 0, bottom: 0 },
    };

    const renderBars = () => {
      return series.map((s) => {
        if (s.type === 'bar' || chartType === 'bar') {
          return (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              fill={s.color}
              radius={[4, 4, 0, 0]}
              onClick={(data) => onDataPointClick?.(data)}
            />
          );
        }
        return null;
      });
    };

    const renderLines = () => {
      return series.map((s) => {
        if (s.type === 'line' || chartType === 'line' || chartType === 'composed') {
          return (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              onClick={(data) => onDataPointClick?.(data)}
            />
          );
        }
        return null;
      });
    };

    const renderAreas = () => {
      return series.map((s) => {
        if (s.type === 'area' || chartType === 'area') {
          return (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              fill={s.color}
              fillOpacity={0.2}
              stroke={s.color}
              strokeWidth={2}
              onClick={(data) => onDataPointClick?.(data)}
            />
          );
        }
        return null;
      });
    };

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent {...CommonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            className="text-xs"
            tick={{ fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            className="text-xs"
            tick={{ fontSize: 10 }}
            tickLine={false}
            tickFormatter={(value) => {
              if (value >= 1000) return `${value / 1000}k`;
              return value;
            }}
          />
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            onClick={(e) => {
              const dataKey = e.dataKey;
              if (dataKey) {
                setSelectedMetric(selectedMetric === dataKey ? 'all' : dataKey);
              }
            }}
          />
          {renderAreas()}
          {renderBars()}
          {renderLines()}
          <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Productivity</CardTitle>
              <CardDescription className="text-xs">Last 7 days</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                `${chartData.length} days`
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-32">
          {isLoading ? (
            <div className="flex h-full items-center justify-center p-4">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            renderChart()
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Productivity Overview
            </CardTitle>
            <CardDescription>
              Track your task creation, completion, and productivity trends
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="12m">12 Months</SelectItem>
              </SelectContent>
            </Select>
            <Tabs value={chartType} onValueChange={(v: any) => setChartType(v)} className="h-8">
              <TabsList className="h-8 p-0.5">
                <TabsTrigger value="area" className="h-7 px-2 text-xs">
                  <AreaChart className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="bar" className="h-7 px-2 text-xs">
                  <BarChart className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="line" className="h-7 px-2 text-xs">
                  <LineChart className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="composed" className="h-7 px-2 text-xs">
                  <Activity className="h-3.5 w-3.5" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={generateChartData}
              disabled={isGenerating}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isGenerating && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge
            variant={selectedMetric === 'all' ? 'default' : 'outline'}
            className="cursor-pointer text-[10px]"
            onClick={() => setSelectedMetric('all')}
          >
            All Metrics
          </Badge>
          <Badge
            variant={selectedMetric === 'created' ? 'default' : 'outline'}
            className="cursor-pointer text-[10px]"
            style={{ borderColor: COLORS.primary }}
            onClick={() => setSelectedMetric('created')}
          >
            <div className="h-1.5 w-1.5 rounded-full mr-1" style={{ backgroundColor: COLORS.primary }} />
            Created
          </Badge>
          <Badge
            variant={selectedMetric === 'completed' ? 'default' : 'outline'}
            className="cursor-pointer text-[10px]"
            style={{ borderColor: COLORS.success }}
            onClick={() => setSelectedMetric('completed')}
          >
            <div className="h-1.5 w-1.5 rounded-full mr-1" style={{ backgroundColor: COLORS.success }} />
            Completed
          </Badge>
          <Badge
            variant={selectedMetric === 'inprogress' ? 'default' : 'outline'}
            className="cursor-pointer text-[10px]"
            style={{ borderColor: COLORS.warning }}
            onClick={() => setSelectedMetric('inprogress')}
          >
            <div className="h-1.5 w-1.5 rounded-full mr-1" style={{ backgroundColor: COLORS.warning }} />
            In Progress
          </Badge>
          <Badge
            variant={selectedMetric === 'overdue' ? 'default' : 'outline'}
            className="cursor-pointer text-[10px]"
            style={{ borderColor: COLORS.destructive }}
            onClick={() => setSelectedMetric('overdue')}
          >
            <div className="h-1.5 w-1.5 rounded-full mr-1" style={{ backgroundColor: COLORS.destructive }} />
            Overdue
          </Badge>
          <Badge
            variant={selectedMetric === 'productivity' ? 'default' : 'outline'}
            className="cursor-pointer text-[10px]"
            style={{ borderColor: COLORS.purple }}
            onClick={() => setSelectedMetric('productivity')}
          >
            <div className="h-1.5 w-1.5 rounded-full mr-1" style={{ backgroundColor: COLORS.purple }} />
            Productivity
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="h-[400px]">
        {isLoading || isGenerating ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        ) : (
          renderChart()
        )}
      </CardContent>

      <CardFooter className="border-t p-4">
        <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
          <span>
            {chartData.length} data points • 
            {stats?.total || 0} total tasks • 
            {stats?.done || 0} completed
          </span>
          <span>
            Last updated: {format(new Date(), 'MMM d, yyyy HH:mm')}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}

export default ProductivityChart;