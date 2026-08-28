'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lightbulb,
  Sparkles,
  Zap,
  Target,
  Rocket,
  Star,
  Heart,
  ThumbsUp,
  CheckCircle,
  Clock,
  Calendar,
  Users,
  MessageSquare,
  GitBranch,
  Layers,
  BarChart3,
  PieChart,
  Activity,
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
  GitBranch as GitBranchIcon,
  Layers as LayersIcon,
  Zap as ZapIcon,
  Sparkles as SparklesIcon,
  Target as TargetIcon,
  BarChart3 as BarChart3Icon,
  PieChart as PieChartIcon,
  Activity as ActivityIcon,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

interface Suggestion {
  id: string;
  type: 'task' | 'productivity' | 'collaboration' | 'automation' | 'insight' | 'tip';
  title: string;
  description: string;
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  action: () => void;
  dismissed: boolean;
  createdAt: Date;
  category: string;
  tags: string[];
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

interface SuggestionCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface SuggestionsProps {
  className?: string;
  limit?: number;
  onSuggestionAction?: (suggestion: Suggestion) => void;
  onDismiss?: (id: string) => void;
  compact?: boolean;
}

const categories: SuggestionCategory[] = [
  {
    id: 'task',
    label: 'Tasks',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-blue-500',
  },
  {
    id: 'productivity',
    label: 'Productivity',
    icon: <Zap className="h-4 w-4" />,
    color: 'text-yellow-500',
  },
  {
    id: 'collaboration',
    label: 'Collaboration',
    icon: <Users className="h-4 w-4" />,
    color: 'text-green-500',
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: <Rocket className="h-4 w-4" />,
    color: 'text-purple-500',
  },
  {
    id: 'insight',
    label: 'Insights',
    icon: <Lightbulb className="h-4 w-4" />,
    color: 'text-amber-500',
  },
  {
    id: 'tip',
    label: 'Tips',
    icon: <Star className="h-4 w-4" />,
    color: 'text-pink-500',
  },
];

const priorityColors = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-muted/10 text-muted-foreground',
};

const effortLabels = {
  low: 'Easy',
  medium: 'Moderate',
  high: 'Advanced',
};

