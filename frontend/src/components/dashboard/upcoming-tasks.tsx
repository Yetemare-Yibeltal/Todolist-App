'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow, isToday, isTomorrow, isThisWeek, differenceInDays } from 'date-fns';
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Flag,
  User,
  Tag,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
  Eye,
  MessageSquare,
  Paperclip,
  GitBranch,
  Loader2,
  CalendarDays,
  Clock as ClockIcon,
  Timer,
  Play,
  Pause,
  Square,
  Check,
  X,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Sparkles,
  Target,
  BarChart3,
  PieChart,
  Activity,
  ArrowUp,
  ArrowDown,
  Equal,
  MoveHorizontal,
  GripVertical,
  Plus,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Layers,
  Settings,
  HelpCircle,
  Bell,
  Star,
  Link,
  FileText,
  GitBranch as GitBranchIcon,
  MessageCircle,
  Users,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

interface UpcomingTasksProps {
  className?: string;
  limit?: number;
  days?: number;
  showAssigned?: boolean;
  showOverdue?: boolean;
  onTaskClick?: (taskId: string) => void;
  onTaskUpdate?: (taskId: string, updates: any) => void;
}

interface TaskGroup {
  label: string;
  icon: React.ReactNode;
  tasks: any[];
  count: number;
}

export function UpcomingTasks({
  className,
  limit = 10,
  days = 7,
  showAssigned = true,
  showOverdue = true,
  onTaskClick,
  onTaskUpdate,
}: UpcomingTasksProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { tasks, isLoading, error, refetch } = useTasks();
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'compact' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (tasks && tasks.length > 0) {
      processTasks(tasks);
    }
  }, [tasks]);

  const processTasks = (taskList: any[]) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const filtered = taskList.filter(t => 
      t.status !== 'done' && 
      t.status !== 'archived' && 
      t.status !== 'deleted'
    );

    const overdue = filtered.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < now;
    });

    const upcoming = filtered.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      return dueDate >= now && dueDate <= futureDate;
    });

    const assigned = showAssigned ? filtered.filter(t => 
      t.assignee?.id === user?.id && 
      t.status !== 'done'
    ) : [];

    const sortedUpcoming = upcoming.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    const sortedOverdue = overdue.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    setUpcomingTasks(sortedUpcoming);
    setOverdueTasks(sortedOverdue);
    setAssignedTasks(assigned);
  };

  const getTaskGroups = (): TaskGroup[] => {
    const groups: TaskGroup[] = [];

    if (showOverdue && overdueTasks.length > 0) {
      groups.push({
        label: 'Overdue',
        icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        tasks: overdueTasks.slice(0, limit),
        count: overdueTasks.length,
      });
    }

    if (upcomingTasks.length > 0) {
      groups.push({
        label: 'Upcoming',
        icon: <Calendar className="h-4 w-4 text-primary" />,
        tasks: upcomingTasks.slice(0, limit),
        count: upcomingTasks.length,
      });
    }

    if (showAssigned && assignedTasks.length > 0) {
      groups.push({
        label: 'Assigned to me',
        icon: <User className="h-4 w-4 text-info" />,
        tasks: assignedTasks.slice(0, limit),
        count: assignedTasks.length,
      });
    }

    return groups;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      in_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      archived: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
      deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status as keyof typeof colors] || colors.todo;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      critical: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const getDueDateLabel = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isThisWeek(date)) return format(date, 'EEEE');
    return format(date, 'MMM d');
  };

  const getDaysUntil = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 0) return `${Math.abs(days)}d overdue`;
    return `${days}d left`;
  };

  const handleTaskClick = (taskId: string) => {
    if (onTaskClick) {
      onTaskClick(taskId);
    } else {
      router.push(`/tasks/${taskId}`);
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    if (onTaskUpdate) {
      await onTaskUpdate(taskId, { status: newStatus });
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    if (onTaskUpdate) {
      await onTaskUpdate(taskId, { status: 'done' });
      toast.success('Task marked as complete');
    }
  };

  const renderTaskItem = (task: any, index: number) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
    const daysUntil = task.dueDate ? getDaysUntil(task.dueDate) : null;

    if (viewMode === 'compact') {
      return (
        <div
          key={task.id}
          className={cn(
            'flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-accent',
            isOverdue && 'bg-destructive/5'
          )}
          onClick={() => handleTaskClick(task.id)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={cn(
                'text-sm font-medium truncate',
                task.status === 'done' && 'line-through text-muted-foreground'
              )}>
                {task.title}
              </p>
              <Badge variant="outline" className={cn('text-[10px]', getStatusColor(task.status))}>
                {task.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {task.dueDate && (
                <span className={cn(
                  'text-xs',
                  isOverdue ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {daysUntil}
                </span>
              )}
              <Badge variant="outline" className={cn('text-[10px]', getPriorityColor(task.priority))}>
                {getPriorityLabel(task.priority)}
              </Badge>
            </div>
          </div>
          {task.assignee && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assignee.avatar} />
              <AvatarFallback className="text-[10px]">
                {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              handleTaskComplete(task.id);
            }}
          >
            <CheckCircle className="h-4 w-4 text-muted-foreground hover:text-success" />
          </Button>
        </div>
      );
    }

    return (
      <div
        key={task.id}
        className={cn(
          'group flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer hover:bg-accent',
          isOverdue && 'bg-destructive/5 border border-destructive/20',
          task.status === 'done' && 'opacity-60'
        )}
        onClick={() => handleTaskClick(task.id)}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 mt-0.5"
          onClick={(e) => {
            e.stopPropagation();
            handleTaskComplete(task.id);
          }}
        >
          {task.status === 'done' ? (
            <CheckCircle className="h-4 w-4 text-success" />
          ) : (
            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground hover:border-primary transition-colors" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={cn(
                'text-sm font-medium',
                task.status === 'done' && 'line-through text-muted-foreground'
              )}>
                {task.title}
              </p>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {task.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {task.subtasks && task.subtasks.length > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <GitBranchIcon className="h-3 w-3" />
                      {task.subtasks.filter((s: any) => s.status === 'done').length}/{task.subtasks.length}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Subtasks completed</TooltipContent>
                </Tooltip>
              )}
              {task.comments && task.comments.length > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      {task.comments.length}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Comments</TooltipContent>
                </Tooltip>
              )}
              {task.attachments && task.attachments.length > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Paperclip className="h-3 w-3" />
                      {task.attachments.length}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Attachments</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <Badge variant="outline" className={cn('text-[10px]', getStatusColor(task.status))}>
              {task.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className={cn('text-[10px]', getPriorityColor(task.priority))}>
              {getPriorityLabel(task.priority)}
            </Badge>
            {task.dueDate && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  isOverdue ? 'border-destructive/50 text-destructive' : ''
                )}
              >
                <Calendar className="mr-1 h-3 w-3" />
                {getDueDateLabel(task.dueDate)}
                <span className="ml-1 text-muted-foreground">
                  ({daysUntil})
                </span>
              </Badge>
            )}
            {task.labels && task.labels.slice(0, 2).map((label: string) => (
              <Badge key={label} variant="secondary" className="text-[10px]">
                {label}
              </Badge>
            ))}
            {task.labels && task.labels.length > 2 && (
              <Badge variant="secondary" className="text-[10px]">
                +{task.labels.length - 2}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2">
            {task.assignee && (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={task.assignee.avatar} />
                  <AvatarFallback className="text-[10px]">
                    {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {task.assignee.firstName} {task.assignee.lastName}
                </span>
              </div>
            )}
            {task.completionPercentage !== undefined && task.completionPercentage > 0 && (
              <div className="flex-1 max-w-24">
                <Progress value={task.completionPercentage} className="h-1.5" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              handleTaskClick(task.id);
            }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleTaskClick(task.id)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleTaskComplete(task.id)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark Complete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Upcoming Tasks</CardTitle>
          <CardDescription>Tasks due soon</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Upcoming Tasks</CardTitle>
          <CardDescription>Failed to load tasks</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <p className="mt-2 text-sm text-muted-foreground">Failed to load upcoming tasks</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const groups = getTaskGroups();
  const totalCount = groups.reduce((sum, g) => sum + g.tasks.length, 0);

  if (totalCount === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Upcoming Tasks</CardTitle>
          <CardDescription>No upcoming tasks</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No tasks due in the next {days} days</p>
          <p className="text-xs text-muted-foreground">You're all caught up!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Upcoming Tasks
              <Badge variant="secondary">{totalCount}</Badge>
            </CardTitle>
            <CardDescription>Tasks due in the next {days} days</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'default' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('compact')}
            >
              <Grid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => router.push('/calendar')}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          <div className="py-4 space-y-6">
            {groups.map((group, groupIndex) => (
              <div key={groupIndex}>
                <div className="flex items-center gap-2 mb-3">
                  {group.icon}
                  <h4 className="text-sm font-medium">{group.label}</h4>
                  <Badge variant="outline" className="text-xs">
                    {group.count}
                  </Badge>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-1">
                  {group.tasks.map((task) => renderTaskItem(task, 0))}
                </div>
                {group.tasks.length < group.count && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs text-muted-foreground"
                    onClick={() => router.push('/tasks')}
                  >
                    View {group.count - group.tasks.length} more
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t p-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => router.push('/tasks')}
        >
          View All Tasks
          <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export default UpcomingTasks;