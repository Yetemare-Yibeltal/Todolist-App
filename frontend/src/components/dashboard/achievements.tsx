'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Trophy,
  Award,
  Medal,
  Crown,
  Target,
  Zap,
  Sparkles,
  Rocket,
  Fire,
  Gem,
  Diamond,
  Heart,
  ThumbsUp,
  CheckCircle,
  Calendar,
  Clock,
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
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { toast } from 'react-hot-toast';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'productivity' | 'collaboration' | 'streak' | 'excellence' | 'special';
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  target: number;
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  requirement: string;
  secret?: boolean;
  hidden?: boolean;
}

interface AchievementCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface AchievementsProps {
  className?: string;
  userId?: string;
  compact?: boolean;
  onAchievementClick?: (achievement: Achievement) => void;
  onShare?: (achievement: Achievement) => void;
}

const categories: AchievementCategory[] = [
  {
    id: 'productivity',
    label: 'Productivity',
    icon: <BarChart3 className="h-4 w-4" />,
    color: 'text-blue-500',
  },
  {
    id: 'collaboration',
    label: 'Collaboration',
    icon: <Users className="h-4 w-4" />,
    color: 'text-green-500',
  },
  {
    id: 'streak',
    label: 'Streak',
    icon: <Fire className="h-4 w-4" />,
    color: 'text-orange-500',
  },
  {
    id: 'excellence',
    label: 'Excellence',
    icon: <Star className="h-4 w-4" />,
    color: 'text-yellow-500',
  },
  {
    id: 'special',
    label: 'Special',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-purple-500',
  },
];

