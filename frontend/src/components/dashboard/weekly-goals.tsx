'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Target,
  CheckCircle,
  Clock,
  Calendar,
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
  Clock as ClockIcon,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

interface WeeklyGoal {
  id: string;
  title: string;
  description?: string;
  target: number;
  current: number;
  unit: 'tasks' | 'hours' | 'percentage';
  category: 'productivity' | 'collaboration' | 'learning' | 'health' | 'personal';
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  priority: 'high' | 'medium' | 'low';
  milestone?: {
    current: number;
    target: number;
    label: string;
  };
}

interface WeeklyGoalsProps {
  className?: string;
  limit?: number;
  weekStart?: Date;
  onGoalUpdate?: (goal: WeeklyGoal) => void;
  onGoalComplete?: (goal: WeeklyGoal) => void;
  onGoalDelete?: (id: string) => void;
  compact?: boolean;
}

const categoryColors = {
  productivity: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  collaboration: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  learning: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  health: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  personal: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
};

const categoryIcons = {
  productivity: <Target className="h-4 w-4" />,
  collaboration: <Users className="h-4 w-4" />,
  learning: <Book className="h-4 w-4" />,
  health: <Heart className="h-4 w-4" />,
  personal: <Star className="h-4 w-4" />,
};

const statusColors = {
  not_started: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusLabels = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
};

const unitLabels = {
  tasks: 'Tasks',
  hours: 'Hours',
  percentage: '%',
};

const priorityColors = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-muted/10 text-muted-foreground',
};