export function Suggestions({
  className,
  limit = 5,
  onSuggestionAction,
  onDismiss,
  compact = false,
}: SuggestionsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { tasks, stats, isLoading } = useTasks();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isLoading && tasks) {
      generateSuggestions();
    }
  }, [tasks, stats, isLoading]);

  const generateSuggestions = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const newSuggestions: Suggestion[] = [];

      // Task suggestions
      if (tasks && tasks.length > 0) {
        const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done');
        if (overdueTasks.length > 0) {
          newSuggestions.push({
            id: 'suggestion_1',
            type: 'task',
            title: 'Overdue Tasks',
            description: `You have ${overdueTasks.length} overdue tasks. Consider prioritizing them or adjusting their due dates.`,
            icon: <AlertCircle className="h-5 w-5" />,
            priority: 'high',
            actionLabel: 'View Overdue',
            action: () => router.push('/tasks?filter=overdue'),
            dismissed: false,
            createdAt: new Date(),
            category: 'Tasks',
            tags: ['overdue', 'priority'],
            impact: 'High',
            effort: 'low',
          });
        }

        const highPriorityTasks = tasks.filter(t => t.priority === 'high' || t.priority === 'critical');
        if (highPriorityTasks.length > 3) {
          newSuggestions.push({
            id: 'suggestion_2',
            type: 'productivity',
            title: 'Priority Overload',
            description: `You have ${highPriorityTasks.length} high priority tasks. Consider delegating or spreading them out.`,
            icon: <Flag className="h-5 w-5" />,
            priority: 'medium',
            actionLabel: 'View High Priority',
            action: () => router.push('/tasks?priority=high,critical'),
            dismissed: false,
            createdAt: new Date(),
            category: 'Productivity',
            tags: ['priority', 'workload'],
            impact: 'Medium',
            effort: 'medium',
          });
        }
      }

      // Productivity suggestions
      if (stats) {
        if (stats.completionRate && stats.completionRate < 50) {
          newSuggestions.push({
            id: 'suggestion_3',
            type: 'productivity',
            title: 'Boost Your Completion Rate',
            description: `Your current completion rate is ${stats.completionRate}%. Try breaking down larger tasks into smaller subtasks.`,
            icon: <Target className="h-5 w-5" />,
            priority: 'high',
            actionLabel: 'View Tips',
            action: () => router.push('/help/productivity'),
            dismissed: false,
            createdAt: new Date(),
            category: 'Productivity',
            tags: ['completion', 'improvement'],
            impact: 'High',
            effort: 'medium',
          });
        }

        if (stats.totalTimeSpent && stats.totalTimeSpent > 0) {
          const hours = Math.round(stats.totalTimeSpent / 3600);
          if (hours > 40) {
            newSuggestions.push({
              id: 'suggestion_4',
              type: 'insight',
              title: 'Time Management Alert',
              description: `You've spent ${hours} hours on tasks this week. Consider taking breaks and timeboxing your work.`,
              icon: <Clock className="h-5 w-5" />,
              priority: 'medium',
              actionLabel: 'View Time Report',
              action: () => router.push('/time-tracking'),
              dismissed: false,
              createdAt: new Date(),
              category: 'Insights',
              tags: ['time', 'balance'],
              impact: 'Medium',
              effort: 'low',
            });
          }
        }
      }

      // Collaboration suggestions
      if (tasks) {
        const tasksWithComments = tasks.filter(t => t.comments && t.comments.length > 0);
        if (tasksWithComments.length < tasks.length * 0.3) {
          newSuggestions.push({
            id: 'suggestion_5',
            type: 'collaboration',
            title: 'Increase Collaboration',
            description: 'Only 30% of your tasks have comments. Try engaging your team more through task discussions.',
            icon: <MessageSquare className="h-5 w-5" />,
            priority: 'medium',
            actionLabel: 'Start Discussion',
            action: () => router.push('/tasks'),
            dismissed: false,
            createdAt: new Date(),
            category: 'Collaboration',
            tags: ['team', 'communication'],
            impact: 'Medium',
            effort: 'medium',
          });
        }
      }

      // Automation suggestions
      if (tasks && tasks.length > 20) {
        newSuggestions.push({
          id: 'suggestion_6',
          type: 'automation',
          title: 'Automate Repetitive Tasks',
          description: 'You have many recurring tasks. Consider setting up templates or automation rules.',
          icon: <Rocket className="h-5 w-5" />,
          priority: 'low',
          actionLabel: 'Explore Automation',
          action: () => router.push('/settings/automation'),
          dismissed: false,
          createdAt: new Date(),
          category: 'Automation',
          tags: ['automation', 'efficiency'],
          impact: 'High',
          effort: 'high',
        });
      }

      // Tips
      if (tasks && tasks.length > 0 && stats) {
        const avgCompletionTime = stats.averageCompletionTime || 0;
        if (avgCompletionTime > 24) {
          newSuggestions.push({
            id: 'suggestion_7',
            type: 'tip',
            title: 'Faster Task Completion',
            description: `Your average task completion time is ${avgCompletionTime}h. Try using the Pomodoro technique to improve focus.`,
            icon: <Zap className="h-5 w-5" />,
            priority: 'medium',
            actionLabel: 'Learn More',
            action: () => router.push('/help/pomodoro'),
            dismissed: false,
            createdAt: new Date(),
            category: 'Tips',
            tags: ['focus', 'technique'],
            impact: 'Medium',
            effort: 'low',
          });
        }
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDismiss = (id: string) => {
    setSuggestions(prev =>
      prev.map(s => s.id === id ? { ...s, dismissed: true } : s)
    );
    onDismiss?.(id);
    toast.success('Suggestion dismissed');
  };

  const handleAction = (suggestion: Suggestion) => {
    suggestion.action();
    onSuggestionAction?.(suggestion);
  };

  const getFilteredSuggestions = () => {
    let filtered = suggestions.filter(s => !s.dismissed);
    
    if (selectedCategory) {
      filtered = filtered.filter(s => s.category.toLowerCase() === selectedCategory.toLowerCase());
    }
    
    return filtered.slice(0, limit);
  };

  const getSuggestionIcon = (type: Suggestion['type']) => {
    const icons = {
      task: <CheckCircle className="h-5 w-5" />,
      productivity: <Zap className="h-5 w-5" />,
      collaboration: <Users className="h-5 w-5" />,
      automation: <Rocket className="h-5 w-5" />,
      insight: <Lightbulb className="h-5 w-5" />,
      tip: <Star className="h-5 w-5" />,
    };
    return icons[type];
  };

  const getPriorityBadge = (priority: Suggestion['priority']) => {
    const labels = {
      high: 'High Priority',
      medium: 'Medium Priority',
      low: 'Low Priority',
    };
    return labels[priority];
  };

  const filteredSuggestions = getFilteredSuggestions();

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Suggestions
              </CardTitle>
              <CardDescription>Personalized recommendations</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => router.push('/suggestions')}
            >
              View All
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredSuggestions.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No suggestions available
            </div>
          ) : (
            filteredSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-accent/50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  {suggestion.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{suggestion.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {suggestion.description}
                      </p>
                    </div>
                    <Badge className={cn('text-[10px]', priorityColors[suggestion.priority])}>
                      {getPriorityBadge(suggestion.priority)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleAction(suggestion)}
                    >
                      {suggestion.actionLabel}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 px-0"
                      onClick={() => handleDismiss(suggestion.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
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
              <Lightbulb className="h-5 w-5 text-primary" />
              Suggestions
            </CardTitle>
            <CardDescription>
              Personalized recommendations to improve your productivity
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateSuggestions}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>

      <div className="px-6 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.icon}
              <span className="ml-1">{category.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <CardContent>
        {isGenerating ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted-foreground/20" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
                  <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="py-12 text-center">
            <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No suggestions available</p>
            <p className="text-xs text-muted-foreground">Try refreshing or complete more tasks</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={generateSuggestions}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate Suggestions
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={cn(
                  'group flex items-start gap-4 p-4 rounded-lg border transition-colors',
                  suggestion.priority === 'high' && 'border-destructive/20 bg-destructive/5',
                  suggestion.priority === 'medium' && 'border-warning/20 bg-warning/5',
                  suggestion.priority === 'low' && 'border-muted bg-muted/5'
                )}
              >
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  suggestion.priority === 'high' && 'bg-destructive/10 text-destructive',
                  suggestion.priority === 'medium' && 'bg-warning/10 text-warning',
                  suggestion.priority === 'low' && 'bg-muted/10 text-muted-foreground'
                )}>
                  {suggestion.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{suggestion.title}</p>
                        <Badge className="text-[10px]" variant="outline">
                          {suggestion.category}
                        </Badge>
                        <Badge className={cn('text-[10px]', priorityColors[suggestion.priority])}>
                          {getPriorityBadge(suggestion.priority)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {suggestion.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleAction(suggestion)}
                    >
                      {suggestion.actionLabel}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleDismiss(suggestion.id)}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Dismiss
                    </Button>
                    <div className="flex items-center gap-1 ml-auto text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        Impact: {suggestion.impact}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        Effort: {effortLabels[suggestion.effort]}
                      </Badge>
                    </div>
                  </div>

                  {suggestion.tags && suggestion.tags.length > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      {suggestion.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {!compact && filteredSuggestions.length > 0 && (
        <CardFooter className="border-t p-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => router.push('/suggestions')}
          >
            View all suggestions
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default Suggestions;