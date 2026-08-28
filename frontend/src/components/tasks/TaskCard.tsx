'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
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
  X,
  Check,
  AlertTriangle,
  Info,
  Loader2,
  ArrowUp,
  ArrowDown,
  Minus,
  CalendarDays,
  Users,
  ListTodo,
  Paperclip,
  MessageCircle,
  Share2,
  ExternalLink,
  Bell,
  Clock as ClockIcon,
  Timer,
  Target,
  Zap,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Equal,
  MoveHorizontal,
  GripVertical,
  Copy as CopyIcon,
  Link2,
  File,
  Image,
  Video,
  Music,
  Archive as ArchiveIcon,
  RefreshCw,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';

interface TaskCardProps {
  task: any;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onUpdate?: (id: string, updates: any) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  viewMode?: 'list' | 'board' | 'calendar' | 'timeline';
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, taskId: string) => void;
}

interface SubtaskItemProps {
  subtask: any;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

const SubtaskItem = ({ subtask, onToggle, onDelete, onEdit }: SubtaskItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(subtask.text);

  const handleSave = () => {
    if (text.trim() && text.trim() !== subtask.text) {
      onEdit(subtask.id, text.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-2 group">
      <Checkbox
        checked={subtask.completed}
        onCheckedChange={() => onToggle(subtask.id, !subtask.completed)}
        className="h-4 w-4"
      />
      {isEditing ? (
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="h-6 text-sm"
          autoFocus
        />
      ) : (
        <span
          className={cn(
            'text-sm flex-1 cursor-pointer',
            subtask.completed && 'line-through text-muted-foreground'
          )}
          onDoubleClick={() => setIsEditing(true)}
        >
          {subtask.text}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete(subtask.id)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

export function TaskCard({
  task,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onView,
  viewMode = 'list',
  className,
  draggable,
  onDragStart,
  onDragEnd,
  onDrop,
}: TaskCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isTimeTracking, setIsTimeTracking] = useState(task.timeTracking?.isRunning || false);
  const [trackedTime, setTrackedTime] = useState(task.timeTracking?.totalSeconds || 0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleStatusChange = async (newStatus: string) => {
    if (onUpdate) {
      setIsLoading(true);
      try {
        await onUpdate(task.id, { status: newStatus });
        toast.success(`Task moved to ${newStatus.replace('_', ' ')}`);
      } catch (error) {
        toast.error('Failed to update status');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (onUpdate) {
      setIsLoading(true);
      try {
        await onUpdate(task.id, { priority: newPriority });
        toast.success(`Priority updated to ${newPriority}`);
      } catch (error) {
        toast.error('Failed to update priority');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      setIsLoading(true);
      try {
        await onDelete(task.id);
        toast.success('Task deleted successfully');
        setShowDeleteDialog(false);
      } catch (error) {
        toast.error('Failed to delete task');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleArchive = async () => {
    if (onUpdate) {
      setIsLoading(true);
      try {
        await onUpdate(task.id, { status: 'archived' });
        toast.success('Task archived successfully');
        setShowArchiveDialog(false);
      } catch (error) {
        toast.error('Failed to archive task');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedTitle(task.title);
  };

  const handleSaveEdit = async () => {
    if (onUpdate && editedTitle.trim() !== task.title) {
      setIsLoading(true);
      try {
        await onUpdate(task.id, { title: editedTitle.trim() });
        toast.success('Task updated');
      } catch (error) {
        toast.error('Failed to update task');
      } finally {
        setIsLoading(false);
      }
    }
    setIsEditing(false);
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    if (onUpdate) {
      const updatedChecklist = task.checklist.map((item: any) =>
        item.id === subtaskId ? { ...item, completed } : item
      );
      await onUpdate(task.id, { checklist: updatedChecklist });
    }
  };

  const handleAddSubtask = async () => {
    if (newSubtaskText.trim() && onUpdate) {
      const newSubtask = {
        id: `subtask_${Date.now()}`,
        text: newSubtaskText.trim(),
        completed: false,
      };
      const updatedChecklist = [...(task.checklist || []), newSubtask];
      await onUpdate(task.id, { checklist: updatedChecklist });
      setNewSubtaskText('');
      setShowSubtaskInput(false);
      toast.success('Subtask added');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (onUpdate) {
      const updatedChecklist = task.checklist.filter((item: any) => item.id !== subtaskId);
      await onUpdate(task.id, { checklist: updatedChecklist });
    }
  };

  const handleEditSubtask = async (subtaskId: string, text: string) => {
    if (onUpdate) {
      const updatedChecklist = task.checklist.map((item: any) =>
        item.id === subtaskId ? { ...item, text } : item
      );
      await onUpdate(task.id, { checklist: updatedChecklist });
    }
  };

  const handleStartTimeTracking = async () => {
    if (onUpdate) {
      setIsTimeTracking(true);
      setTrackedTime(prev => prev + 1);
      timerRef.current = setInterval(() => {
        setTrackedTime(prev => prev + 1);
      }, 1000);
      await onUpdate(task.id, {
        timeTracking: { ...task.timeTracking, isRunning: true, startedAt: new Date() }
      });
      toast.success('Time tracking started');
    }
  };

  const handlePauseTimeTracking = async () => {
    if (onUpdate && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setIsTimeTracking(false);
      await onUpdate(task.id, {
        timeTracking: { ...task.timeTracking, isRunning: false, totalSeconds: trackedTime }
      });
      toast.success('Time tracking paused');
    }
  };

  const handleStopTimeTracking = async () => {
    if (onUpdate) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsTimeTracking(false);
      await onUpdate(task.id, {
        timeTracking: { ...task.timeTracking, isRunning: false, totalSeconds: trackedTime }
      });
      toast.success(`Time tracking stopped: ${formatTime(trackedTime)}`);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const daysUntilDue = task.dueDate ? Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0 && task.status !== 'done' && task.status !== 'archived';

  const statusOptions = ['todo', 'in_progress', 'in_review', 'done', 'archived'];
  const priorityOptions = ['low', 'medium', 'high', 'urgent', 'critical'];

  if (viewMode === 'board') {
    return (
      <div
        className={cn(
          'group rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md',
          isSelected && 'ring-2 ring-primary',
          isHovered && 'border-primary/50',
          draggable && 'cursor-grab active:cursor-grabbing',
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        draggable={draggable}
        onDragStart={(e) => onDragStart?.(e, task.id)}
        onDragEnd={onDragEnd}
        onDrop={(e) => onDrop?.(e, task.id)}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                className="h-7 text-sm font-medium"
                autoFocus
                disabled={isLoading}
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
            {task.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    {priorityOptions.map((priority) => (
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
                <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select
            value={task.status}
            onValueChange={handleStatusChange}
            disabled={isLoading}
          >
            <SelectTrigger className={cn('h-6 text-xs w-auto border-0 p-0 px-2', getStatusColor(task.status))}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status} className="capitalize text-xs">
                  {status.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
            </Badge>
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
                    <Paperclip className="h-3 w-3" />
                    {task.attachments.length}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{task.attachments.length} attachments</TooltipContent>
              </Tooltip>
            )}
          </div>
          {task.completionPercentage !== undefined && task.completionPercentage > 0 && (
            <div className="w-16">
              <Progress value={task.completionPercentage} className="h-1.5" />
            </div>
          )}
        </div>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Task</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{task.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive Task</DialogTitle>
              <DialogDescription>
                Are you sure you want to archive "{task.title}"? The task will be moved to archived status.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleArchive} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                Archive
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-4 rounded-lg border bg-card p-4 transition-all hover:shadow-sm',
        isSelected && 'ring-2 ring-primary',
        isHovered && 'border-primary/50',
        draggable && 'cursor-grab active:cursor-grabbing',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, task.id)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop?.(e, task.id)}
      onDragOver={(e) => e.preventDefault()}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onSelect?.(task.id)}
        className="mt-0.5"
        disabled={isLoading}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              className="h-7 text-sm font-medium"
              autoFocus
              disabled={isLoading}
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
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {task.isRecurring && (
            <Tooltip>
              <TooltipTrigger>
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>Recurring task</TooltipContent>
            </Tooltip>
          )}
          {isOverdue && task.status !== 'done' && task.status !== 'archived' && (
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
          <Select
            value={task.status}
            onValueChange={handleStatusChange}
            disabled={isLoading}
          >
            <SelectTrigger className={cn('h-6 text-xs w-auto border-0 p-0 px-2', getStatusColor(task.status))}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status} className="capitalize text-xs">
                  {status.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
              {daysUntilDue !== null && !isOverdue && daysUntilDue > 0 && (
                <span className="ml-1 text-muted-foreground">({daysUntilDue}d)</span>
              )}
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

        {task.timeTracking && (
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Timer className="h-3 w-3" />
                {formatTime(task.timeTracking.totalSeconds || trackedTime)}
              </div>
            </TooltipTrigger>
            <TooltipContent>Time tracked: {formatTime(task.timeTracking.totalSeconds || trackedTime)}</TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
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
                {priorityOptions.map((priority) => (
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
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Timer className="mr-2 h-4 w-4" />
                Time Tracking
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {!isTimeTracking ? (
                  <DropdownMenuItem onClick={handleStartTimeTracking}>
                    <Play className="mr-2 h-4 w-4" />
                    Start
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem onClick={handlePauseTimeTracking}>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleStopTimeTracking}>
                      <Square className="mr-2 h-4 w-4" />
                      Stop
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive "{task.title}"? The task will be moved to archived status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleArchive} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TaskCard;