const rarityColors = {
  common: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  uncommon: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rare: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  epic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  legendary: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

const rarityBadges = {
  common: { label: 'Common', color: 'bg-gray-500' },
  uncommon: { label: 'Uncommon', color: 'bg-green-500' },
  rare: { label: 'Rare', color: 'bg-blue-500' },
  epic: { label: 'Epic', color: 'bg-purple-500' },
  legendary: { label: 'Legendary', color: 'bg-amber-500' },
};

export function Achievements({
  className,
  userId,
  compact = false,
  onAchievementClick,
  onShare,
}: AchievementsProps) {
  const { user } = useAuth();
  const { tasks, stats } = useTasks();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUnlocked, setShowUnlocked] = useState<boolean | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const [totalPoints, setTotalPoints] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadAchievements();
  }, []);

  useEffect(() => {
    if (tasks && stats) {
      updateAchievementProgress();
    }
  }, [tasks, stats]);

  const loadAchievements = async () => {
    setIsLoading(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockAchievements: Achievement[] = [
        {
          id: '1',
          name: 'Task Master',
          description: 'Complete 50 tasks',
          icon: <CheckCircle className="h-6 w-6" />,
          category: 'productivity',
          unlocked: true,
          unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
          progress: 50,
          target: 50,
          points: 100,
          rarity: 'rare',
          requirement: 'Complete 50 tasks across all projects',
        },
        {
          id: '2',
          name: 'Streak Warrior',
          description: 'Complete tasks for 30 consecutive days',
          icon: <Fire className="h-6 w-6" />,
          category: 'streak',
          unlocked: false,
          progress: 18,
          target: 30,
          points: 150,
          rarity: 'epic',
          requirement: 'Complete at least 1 task every day for 30 days',
        },
        {
          id: '3',
          name: 'Team Player',
          description: 'Complete 20 tasks assigned to you',
          icon: <Users className="h-6 w-6" />,
          category: 'collaboration',
          unlocked: true,
          unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
          progress: 20,
          target: 20,
          points: 80,
          rarity: 'uncommon',
          requirement: 'Complete 20 tasks assigned to you',
        },
        {
          id: '4',
          name: 'Early Bird',
          description: 'Complete 10 tasks before 9 AM',
          icon: <Clock className="h-6 w-6" />,
          category: 'productivity',
          unlocked: false,
          progress: 7,
          target: 10,
          points: 60,
          rarity: 'uncommon',
          requirement: 'Complete tasks before 9:00 AM',
        },
        {
          id: '5',
          name: 'Night Owl',
          description: 'Complete 10 tasks after 11 PM',
          icon: <Moon className="h-6 w-6" />,
          category: 'productivity',
          unlocked: false,
          progress: 3,
          target: 10,
          points: 60,
          rarity: 'uncommon',
          requirement: 'Complete tasks after 11:00 PM',
        },
        {
          id: '6',
          name: 'Collaborator',
          description: 'Comment on 50 tasks',
          icon: <MessageSquare className="h-6 w-6" />,
          category: 'collaboration',
          unlocked: true,
          unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
          progress: 50,
          target: 50,
          points: 100,
          rarity: 'rare',
          requirement: 'Add 50 comments to tasks',
        },
        {
          id: '7',
          name: 'Priority Master',
          description: 'Complete 100 high priority tasks',
          icon: <Flag className="h-6 w-6" />,
          category: 'excellence',
          unlocked: false,
          progress: 67,
          target: 100,
          points: 200,
          rarity: 'epic',
          requirement: 'Complete 100 high priority tasks',
        },
        {
          id: '8',
          name: 'Perfectionist',
          description: 'Have 0 overdue tasks for 30 days',
          icon: <Target className="h-6 w-6" />,
          category: 'excellence',
          unlocked: false,
          progress: 15,
          target: 30,
          points: 250,
          rarity: 'legendary',
          requirement: 'Maintain 0 overdue tasks for 30 consecutive days',
        },
        {
          id: '9',
          name: 'Task Tamer',
          description: 'Create 100 tasks',
          icon: <Plus className="h-6 w-6" />,
          category: 'productivity',
          unlocked: true,
          unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
          progress: 100,
          target: 100,
          points: 120,
          rarity: 'rare',
          requirement: 'Create 100 tasks',
        },
        {
          id: '10',
          name: 'Secret Achiever',
          description: 'Complete a secret achievement',
          icon: <Sparkles className="h-6 w-6" />,
          category: 'special',
          unlocked: false,
          progress: 0,
          target: 1,
          points: 500,
          rarity: 'legendary',
          requirement: 'Find and complete a secret achievement',
          secret: true,
        },
      ];

      setAchievements(mockAchievements);
      
      const unlocked = mockAchievements.filter(a => a.unlocked).length;
      const total = mockAchievements.length;
      const points = mockAchievements
        .filter(a => a.unlocked)
        .reduce((sum, a) => sum + a.points, 0);
      
      setUnlockedCount(unlocked);
      setTotalCount(total);
      setTotalPoints(points);
    } catch (error) {
      console.error('Failed to load achievements:', error);
      toast.error('Failed to load achievements');
    } finally {
      setIsLoading(false);
    }
  };

  const updateAchievementProgress = () => {
    // Update progress based on real data
    const updated = achievements.map(achievement => {
      let progress = achievement.progress;
      
      switch (achievement.id) {
        case '1': // Task Master
          progress = stats?.done || 0;
          break;
        case '3': // Team Player
          progress = tasks?.filter(t => t.assignee?.id === user?.id && t.status === 'done').length || 0;
          break;
        case '6': // Collaborator
          progress = tasks?.reduce((sum, t) => sum + (t.comments?.length || 0), 0) || 0;
          break;
        case '9': // Task Tamer
          progress = stats?.total || 0;
          break;
        default:
          break;
      }
      
      const unlocked = progress >= achievement.target;
      
      return {
        ...achievement,
        progress: Math.min(progress, achievement.target),
        unlocked,
        unlockedAt: unlocked ? (achievement.unlockedAt || new Date()) : undefined,
      };
    });

    setAchievements(updated);
    
    const unlocked = updated.filter(a => a.unlocked).length;
    const points = updated
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.points, 0);
    
    setUnlockedCount(unlocked);
    setTotalPoints(points);
  };

  const getFilteredAchievements = () => {
    let filtered = achievements;
    
    if (selectedCategory) {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }
    
    if (showUnlocked !== null) {
      filtered = filtered.filter(a => a.unlocked === showUnlocked);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.requirement.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const getRarityLabel = (rarity: Achievement['rarity']) => {
    return rarityBadges[rarity].label;
  };

  const getRarityColor = (rarity: Achievement['rarity']) => {
    return rarityBadges[rarity].color;
  };

  const renderAchievementCard = (achievement: Achievement) => {
    const progressPercent = (achievement.progress / achievement.target) * 100;
    const isUnlocked = achievement.unlocked;
    const isSecret = achievement.secret;

    if (isSecret && !isUnlocked) {
      return (
        <div
          key={achievement.id}
          className={cn(
            'rounded-lg border bg-card p-4 text-center',
            'opacity-50 blur-sm hover:blur-0 transition-all duration-300'
          )}
        >
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium">???</p>
          <p className="text-xs text-muted-foreground">Secret Achievement</p>
          <div className="mt-2">
            <Badge variant="outline" className="text-[10px]">
              {rarityBadges[achievement.rarity].label}
            </Badge>
          </div>
        </div>
      );
    }

    return (
      <div
        key={achievement.id}
        className={cn(
          'group relative rounded-lg border bg-card p-4 transition-all cursor-pointer hover:shadow-md',
          isUnlocked ? 'border-primary/20' : 'opacity-60',
          selectedAchievement?.id === achievement.id && 'ring-2 ring-primary'
        )}
        onClick={() => {
          setSelectedAchievement(achievement);
          onAchievementClick?.(achievement);
        }}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            isUnlocked ? 'bg-primary/10' : 'bg-muted'
          )}>
            {isUnlocked ? achievement.icon : (
              <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {achievement.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {achievement.description}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    rarityColors[achievement.rarity]
                  )}
                >
                  {getRarityLabel(achievement.rarity)}
                </Badge>
                {isUnlocked && (
                  <Badge variant="success" className="text-[10px]">
                    <Check className="h-2.5 w-2.5 mr-0.5" />
                    Unlocked
                  </Badge>
                )}
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{Math.min(achievement.progress, achievement.target)} / {achievement.target}</span>
              </div>
              <Progress
                value={progressPercent}
                className={cn(
                  'h-1.5',
                  isUnlocked ? 'bg-primary' : 'bg-muted'
                )}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {achievement.requirement}
              </span>
              <span className="font-medium text-primary">
                +{achievement.points} XP
              </span>
            </div>
            {isUnlocked && achievement.unlockedAt && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {isUnlocked && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onShare?.(achievement);
              toast.success('Achievement shared!');
            }}
          >
            <Share className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  };

  const filteredAchievements = getFilteredAchievements();

  if (compact) {
    const recentUnlocked = achievements
      .filter(a => a.unlocked)
      .sort((a, b) => (b.unlockedAt?.getTime() || 0) - (a.unlockedAt?.getTime() || 0))
      .slice(0, 3);

    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Achievements
              </CardTitle>
              <CardDescription>
                {unlockedCount} / {totalCount} unlocked • {totalPoints} XP
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => router.push('/achievements')}
            >
              View All
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentUnlocked.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No achievements unlocked yet
            </div>
          ) : (
            recentUnlocked.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-primary/5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  {achievement.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{achievement.name}</p>
                  <p className="text-xs text-muted-foreground">
                    +{achievement.points} XP
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    rarityColors[achievement.rarity]
                  )}
                >
                  {getRarityLabel(achievement.rarity)}
                </Badge>
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
              <Trophy className="h-5 w-5 text-primary" />
              Achievements
              <Badge variant="secondary" className="ml-2">
                {unlockedCount} / {totalCount}
              </Badge>
            </CardTitle>
            <CardDescription>
              {totalPoints} XP earned • Keep going to unlock more!
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="px-6 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search achievements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-2 text-xs"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Filter className="h-3.5 w-3.5 mr-1" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Category</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedCategory(null)}>
                All Categories
              </DropdownMenuItem>
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-2"
                >
                  {category.icon}
                  {category.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setShowUnlocked(true)}>
                <Check className="h-3.5 w-3.5 mr-2" />
                Unlocked Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowUnlocked(false)}>
                <Lock className="h-3.5 w-3.5 mr-2" />
                Locked Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowUnlocked(null)}>
                <Eye className="h-3.5 w-3.5 mr-2" />
                All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredAchievements.length === 0 ? (
          <div className="py-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No achievements found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map(renderAchievementCard)}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAchievements.map(renderAchievementCard)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Achievements;