export function WeeklyGoals({
  className,
  limit = 5,
  weekStart,
  onGoalUpdate,
  onGoalComplete,
  onGoalDelete,
  compact = false,
}: WeeklyGoalsProps) {
  const { user } = useAuth();
  const { tasks, stats, isLoading } = useTasks();
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingGoal, setEditingGoal] = useState<WeeklyGoal | null>(null);

  // New goal form state
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('5');
  const [newGoalUnit, setNewGoalUnit] = useState<'tasks' | 'hours' | 'percentage'>('tasks');
  const [newGoalCategory, setNewGoalCategory] = useState<'productivity' | 'collaboration' | 'learning' | 'health' | 'personal'>('productivity');
  const [newGoalPriority, setNewGoalPriority] = useState<'high' | 'medium' | 'low'>('medium');

  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    if (tasks && stats && !isLoading) {
      updateGoalProgress();
    }
  }, [tasks, stats, isLoading]);

  const loadGoals = async () => {
    setIsLoadingGoals(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockGoals: WeeklyGoal[] = [
        {
          id: '1',
          title: 'Complete 10 tasks',
          description: 'Finish at least 10 tasks across all projects',
          target: 10,
          current: 7,
          unit: 'tasks',
          category: 'productivity',
          progress: 70,
          status: 'in_progress',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          tags: ['tasks', 'productivity'],
          priority: 'high',
          milestone: {
            current: 7,
            target: 10,
            label: 'Tasks completed',
          },
        },
        {
          id: '2',
          title: 'Collaborate with team',
          description: 'Comment on 5 tasks from team members',
          target: 5,
          current: 3,
          unit: 'tasks',
          category: 'collaboration',
          progress: 60,
          status: 'in_progress',
          dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          tags: ['team', 'collaboration'],
          priority: 'medium',
          milestone: {
            current: 3,
            target: 5,
            label: 'Comments made',
          },
        },
        {
          id: '3',
          title: 'Learn new skill',
          description: 'Complete 2 hours of learning on new technologies',
          target: 2,
          current: 0,
          unit: 'hours',
          category: 'learning',
          progress: 0,
          status: 'not_started',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          tags: ['learning', 'growth'],
          priority: 'medium',
          milestone: {
            current: 0,
            target: 2,
            label: 'Hours completed',
          },
        },
        {
          id: '4',
          title: 'Review tasks',
          description: 'Review and clean up all pending tasks',
          target: 100,
          current: 100,
          unit: 'percentage',
          category: 'productivity',
          progress: 100,
          status: 'completed',
          dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          tags: ['review', 'cleanup'],
          priority: 'high',
          milestone: {
            current: 100,
            target: 100,
            label: 'Progress',
          },
        },
        {
          id: '5',
          title: 'Exercise regularly',
          description: 'Exercise for at least 30 minutes 3 times this week',
          target: 3,
          current: 1,
          unit: 'tasks',
          category: 'health',
          progress: 33,
          status: 'in_progress',
          dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          tags: ['health', 'fitness'],
          priority: 'low',
          milestone: {
            current: 1,
            target: 3,
            label: 'Sessions completed',
          },
        },
      ];

      setGoals(mockGoals);
    } catch (error) {
      console.error('Failed to load goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setIsLoadingGoals(false);
    }
  };

  const updateGoalProgress = () => {
    setGoals(prevGoals =>
      prevGoals.map(goal => {
        let current = goal.current;
        let status = goal.status;

        if (goal.id === '1' && stats?.done) {
          current = stats.done;
          status = current >= goal.target ? 'completed' : current > 0 ? 'in_progress' : 'not_started';
        }

        const progress = Math.min(Math.round((current / goal.target) * 100), 100);

        return {
          ...goal,
          current,
          progress,
          status: status as WeeklyGoal['status'],
          updatedAt: new Date(),
          milestone: {
            ...goal.milestone,
            current,
          },
        };
      })
    );
  };

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) {
      toast.error('Goal title is required');
      return;
    }

    const target = parseInt(newGoalTarget);
    if (isNaN(target) || target <= 0) {
      toast.error('Please enter a valid target');
      return;
    }

    const newGoal: WeeklyGoal = {
      id: `goal_${Date.now()}`,
      title: newGoalTitle.trim(),
      description: newGoalDescription.trim() || undefined,
      target,
      current: 0,
      unit: newGoalUnit,
      category: newGoalCategory,
      progress: 0,
      status: 'not_started',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      priority: newGoalPriority,
      milestone: {
        current: 0,
        target,
        label: `${unitLabels[newGoalUnit]} completed`,
      },
    };

    setGoals(prev => [...prev, newGoal]);
    setIsDialogOpen(false);
    resetForm();
    toast.success('Goal created successfully');
    onGoalUpdate?.(newGoal);
  };

  const handleUpdateGoal = async (id: string, updates: Partial<WeeklyGoal>) => {
    setGoals(prev =>
      prev.map(goal => {
        if (goal.id === id) {
          const updated = { ...goal, ...updates, updatedAt: new Date() };
          return updated;
        }
        return goal;
      })
    );
    onGoalUpdate?.(goals.find(g => g.id === id)!);
    toast.success('Goal updated');
  };

  const handleCompleteGoal = async (id: string) => {
    setGoals(prev =>
      prev.map(goal => {
        if (goal.id === id) {
          const updated = {
            ...goal,
            progress: 100,
            current: goal.target,
            status: 'completed' as const,
            updatedAt: new Date(),
          };
          return updated;
        }
        return goal;
      })
    );
    const goal = goals.find(g => g.id === id);
    if (goal) {
      onGoalComplete?.(goal);
      toast.success(`🎉 Goal "${goal.title}" completed!`);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    onGoalDelete?.(id);
    toast.success('Goal deleted');
  };

  const resetForm = () => {
    setNewGoalTitle('');
    setNewGoalDescription('');
    setNewGoalTarget('5');
    setNewGoalUnit('tasks');
    setNewGoalCategory('productivity');
    setNewGoalPriority('medium');
    setEditingGoal(null);
  };

  const getFilteredGoals = () => {
    let filtered = goals;
    
    if (!showCompleted) {
      filtered = filtered.filter(g => g.status !== 'completed');
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(g => g.category === selectedCategory);
    }
    
    return filtered.slice(0, limit);
  };

  const getStatusBadge = (status: WeeklyGoal['status']) => {
    return (
      <Badge className={cn('text-[10px]', statusColors[status])}>
        {statusLabels[status]}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: WeeklyGoal['priority']) => {
    return (
      <Badge className={cn('text-[10px]', priorityColors[priority])}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const filteredGoals = getFilteredGoals();
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const totalGoals = goals.length;
  const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Weekly Goals
              </CardTitle>
              <CardDescription>
                {completedGoals} / {totalGoals} completed • {completionRate}%
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Weekly Goal</DialogTitle>
                  <DialogDescription>
                    Set a goal for this week to stay focused and productive.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal-title">Title *</Label>
                    <Input
                      id="goal-title"
                      placeholder="e.g., Complete 10 tasks"
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-description">Description</Label>
                    <Textarea
                      id="goal-description"
                      placeholder="Describe your goal..."
                      value={newGoalDescription}
                      onChange={(e) => setNewGoalDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="goal-target">Target</Label>
                      <Input
                        id="goal-target"
                        type="number"
                        min="1"
                        value={newGoalTarget}
                        onChange={(e) => setNewGoalTarget(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goal-unit">Unit</Label>
                      <Select value={newGoalUnit} onValueChange={(v: any) => setNewGoalUnit(v)}>
                        <SelectTrigger id="goal-unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tasks">Tasks</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="percentage">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="goal-category">Category</Label>
                      <Select value={newGoalCategory} onValueChange={(v: any) => setNewGoalCategory(v)}>
                        <SelectTrigger id="goal-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="productivity">Productivity</SelectItem>
                          <SelectItem value="collaboration">Collaboration</SelectItem>
                          <SelectItem value="learning">Learning</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goal-priority">Priority</Label>
                      <Select value={newGoalPriority} onValueChange={(v: any) => setNewGoalPriority(v)}>
                        <SelectTrigger id="goal-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateGoal}>
                    Create Goal
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingGoals ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))
          ) : filteredGoals.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No goals set for this week
            </div>
          ) : (
            filteredGoals.map((goal) => (
              <div key={goal.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{goal.title}</span>
                    {getStatusBadge(goal.status)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {goal.current} / {goal.target}
                  </span>
                </div>
                <Progress value={goal.progress} className="h-1.5" />
              </div>
            ))
          )}
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
              <Target className="h-5 w-5 text-primary" />
              Weekly Goals
              <Badge variant="secondary" className="ml-2">
                {completedGoals} / {totalGoals}
              </Badge>
            </CardTitle>
            <CardDescription>
              {completionRate}% completion rate • Set goals to stay on track
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              {showCompleted ? (
                <>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Show Active
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Show Completed
                </>
              )}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create Weekly Goal'}</DialogTitle>
                  <DialogDescription>
                    {editingGoal ? 'Update your goal details.' : 'Set a goal for this week to stay focused and productive.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal-title">Title *</Label>
                    <Input
                      id="goal-title"
                      placeholder="e.g., Complete 10 tasks"
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-description">Description</Label>
                    <Textarea
                      id="goal-description"
                      placeholder="Describe your goal..."
                      value={newGoalDescription}
                      onChange={(e) => setNewGoalDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="goal-target">Target</Label>
                      <Input
                        id="goal-target"
                        type="number"
                        min="1"
                        value={newGoalTarget}
                        onChange={(e) => setNewGoalTarget(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goal-unit">Unit</Label>
                      <Select value={newGoalUnit} onValueChange={(v: any) => setNewGoalUnit(v)}>
                        <SelectTrigger id="goal-unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tasks">Tasks</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="percentage">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="goal-category">Category</Label>
                      <Select value={newGoalCategory} onValueChange={(v: any) => setNewGoalCategory(v)}>
                        <SelectTrigger id="goal-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="productivity">Productivity</SelectItem>
                          <SelectItem value="collaboration">Collaboration</SelectItem>
                          <SelectItem value="learning">Learning</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goal-priority">Priority</Label>
                      <Select value={newGoalPriority} onValueChange={(v: any) => setNewGoalPriority(v)}>
                        <SelectTrigger id="goal-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateGoal}>
                    {editingGoal ? 'Update Goal' : 'Create Goal'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoadingGoals ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="py-12 text-center">
            <Target className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No goals set for this week</p>
            <p className="text-xs text-muted-foreground">Set a goal to stay focused and productive</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Set Your First Goal
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGoals.map((goal) => (
              <div key={goal.id} className="group rounded-lg border p-4 transition-colors hover:bg-accent/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{goal.title}</p>
                      {getStatusBadge(goal.status)}
                      {getPriorityBadge(goal.priority)}
                      <Badge className={cn('text-[10px]', categoryColors[goal.category])}>
                        {categoryIcons[goal.category]}
                        <span className="ml-1 capitalize">{goal.category}</span>
                      </Badge>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                    )}
                    {goal.tags && goal.tags.length > 0 && (
                      <div className="mt-1 flex items-center gap-1">
                        {goal.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCompleteGoal(goal.id)}
                      disabled={goal.status === 'completed'}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>
                      {goal.milestone?.label || `${unitLabels[goal.unit]} completed`}
                    </span>
                    <span>
                      {goal.current} / {goal.target}
                    </span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Due: {new Date(goal.dueDate).toLocaleDateString()}</span>
                  <span>Updated: {new Date(goal.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {!compact && (
        <CardFooter className="border-t p-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
          >
            View all goals
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default WeeklyGoals;