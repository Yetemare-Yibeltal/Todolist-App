'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Calendar,
  User,
  Users,
  MessageSquare,
  Eye,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Mail,
  Phone,
  BellRing,
  BellOff,
  Settings,
  Trash2,
  Archive,
  MoreVertical,
  Loader2,
  CheckCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
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
  Target,
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
  CheckCircle as CheckCircleIcon,
  AlertOctagon,
  Cloud,
  CloudOff,
  Wifi,
  WifiOff,
  Database,
  Server,
  Shield,
  Lock,
  Unlock,
  Key,
  Fingerprint,
  Smartphone,
  Tablet,
  Monitor,
  Laptop,
  Cpu,
  HardDrive,
  MonitorSmartphone,
  Globe,
  Mail as MailIcon,
  Phone as PhoneIcon,
  MessageCircle as MessageCircleIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/providers/socket-provider';
import { toast } from 'react-hot-toast';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  source?: {
    id: string;
    type: 'task' | 'team' | 'project' | 'comment' | 'user' | 'system';
    name?: string;
  };
  actions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
}

type NotificationType = 
  | 'task_assigned'
  | 'task_completed'
  | 'task_overdue'
  | 'task_deleted'
  | 'task_updated'
  | 'task_commented'
  | 'task_mentioned'
  | 'task_watched'
  | 'team_invite'
  | 'team_joined'
  | 'team_left'
  | 'team_updated'
  | 'comment_added'
  | 'comment_replied'
  | 'mentioned'
  | 'system_alert'
  | 'security_alert'
  | 'reminder'
  | 'weekly_summary'
  | 'monthly_report'
  | 'achievement'
  | 'feedback'
  | 'update';

interface NotificationsCenterProps {
  className?: string;
  limit?: number;
  showRead?: boolean;
  onNotificationClick?: (notification: Notification) => void;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onAction?: (notification: Notification, action: string) => void;
}

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  task_assigned: <User className="h-4 w-4" />,
  task_completed: <CheckCircle className="h-4 w-4" />,
  task_overdue: <AlertTriangle className="h-4 w-4" />,
  task_deleted: <Trash2 className="h-4 w-4" />,
  task_updated: <Edit className="h-4 w-4" />,
  task_commented: <MessageSquare className="h-4 w-4" />,
  task_mentioned: <Bell className="h-4 w-4" />,
  task_watched: <Eye className="h-4 w-4" />,
  team_invite: <Users className="h-4 w-4" />,
  team_joined: <Users className="h-4 w-4" />,
  team_left: <Users className="h-4 w-4" />,
  team_updated: <Settings className="h-4 w-4" />,
  comment_added: <MessageCircle className="h-4 w-4" />,
  comment_replied: <MessageCircle className="h-4 w-4" />,
  mentioned: <Bell className="h-4 w-4" />,
  system_alert: <AlertCircle className="h-4 w-4" />,
  security_alert: <AlertOctagon className="h-4 w-4" />,
  reminder: <Clock className="h-4 w-4" />,
  weekly_summary: <BarChart3 className="h-4 w-4" />,
  monthly_report: <BarChart3 className="h-4 w-4" />,
  achievement: <Star className="h-4 w-4" />,
  feedback: <MessageSquare className="h-4 w-4" />,
  update: <RefreshCw className="h-4 w-4" />,
};

const notificationColors: Record<NotificationType, string> = {
  task_assigned: 'bg-primary/10 text-primary',
  task_completed: 'bg-success/10 text-success',
  task_overdue: 'bg-destructive/10 text-destructive',
  task_deleted: 'bg-destructive/10 text-destructive',
  task_updated: 'bg-info/10 text-info',
  task_commented: 'bg-primary/10 text-primary',
  task_mentioned: 'bg-warning/10 text-warning',
  task_watched: 'bg-info/10 text-info',
  team_invite: 'bg-primary/10 text-primary',
  team_joined: 'bg-success/10 text-success',
  team_left: 'bg-destructive/10 text-destructive',
  team_updated: 'bg-info/10 text-info',
  comment_added: 'bg-primary/10 text-primary',
  comment_replied: 'bg-primary/10 text-primary',
  mentioned: 'bg-warning/10 text-warning',
  system_alert: 'bg-warning/10 text-warning',
  security_alert: 'bg-destructive/10 text-destructive',
  reminder: 'bg-warning/10 text-warning',
  weekly_summary: 'bg-info/10 text-info',
  monthly_report: 'bg-info/10 text-info',
  achievement: 'bg-success/10 text-success',
  feedback: 'bg-info/10 text-info',
  update: 'bg-info/10 text-info',
};

