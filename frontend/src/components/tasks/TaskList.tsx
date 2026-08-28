'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
  Copy,
  Flag,
  User,
  Calendar,
  Tag,
  ChevronDown,
  ChevronRight,
  Star,
  Eye,
  MessageSquare,
  Link,
  FileText,
  GitBranch,
  Layers,
  Settings,
  HelpCircle,
  Play,
  Pause,
  Square,
  Plus,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Search,
  X,
  Check,
  AlertTriangle,
  Info,
  Loader2,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';

interface TaskListProps {
  view?: 'list' | 'board' | 'calendar' | 'timeline';
  filter?: string;
  sort?: string;
  className?: string;
  onTaskSelect?: (taskId: string) => void;
  onTaskUpdate?: (taskId: string, updates: any) => void;
  onTaskDelete?: (taskId: string) => void;
}

interface TaskItemProps {
  task: any;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onUpdate?: (id: string, updates: any) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  viewMode?: 'list' | 'board' | 'calendar' | 'timeline';
}

const TaskItem = ({
  task,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onView,
  viewMode = 'list',
}: TaskItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

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

  const getPriorityIcon = (priority: string) => {
    const icons = {
      low: <Flag className="h-3 w-3" />,
      medium: <Flag className="h-3 w-3" />,
      high: <Flag className="h-3 w-3" />,
      urgent: <AlertCircle className="h-3 w-3" />,
      critical: <AlertTriangle className="h-3 w-3" />,
    };
    return icons[priority as keyof typeof icons] || icons.medium;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      todo: <Circle className="h-4 w-4" />,
      in_progress: <Clock className="h-4 w-4" />,
      in_review: <Eye className="h-4 w-4" />,
      done: <CheckCircle className="h-4 w-4" />,
      archived: <Archive className="h-4 w-4" />,
      deleted: <Trash2 className="h-4 w-4" />,
    };
    return icons[status as keyof typeof icons] || icons.todo;
  };

  const handleStatusChange = async (newStatus: string) => {
    if (onUpdate) {
      await onUpdate(task.id, { status: newStatus });
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (onUpdate) {
      await onUpdate(task.id, { priority: newPriority });
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(task.id);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedTitle(task.title);
  };

  const handleSaveEdit = async () => {
    if (onUpdate && editedTitle.trim() !== task.title) {
      await onUpdate(task.id, { title: editedTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedTitle(task.title);
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = task.dueDate ? getDaysUntilDue(task.dueDate) : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0 && task.status !== 'done' && task.status !== 'archived';

  if (viewMode === 'board') {
    return (
      <div
        className={cn(
          'group rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md',
          isSelected && 'ring-2 ring-primary',
          isHovered && 'border-primary/50'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                className="h-7 text-sm font-medium"
                autoFocus
              />
            ) : (
              <p
                className={cn(
                  'text-sm font-medium truncate cursor-pointer hover:text-primary',
                  task.status === 'done' && 'line-through text-muted-foreground'
                )}
                onClick={() => onView?.(task.id)}
              >
                {task.title}
              </p>
            )}
            {task.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onView?.(task.id)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Flag className="mr-2 h-4 w-4" />
                  Priority
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {['low', 'medium', 'high', 'urgent', 'critical'].map((priority) => (
                    <DropdownMenuItem
                      key={priority}
                      onClick={() => handlePriorityChange(priority)}
                      className={cn(
                        'capitalize',
                        task.priority === priority && 'bg-accent'
                      )}
                    >
                      {priority}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('text-xs', getStatusColor(task.status))}>
            {task.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className={cn('text-xs', getPriorityColor(task.priority))}>
            {getPriorityIcon(task.priority)}
            <span className="ml-1 capitalize">{task.priority}</span>
          </Badge>
          {task.dueDate && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                isOverdue ? 'bg-destructive/10 text-destructive border-destructive/20' : ''
              )}
            >
              <Calendar className="mr-1 h-3 w-3" />
              {format(new Date(task.dueDate), 'MMM d')}
              {daysUntilDue !== null && !isOverdue && (
                <span className="ml-1 text-muted-foreground">
                  ({daysUntilDue}d)
                </span>
              )}
              {isOverdue && (
                <span className="ml-1">
                  ({Math.abs(daysUntilDue || 0)}d overdue)
                </span>
              )}
            </Badge>
          )}
          {task.labels && task.labels.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {task.labels.slice(0, 2).map((label: string) => (
                <Badge key={label} variant="secondary" className="text-xs">
                  {label}
                </Badge>
              ))}
              {task.labels.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{task.labels.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.assignee && (
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.avatar} />
                    <AvatarFallback className="text-xs">
                      {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  {task.assignee.firstName} {task.assignee.lastName}
                </TooltipContent>
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
                <TooltipContent>{task.comments.length} comments</TooltipContent>
              </Tooltip>
            )}
            {task.attachments && task.attachments.length > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    {task.attachments.length}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{task.attachments.length} attachments</TooltipContent>
              </Tooltip>
            )}
            {task.subtasks && task.subtasks.length > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GitBranch className="h-3 w-3" />
                    {task.subtasks.filter((s: any) => s.status === 'done').length}/{task.subtasks.length}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {task.subtasks.filter((s: any) => s.status === 'done').length} of {task.subtasks.length} subtasks done
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {task.completionPercentage !== undefined && task.completionPercentage > 0 && (
            <div className="w-16">
              <Progress value={task.completionPercentage} className="h-1.5" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-4 rounded-lg border bg-card p-4 transition-all hover:shadow-sm',
        isSelected && 'ring-2 ring-primary',
        isHovered && 'border-primary/50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onSelect?.(task.id)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              className="h-7 text-sm font-medium"
              autoFocus
            />
          ) : (
            <p
              className={cn(
                'text-sm font-medium cursor-pointer hover:text-primary',
                task.status === 'done' && 'line-through text-muted-foreground'
              )}
              onClick={() => onView?.(task.id)}
            >
              {task.title}
            </p>
          )}
          {task.isRecurring && (
            <Tooltip>
              <TooltipTrigger>
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>Recurring task</TooltipContent>
            </Tooltip>
          )}
          {task.isOverdue && task.status !== 'done' && task.status !== 'archived' && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              Overdue
            </Badge>
          )}
          {task.status === 'done' && (
            <Badge variant="success" className="text-xs">
              Completed
            </Badge>
          )}
        </div>
        {task.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {task.description}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('text-xs', getStatusColor(task.status))}>
            {getStatusIcon(task.status)}
            <span className="ml-1 capitalize">{task.status.replace('_', ' ')}</span>
          </Badge>
          <Badge variant="outline" className={cn('text-xs', getPriorityColor(task.priority))}>
            {getPriorityIcon(task.priority)}
            <span className="ml-1 capitalize">{task.priority}</span>
          </Badge>
          {task.dueDate && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                isOverdue ? 'bg-destructive/10 text-destructive border-destructive/20' : ''
              )}
            >
              <Calendar className="mr-1 h-3 w-3" />
              {format(new Date(task.dueDate), 'MMM d, yyyy')}
            </Badge>
          )}
          {task.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={task.assignee.avatar} />
              <AvatarFallback className="text-[10px]">
                {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          )}
          {task.labels && task.labels.length > 0 && (
            <div className="flex items-center gap-1">
              {task.labels.slice(0, 2).map((label: string) => (
                <Badge key={label} variant="secondary" className="text-[10px]">
                  {label}
                </Badge>
              ))}
              {task.labels.length > 2 && (
                <Badge variant="secondary" className="text-[10px]">
                  +{task.labels.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {task.completionPercentage !== undefined && task.completionPercentage > 0 && (
          <div className="w-12">
            <Progress value={task.completionPercentage} className="h-1.5" />
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onView?.(task.id)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Flag className="mr-2 h-4 w-4" />
                Priority
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {['low', 'medium', 'high', 'urgent', 'critical'].map((priority) => (
                  <DropdownMenuItem
                    key={priority}
                    onClick={() => handlePriorityChange(priority)}
                    className={cn(
                      'capitalize',
                      task.priority === priority && 'bg-accent'
                    )}
                  >
                    {priority}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export function TaskList({
  view = 'list',
  filter,
  sort,
  className,
  onTaskSelect,
  onTaskUpdate,
  onTaskDelete,
}: TaskListProps) {
  const { tasks, isLoading, error, filters, setFilters, sort: currentSort, setSort, pagination, setPagination, selectedTasks, selectTask, deselectTask, clearSelection, refetch } = useTasks();
  const router = useRouter();

  const handleTaskSelect = (id: string) => {
    if (selectedTasks.includes(id)) {
      deselectTask(id);
    } else {
      selectTask(id);
    }
    onTaskSelect?.(id);
  };

  const handleTaskView = (id: string) => {
    router.push(`/tasks/${id}`);
  };

  const handleTaskUpdate = async (id: string, updates: any) => {
    if (onTaskUpdate) {
      await onTaskUpdate(id, updates);
    }
  };

  const handleTaskDelete = async (id: string) => {
    if (onTaskDelete) {
      await onTaskDelete(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <p className="mt-2 text-muted-foreground">Failed to load tasks</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No tasks found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by creating your first task.
          </p>
          <Button className="mt-4" onClick={() => router.push('/tasks/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {tasks.length} tasks
          </p>
          {selectedTasks.length > 0 && (
            <Badge variant="secondary">
              {selectedTasks.length} selected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView(view === 'list' ? 'board' : 'list')}
          >
            {view === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            isSelected={selectedTasks.includes(task.id)}
            onSelect={handleTaskSelect}
            onUpdate={handleTaskUpdate}
            onDelete={handleTaskDelete}
            onView={handleTaskView}
            viewMode={view}
          />
        ))}
      </div>

      {pagination.totalPages && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total || 0)} of{' '}
            {pagination.total} tasks
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page >= (pagination.totalPages || 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskList;