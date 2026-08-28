'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Flag,
  Tag,
  User,
  Users,
  Paperclip,
  MessageSquare,
  GitBranch,
  Layers,
  Settings,
  HelpCircle,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Star,
  Eye,
  Bell,
  Link as LinkIcon,
  FileText,
  Image,
  Video,
  Music,
  File,
  Download,
  Upload,
  RefreshCw,
  Timer,
  Play,
  Pause,
  Square,
  GitBranch as GitBranchIcon,
  FolderKanban,
  CalendarDays,
  Clock as ClockIcon,
  Flag as FlagIcon,
  Tag as TagIcon,
  User as UserIcon,
  Users as UsersIcon,
  Paperclip as PaperclipIcon,
  MessageSquare as MessageSquareIcon,
  Layers as LayersIcon,
  Settings as SettingsIcon,
  HelpCircle as HelpCircleIcon,
  Loader2 as Loader2Icon,
  Check as CheckIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  AlertCircle as AlertCircleIcon,
  AlertTriangle as AlertTriangleIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  Eye as EyeIcon,
  Bell as BellIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<TaskFormData>;
}

interface TaskFormData {
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  assignee: string;
  team: string;
  project: string;
  dueDate: Date | undefined;
  startDate: Date | undefined;
  estimatedHours: number;
  labels: string[];
  tags: string[];
  isRecurring: boolean;
  recurringRule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    interval: number;
    daysOfWeek?: number[];
    daysOfMonth?: number[];
    monthOfYear?: number;
    customRule?: string;
    endDate?: Date;
    occurrences?: number;
  } | undefined;
  checklist: { text: string; completed: boolean }[];
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  file?: File;
}

const defaultFormData: TaskFormData = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assignee: '',
  team: '',
  project: '',
  dueDate: undefined,
  startDate: undefined,
  estimatedHours: 0,
  labels: [],
  tags: [],
  isRecurring: false,
  recurringRule: undefined,
  checklist: [],
};

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critical' },
];

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

export function TaskForm({
  open,
  onOpenChange,
  taskId,
  onSuccess,
  onCancel,
  initialData,
}: TaskFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { createTask, updateTask, getTaskById, isLoading } = useTasks();
  const [formData, setFormData] = useState<TaskFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('details');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoadingTask, setIsLoadingTask] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (taskId) {
      loadTask();
    } else if (initialData) {
      setFormData({ ...defaultFormData, ...initialData });
    } else {
      setFormData(defaultFormData);
    }
  }, [taskId, initialData, open]);

  const loadTask = async () => {
    if (!taskId) return;
    setIsLoadingTask(true);
    try {
      const task = await getTaskById(taskId);
      if (task) {
        setFormData({
          title: task.title || '',
          description: task.description || '',
          status: task.status || 'todo',
          priority: task.priority || 'medium',
          assignee: task.assignee?.id || '',
          team: task.team?.id || '',
          project: task.project?.id || '',
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          startDate: task.startDate ? new Date(task.startDate) : undefined,
          estimatedHours: task.estimatedHours || 0,
          labels: task.labels || [],
          tags: task.tags || [],
          isRecurring: task.isRecurring || false,
          recurringRule: task.recurringRule,
          checklist: task.checklist || [],
        });
        setChecklistItems(
          (task.checklist || []).map((item: any, index: number) => ({
            id: item.id || `item_${index}`,
            text: item.text,
            completed: item.completed || false,
          }))
        );
      }
    } catch (error) {
      toast.error('Failed to load task');
    } finally {
      setIsLoadingTask(false);
    }
  };

  const handleChange = (field: keyof TaskFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleChecklistAdd = () => {
    if (newChecklistItem.trim()) {
      const newItem: ChecklistItem = {
        id: `item_${Date.now()}`,
        text: newChecklistItem.trim(),
        completed: false,
      };
      setChecklistItems([...checklistItems, newItem]);
      setNewChecklistItem('');
    }
  };

  const handleChecklistRemove = (id: string) => {
    setChecklistItems(checklistItems.filter((item) => item.id !== id));
  };

  const handleChecklistToggle = (id: string) => {
    setChecklistItems(
      checklistItems.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleChecklistEdit = (id: string, text: string) => {
    setChecklistItems(
      checklistItems.map((item) =>
        item.id === id ? { ...item, text } : item
      )
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newAttachments.push({
        id: `att_${Date.now()}_${i}`,
        name: file.name,
        type: file.type,
        size: file.size,
        file: file,
      });
    }
    setAttachments([...attachments, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter((att) => att.id !== id));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        assignee: formData.assignee || undefined,
        team: formData.team || undefined,
        project: formData.project || undefined,
        dueDate: formData.dueDate?.toISOString(),
        startDate: formData.startDate?.toISOString(),
        estimatedHours: formData.estimatedHours || undefined,
        labels: formData.labels,
        tags: formData.tags,
        isRecurring: formData.isRecurring,
        recurringRule: formData.recurringRule,
        checklist: checklistItems.map((item) => ({
          text: item.text,
          completed: item.completed,
        })),
      };

      if (taskId) {
        await updateTask(taskId, taskData);
        toast.success('Task updated successfully');
      } else {
        await createTask(taskData);
        toast.success('Task created successfully');
      }

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setChecklistItems([]);
    setAttachments([]);
    setErrors({});
    setActiveTab('details');
    setNewChecklistItem('');
  };

  const handleCancel = () => {
    resetForm();
    onCancel?.();
    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      in_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      archived: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
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

  if (isLoadingTask) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading task...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{taskId ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {taskId
              ? 'Update the task details below.'
              : 'Fill in the details to create a new task.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] pr-4">
              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter task title..."
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className={cn(errors.title && 'border-destructive')}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter task description..."
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => handleChange('status', value)}
                    >
                      <SelectTrigger className={getStatusColor(formData.status)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: any) => handleChange('priority', value)}
                    >
                      <SelectTrigger className={getPriorityColor(formData.priority)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !formData.dueDate && 'text-muted-foreground'
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {formData.dueDate ? (
                            format(formData.dueDate, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={formData.dueDate}
                          onSelect={(date) => handleChange('dueDate', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !formData.startDate && 'text-muted-foreground'
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {formData.startDate ? (
                            format(formData.startDate, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => handleChange('startDate', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="0"
                    value={formData.estimatedHours || ''}
                    onChange={(e) =>
                      handleChange('estimatedHours', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="checklist" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Checklist Items</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add checklist item..."
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChecklistAdd()}
                    />
                    <Button type="button" onClick={handleChecklistAdd}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {checklistItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No checklist items yet
                    </p>
                  ) : (
                    checklistItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent group"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleChecklistToggle(item.id)}
                        >
                          <div
                            className={cn(
                              'h-4 w-4 rounded border',
                              item.completed
                                ? 'bg-primary border-primary text-primary-foreground flex items-center justify-center'
                                : 'border-muted-foreground'
                            )}
                          >
                            {item.completed && <Check className="h-3 w-3" />}
                          </div>
                        </Button>
                        <Input
                          value={item.text}
                          onChange={(e) =>
                            handleChecklistEdit(item.id, e.target.value)
                          }
                          className={cn(
                            'flex-1 border-0 focus-visible:ring-0 p-0 h-auto',
                            item.completed && 'line-through text-muted-foreground'
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleChecklistRemove(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Attachments</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Upload Files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <span className="text-xs text-muted-foreground">
                      {attachments.length} files uploaded
                    </span>
                  </div>
                  {attachments.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm flex-1 truncate">{att.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(att.size / 1024).toFixed(1)} KB
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemoveAttachment(att.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Labels</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.labels.map((label, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {label}
                        <button
                          type="button"
                          onClick={() => {
                            const newLabels = formData.labels.filter((_, i) => i !== index);
                            handleChange('labels', newLabels);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add label..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          handleChange('labels', [...formData.labels, e.currentTarget.value.trim()]);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="gap-1">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = formData.tags.filter((_, i) => i !== index);
                            handleChange('tags', newTags);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          handleChange('tags', [...formData.tags, e.currentTarget.value.trim()]);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isRecurring}
                      onChange={(e) => handleChange('isRecurring', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label>Recurring Task</Label>
                  </div>

                  {formData.isRecurring && (
                    <div className="space-y-2 pl-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select
                            value={formData.recurringRule?.frequency || 'weekly'}
                            onValueChange={(value: any) => {
                              handleChange('recurringRule', {
                                ...formData.recurringRule,
                                frequency: value,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {frequencyOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Interval</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.recurringRule?.interval || 1}
                            onChange={(e) => {
                              handleChange('recurringRule', {
                                ...formData.recurringRule,
                                interval: parseInt(e.target.value) || 1,
                              });
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !formData.recurringRule?.endDate && 'text-muted-foreground'
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {formData.recurringRule?.endDate ? (
                                format(formData.recurringRule.endDate, 'PPP')
                              ) : (
                                <span>Pick an end date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={formData.recurringRule?.endDate}
                              onSelect={(date) => {
                                handleChange('recurringRule', {
                                  ...formData.recurringRule,
                                  endDate: date,
                                });
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {taskId ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{taskId ? 'Update Task' : 'Create Task'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TaskForm;