const notificationLabels: Record<NotificationType, string> = {
  task_assigned: 'Assigned to task',
  task_completed: 'Task completed',
  task_overdue: 'Task overdue',
  task_deleted: 'Task deleted',
  task_updated: 'Task updated',
  task_commented: 'Comment added',
  task_mentioned: 'You were mentioned',
  task_watched: 'Started watching',
  team_invite: 'Team invitation',
  team_joined: 'Joined team',
  team_left: 'Left team',
  team_updated: 'Team updated',
  comment_added: 'Comment added',
  comment_replied: 'Reply to comment',
  mentioned: 'Mentioned',
  system_alert: 'System alert',
  security_alert: 'Security alert',
  reminder: 'Reminder',
  weekly_summary: 'Weekly summary',
  monthly_report: 'Monthly report',
  achievement: 'Achievement unlocked',
  feedback: 'Feedback',
  update: 'Update',
};

export function NotificationsCenter({
  className,
  limit = 20,
  showRead = true,
  onNotificationClick,
  onMarkRead,
  onMarkAllRead,
  onAction,
}: NotificationsCenterProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isAllRead, setIsAllRead] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (socket && isConnected) {
      socket.on('notification:new', handleNewNotification);
      socket.on('notification:updated', handleNotificationUpdate);
      socket.on('notification:deleted', handleNotificationDelete);
      
      return () => {
        socket.off('notification:new');
        socket.off('notification:updated');
        socket.off('notification:deleted');
      };
    }
  }, [socket, isConnected]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'task_assigned',
          title: 'Task Assigned',
          message: 'You have been assigned to "Design Homepage"',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 5),
          priority: 'high',
          source: {
            id: 'task_1',
            type: 'task',
            name: 'Design Homepage',
          },
          actions: [
            { label: 'View Task', action: 'view_task', primary: true },
            { label: 'Mark Done', action: 'complete_task' },
          ],
        },
        {
          id: '2',
          type: 'task_completed',
          title: 'Task Completed',
          message: '"Implement Authentication" has been completed by Jane Smith',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 15),
          priority: 'medium',
          source: {
            id: 'task_2',
            type: 'task',
            name: 'Implement Authentication',
          },
        },
        {
          id: '3',
          type: 'team_invite',
          title: 'Team Invitation',
          message: 'You have been invited to join "Design Team" by Mike Johnson',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60),
          priority: 'high',
          source: {
            id: 'team_1',
            type: 'team',
            name: 'Design Team',
          },
          actions: [
            { label: 'Accept', action: 'accept_invite', primary: true },
            { label: 'Decline', action: 'decline_invite' },
          ],
        },
        {
          id: '4',
          type: 'task_commented',
          title: 'New Comment',
          message: 'Sarah Williams commented on "API Integration": "I think we should use GraphQL instead of REST"',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          priority: 'medium',
          source: {
            id: 'task_4',
            type: 'task',
            name: 'API Integration',
          },
        },
        {
          id: '5',
          type: 'mentioned',
          title: 'You were mentioned',
          message: 'Bob Wilson mentioned you in a comment on "Database Schema"',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
          priority: 'low',
          source: {
            id: 'task_5',
            type: 'task',
            name: 'Database Schema',
          },
        },
        {
          id: '6',
          type: 'system_alert',
          title: 'System Maintenance',
          message: 'Scheduled maintenance will occur on Saturday at 2:00 AM UTC',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
          priority: 'medium',
          source: {
            id: 'system_1',
            type: 'system',
          },
        },
        {
          id: '7',
          type: 'achievement',
          title: 'Achievement Unlocked',
          message: 'You have completed 100 tasks! 🎉',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
          priority: 'low',
          source: {
            id: 'achievement_1',
            type: 'system',
          },
        },
        {
          id: '8',
          type: 'weekly_summary',
          title: 'Weekly Summary',
          message: 'You completed 12 tasks this week. Keep up the great work!',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
          priority: 'low',
          source: {
            id: 'summary_1',
            type: 'system',
          },
        },
      ];

      setNotifications(mockNotifications);
      const unread = mockNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
      setIsAllRead(unread === 0);
      setHasMore(mockNotifications.length >= limit);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, limit * 2));
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
      setIsAllRead(false);
    }
    toast.custom((t) => (
      <div className="flex items-start gap-3 p-3 rounded-lg bg-popover border shadow-lg max-w-sm">
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          notificationColors[notification.type]
        )}>
          {notificationIcons[notification.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{notification.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => toast.dismiss(t.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    ));
  };

  const handleNotificationUpdate = (updated: Notification) => {
    setNotifications(prev =>
      prev.map(n => n.id === updated.id ? updated : n)
    );
    if (!updated.read) {
      setUnreadCount(prev => prev + 1);
    } else {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleNotificationDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => {
        if (n.id === id && !n.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
          return { ...n, read: true };
        }
        return n;
      })
    );
    onMarkRead?.(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
    setIsAllRead(true);
    onMarkAllRead?.();
    toast.success('All notifications marked as read');
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkRead(notification.id);
    }
    onNotificationClick?.(notification);
    
    if (notification.source) {
      const route = {
        task: `/tasks/${notification.source.id}`,
        team: `/teams/${notification.source.id}`,
        project: `/projects/${notification.source.id}`,
        comment: `/tasks/${notification.source.id}`,
        user: `/profile/${notification.source.id}`,
        system: '/settings',
      }[notification.source.type];
      
      if (route) {
        router.push(route);
      }
    }
  };

  const handleAction = (notification: Notification, action: string) => {
    onAction?.(notification, action);
    
    switch (action) {
      case 'view_task':
        if (notification.source) {
          router.push(`/tasks/${notification.source.id}`);
        }
        break;
      case 'complete_task':
        toast.success('Task marked as complete');
        break;
      case 'accept_invite':
        toast.success('Invitation accepted');
        break;
      case 'decline_invite':
        toast.success('Invitation declined');
        break;
      default:
        break;
    }
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    if (selectedType !== 'all') {
      filtered = filtered.filter(n => n.type === selectedType);
    }
    
    if (showUnreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.type.toLowerCase().includes(query)
      );
    }
    
    return filtered.slice(0, limit);
  };

  const getTypeOptions = () => {
    const types = ['all', ...new Set(notifications.map(n => n.type))] as (NotificationType | 'all')[];
    return types;
  };

  const renderNotification = (notification: Notification) => {
    const isUnread = !notification.read;
    const timeAgo = formatDistanceToNow(notification.createdAt, { addSuffix: true });

    return (
      <div
        key={notification.id}
        className={cn(
          'group flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer hover:bg-accent',
          isUnread && 'bg-primary/5 hover:bg-primary/10'
        )}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          notificationColors[notification.type],
          !isUnread && 'opacity-60'
        )}>
          {notificationIcons[notification.type]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={cn(
                'text-sm font-medium',
                !isUnread && 'text-muted-foreground'
              )}>
                {notification.title}
              </p>
              <p className={cn(
                'text-sm',
                isUnread ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {notification.message}
              </p>
              {notification.source && (
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="capitalize">{notification.source.type}</span>
                  <span>•</span>
                  <span>{notification.source.name || notification.source.id}</span>
                </div>
              )}
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
                {notification.priority === 'critical' && (
                  <Badge variant="destructive" className="text-[10px]">
                    Critical
                  </Badge>
                )}
                {notification.priority === 'high' && (
                  <Badge variant="warning" className="text-[10px]">
                    High
                  </Badge>
                )}
                {isUnread && (
                  <Badge variant="secondary" className="text-[10px]">
                    New
                  </Badge>
                )}
              </div>
            </div>
            {!notification.read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkRead(notification.id);
                }}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              {notification.actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.primary ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(notification, action.action);
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 mt-2 w-[440px] max-h-[600px] shadow-lg overflow-hidden z-50">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {unreadCount} new
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Stay updated with your latest activity
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleMarkAllRead}
                  disabled={isAllRead || unreadCount === 0}
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setShowUnreadOnly(!showUnreadOnly)}>
                      {showUnreadOnly ? (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Show all
                        </>
                      ) : (
                        <>
                          <Bell className="mr-2 h-4 w-4" />
                          Show unread only
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/notifications')}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View all
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/settings/notifications')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Notification settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <div className="p-3 border-b">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-2 text-xs"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    {selectedType === 'all' ? 'All Types' : selectedType.replace('_', ' ')}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 max-h-60 overflow-y-auto">
                  <DropdownMenuItem onClick={() => setSelectedType('all')}>
                    All Types
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {getTypeOptions().filter(t => t !== 'all').map((type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className="capitalize"
                    >
                      {type.replace('_', ' ')}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                      <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground">You're all caught up!</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="p-2 space-y-1">
                  {filteredNotifications.map(renderNotification)}
                </div>
                {hasMore && (
                  <div className="py-2 text-center">
                    <Button variant="ghost" size="sm" className="text-xs">
                      Load more
                    </Button>
                  </div>
                )}
              </ScrollArea>
            )}
          </CardContent>

          <CardFooter className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => router.push('/notifications')}
            >
              View all notifications
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

export default NotificationsCenter;