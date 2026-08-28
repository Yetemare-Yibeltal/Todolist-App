'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Users,
  MessageSquare,
  Edit,
  Trash2,
  Plus,
  Archive,
  Flag,
  Calendar,
  Tag,
  Star,
  Eye,
  Link,
  FileText,
  GitBranch,
  Layers,
  Settings,
  HelpCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Sparkles,
  Award,
  Target,
  BarChart3,
  PieChart,
  GitCommit,
  GitPullRequest,
  GitMerge,
  GitBranch as GitBranchIcon,
  MessageCircle,
  Bell,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  Users as UsersIcon,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/providers/socket-provider';
import { format } from 'date-fns';

interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: string;
  target?: string;
  targetId?: string;
  targetType?: 'task' | 'team' | 'project' | 'comment' | 'user';
  details?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  read: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

type ActivityType =
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'task_deleted'
  | 'task_archived'
  | 'task_restored'
  | 'task_assigned'
  | 'task_unassigned'
  | 'task_priority_changed'
  | 'task_status_changed'
  | 'task_duedate_changed'
  | 'task_label_added'
  | 'task_label_removed'
  | 'task_tag_added'
  | 'task_tag_removed'
  | 'task_watcher_added'
  | 'task_watcher_removed'
  | 'task_subtask_added'
  | 'task_subtask_completed'
  | 'task_subtask_deleted'
  | 'task_comment_added'
  | 'task_comment_updated'
  | 'task_comment_deleted'
  | 'task_attachment_added'
  | 'task_attachment_removed'
  | 'task_mentioned'
  | 'task_time_tracking_started'
  | 'task_time_tracking_paused'
  | 'task_time_tracking_stopped'
  | 'team_created'
  | 'team_updated'
  | 'team_deleted'
  | 'team_member_added'
  | 'team_member_removed'
  | 'team_member_role_changed'
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'project_member_added'
  | 'project_member_removed'
  | 'user_joined'
  | 'user_left'
  | 'user_updated'
  | 'user_status_changed'
  | 'comment_added'
  | 'comment_updated'
  | 'comment_deleted'
  | 'mentioned'
  | 'system_alert'
  | 'security_alert';

interface ActivityFeedProps {
  className?: string;
  limit?: number;
  userId?: string;
  teamId?: string;
  projectId?: string;
  taskId?: string;
  types?: ActivityType[];
  showReadStatus?: boolean;
  onActivityClick?: (activity: Activity) => void;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  task_created: <Plus className="h-4 w-4" />,
  task_updated: <Edit className="h-4 w-4" />,
  task_completed: <CheckCircle className="h-4 w-4" />,
  task_deleted: <Trash2 className="h-4 w-4" />,
  task_archived: <Archive className="h-4 w-4" />,
  task_restored: <RefreshCw className="h-4 w-4" />,
  task_assigned: <UserCheck className="h-4 w-4" />,
  task_unassigned: <UserX className="h-4 w-4" />,
  task_priority_changed: <Flag className="h-4 w-4" />,
  task_status_changed: <Activity className="h-4 w-4" />,
  task_duedate_changed: <Calendar className="h-4 w-4" />,
  task_label_added: <Tag className="h-4 w-4" />,
  task_label_removed: <Tag className="h-4 w-4" />,
  task_tag_added: <Tag className="h-4 w-4" />,
  task_tag_removed: <Tag className="h-4 w-4" />,
  task_watcher_added: <Eye className="h-4 w-4" />,
  task_watcher_removed: <Eye className="h-4 w-4" />,
  task_subtask_added: <GitBranchIcon className="h-4 w-4" />,
  task_subtask_completed: <CheckCircle className="h-4 w-4" />,
  task_subtask_deleted: <Trash2 className="h-4 w-4" />,
  task_comment_added: <MessageSquare className="h-4 w-4" />,
  task_comment_updated: <Edit className="h-4 w-4" />,
  task_comment_deleted: <Trash2 className="h-4 w-4" />,
  task_attachment_added: <FileText className="h-4 w-4" />,
  task_attachment_removed: <FileText className="h-4 w-4" />,
  task_mentioned: <Bell className="h-4 w-4" />,
  task_time_tracking_started: <Play className="h-4 w-4" />,
  task_time_tracking_paused: <Pause className="h-4 w-4" />,
  task_time_tracking_stopped: <Square className="h-4 w-4" />,
  team_created: <UsersIcon className="h-4 w-4" />,
  team_updated: <Edit className="h-4 w-4" />,
  team_deleted: <Trash2 className="h-4 w-4" />,
  team_member_added: <UserPlus className="h-4 w-4" />,
  team_member_removed: <UserMinus className="h-4 w-4" />,
  team_member_role_changed: <Users className="h-4 w-4" />,
  project_created: <Layers className="h-4 w-4" />,
  project_updated: <Edit className="h-4 w-4" />,
  project_deleted: <Trash2 className="h-4 w-4" />,
  project_member_added: <UserPlus className="h-4 w-4" />,
  project_member_removed: <UserMinus className="h-4 w-4" />,
  user_joined: <UserPlus className="h-4 w-4" />,
  user_left: <UserMinus className="h-4 w-4" />,
  user_updated: <Edit className="h-4 w-4" />,
  user_status_changed: <Activity className="h-4 w-4" />,
  comment_added: <MessageCircle className="h-4 w-4" />,
  comment_updated: <Edit className="h-4 w-4" />,
  comment_deleted: <Trash2 className="h-4 w-4" />,
  mentioned: <Bell className="h-4 w-4" />,
  system_alert: <AlertCircle className="h-4 w-4" />,
  security_alert: <AlertTriangle className="h-4 w-4" />,
};

const activityColors: Record<ActivityType, string> = {
  task_created: 'bg-primary/10 text-primary',
  task_updated: 'bg-info/10 text-info',
  task_completed: 'bg-success/10 text-success',
  task_deleted: 'bg-destructive/10 text-destructive',
  task_archived: 'bg-muted/10 text-muted-foreground',
  task_restored: 'bg-success/10 text-success',
  task_assigned: 'bg-primary/10 text-primary',
  task_unassigned: 'bg-muted/10 text-muted-foreground',
  task_priority_changed: 'bg-warning/10 text-warning',
  task_status_changed: 'bg-info/10 text-info',
  task_duedate_changed: 'bg-warning/10 text-warning',
  task_label_added: 'bg-primary/10 text-primary',
  task_label_removed: 'bg-muted/10 text-muted-foreground',
  task_tag_added: 'bg-primary/10 text-primary',
  task_tag_removed: 'bg-muted/10 text-muted-foreground',
  task_watcher_added: 'bg-primary/10 text-primary',
  task_watcher_removed: 'bg-muted/10 text-muted-foreground',
  task_subtask_added: 'bg-primary/10 text-primary',
  task_subtask_completed: 'bg-success/10 text-success',
  task_subtask_deleted: 'bg-destructive/10 text-destructive',
  task_comment_added: 'bg-primary/10 text-primary',
  task_comment_updated: 'bg-info/10 text-info',
  task_comment_deleted: 'bg-destructive/10 text-destructive',
  task_attachment_added: 'bg-primary/10 text-primary',
  task_attachment_removed: 'bg-destructive/10 text-destructive',
  task_mentioned: 'bg-primary/10 text-primary',
  task_time_tracking_started: 'bg-success/10 text-success',
  task_time_tracking_paused: 'bg-warning/10 text-warning',
  task_time_tracking_stopped: 'bg-info/10 text-info',
  team_created: 'bg-primary/10 text-primary',
  team_updated: 'bg-info/10 text-info',
  team_deleted: 'bg-destructive/10 text-destructive',
  team_member_added: 'bg-success/10 text-success',
  team_member_removed: 'bg-destructive/10 text-destructive',
  team_member_role_changed: 'bg-warning/10 text-warning',
  project_created: 'bg-primary/10 text-primary',
  project_updated: 'bg-info/10 text-info',
  project_deleted: 'bg-destructive/10 text-destructive',
  project_member_added: 'bg-success/10 text-success',
  project_member_removed: 'bg-destructive/10 text-destructive',
  user_joined: 'bg-success/10 text-success',
  user_left: 'bg-destructive/10 text-destructive',
  user_updated: 'bg-info/10 text-info',
  user_status_changed: 'bg-info/10 text-info',
  comment_added: 'bg-primary/10 text-primary',
  comment_updated: 'bg-info/10 text-info',
  comment_deleted: 'bg-destructive/10 text-destructive',
  mentioned: 'bg-primary/10 text-primary',
  system_alert: 'bg-warning/10 text-warning',
  security_alert: 'bg-destructive/10 text-destructive',
};

const activityLabels: Record<ActivityType, string> = {
  task_created: 'created a task',
  task_updated: 'updated a task',
  task_completed: 'completed a task',
  task_deleted: 'deleted a task',
  task_archived: 'archived a task',
  task_restored: 'restored a task',
  task_assigned: 'assigned a task',
  task_unassigned: 'unassigned a task',
  task_priority_changed: 'changed task priority',
  task_status_changed: 'changed task status',
  task_duedate_changed: 'changed task due date',
  task_label_added: 'added a label to task',
  task_label_removed: 'removed a label from task',
  task_tag_added: 'added a tag to task',
  task_tag_removed: 'removed a tag from task',
  task_watcher_added: 'started watching a task',
  task_watcher_removed: 'stopped watching a task',
  task_subtask_added: 'added a subtask',
  task_subtask_completed: 'completed a subtask',
  task_subtask_deleted: 'deleted a subtask',
  task_comment_added: 'added a comment',
  task_comment_updated: 'updated a comment',
  task_comment_deleted: 'deleted a comment',
  task_attachment_added: 'added an attachment',
  task_attachment_removed: 'removed an attachment',
  task_mentioned: 'mentioned you',
  task_time_tracking_started: 'started time tracking',
  task_time_tracking_paused: 'paused time tracking',
  task_time_tracking_stopped: 'stopped time tracking',
  team_created: 'created a team',
  team_updated: 'updated a team',
  team_deleted: 'deleted a team',
  team_member_added: 'added a team member',
  team_member_removed: 'removed a team member',
  team_member_role_changed: 'changed team member role',
  project_created: 'created a project',
  project_updated: 'updated a project',
  project_deleted: 'deleted a project',
  project_member_added: 'added a project member',
  project_member_removed: 'removed a project member',
  user_joined: 'joined the team',
  user_left: 'left the team',
  user_updated: 'updated their profile',
  user_status_changed: 'changed their status',
  comment_added: 'added a comment',
  comment_updated: 'updated a comment',
  comment_deleted: 'deleted a comment',
  mentioned: 'mentioned you',
  system_alert: 'system alert',
  security_alert: 'security alert',
};

export function ActivityFeed({
  className,
  limit = 20,
  userId,
  teamId,
  projectId,
  taskId,
  types,
  showReadStatus = true,
  onActivityClick,
  onMarkRead,
  onMarkAllRead,
}: ActivityFeedProps) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadActivities();
  }, [userId, teamId, projectId, taskId, limit]);

  useEffect(() => {
    if (socket && isConnected) {
      socket.on('activity:new', handleNewActivity);
      socket.on('activity:updated', handleActivityUpdate);
      socket.on('activity:deleted', handleActivityDelete);
      
      return () => {
        socket.off('activity:new');
        socket.off('activity:updated');
        socket.off('activity:deleted');
      };
    }
  }, [socket, isConnected]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockActivities: Activity[] = [
        {
          id: '1',
          type: 'task_completed',
          userId: '1',
          userName: 'John Doe',
          userAvatar: '',
          action: 'completed the task "Design Homepage"',
          target: 'Design Homepage',
          targetId: 'task_1',
          targetType: 'task',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          read: false,
          priority: 'medium',
        },
        {
          id: '2',
          type: 'task_created',
          userId: '2',
          userName: 'Jane Smith',
          userAvatar: '',
          action: 'created a new task "Implement Authentication"',
          target: 'Implement Authentication',
          targetId: 'task_2',
          targetType: 'task',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          read: true,
          priority: 'high',
        },
        {
          id: '3',
          type: 'team_member_added',
          userId: '3',
          userName: 'Mike Johnson',
          userAvatar: '',
          action: 'added Alice Wonder to the "Design Team"',
          target: 'Design Team',
          targetId: 'team_1',
          targetType: 'team',
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          read: true,
          priority: 'medium',
        },
        {
          id: '4',
          type: 'task_assigned',
          userId: '4',
          userName: 'Sarah Williams',
          userAvatar: '',
          action: 'assigned "Fix Bug #123" to John Doe',
          target: 'Fix Bug #123',
          targetId: 'task_3',
          targetType: 'task',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          read: true,
          priority: 'high',
        },
        {
          id: '5',
          type: 'task_comment_added',
          userId: '5',
          userName: 'Bob Wilson',
          userAvatar: '',
          action: 'commented on "API Integration"',
          target: 'API Integration',
          targetId: 'task_4',
          targetType: 'task',
          details: 'I think we should use GraphQL instead of REST',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
          read: true,
          priority: 'medium',
        },
      ];

      setActivities(mockActivities);
      setUnreadCount(mockActivities.filter(a => !a.read).length);
      setHasMore(mockActivities.length >= limit);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewActivity = (activity: Activity) => {
    setActivities(prev => [activity, ...prev].slice(0, limit * 2));
    if (!activity.read) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const handleActivityUpdate = (updated: Activity) => {
    setActivities(prev =>
      prev.map(a => a.id === updated.id ? updated : a)
    );
  };

  const handleActivityDelete = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const handleMarkRead = async (id: string) => {
    setActivities(prev =>
      prev.map(a => {
        if (a.id === id && !a.read) {
          setUnreadCount(prev => prev - 1);
          return { ...a, read: true };
        }
        return a;
      })
    );
    onMarkRead?.(id);
  };

  const handleMarkAllRead = async () => {
    setActivities(prev =>
      prev.map(a => ({ ...a, read: true }))
    );
    setUnreadCount(0);
    onMarkAllRead?.();
  };

  const getTimeAgo = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Activity Feed</span>
            <Skeleton className="h-4 w-16" />
          </CardTitle>
          <CardDescription>Recent activity across your workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
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

  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>No recent activity</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No activities to show</p>
        </CardContent>
      </Card>
    );
  }

  const filteredActivities = types
    ? activities.filter(a => types.includes(a.type))
    : activities;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Activity Feed
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Recent activity across your workspace</CardDescription>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <Check className="mr-2 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          <div className="space-y-6 py-4">
            {filteredActivities.slice(0, limit).map((activity, index) => (
              <div
                key={activity.id}
                className={cn(
                  'flex items-start gap-3 cursor-pointer transition-colors hover:bg-muted/50 p-2 rounded-lg',
                  !activity.read && 'bg-primary/5'
                )}
                onClick={() => onActivityClick?.(activity)}
              >
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  activityColors[activity.type]
                )}>
                  {activityIcons[activity.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={activity.userAvatar} />
                        <AvatarFallback className="text-[10px]">
                          {activity.userName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm">
                        <span className="font-medium">{activity.userName}</span>
                        <span className="text-muted-foreground"> {activity.action}</span>
                      </p>
                    </div>
                    {showReadStatus && !activity.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(activity.id);
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {activity.details && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {activity.details}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{getTimeAgo(activity.timestamp)}</span>
                    {activity.priority && (
                      <Badge variant="outline" className="text-[10px]">
                        {activity.priority}
                      </Badge>
                    )}
                    {activity.targetType && (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {activity.targetType}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="py-4 text-center">
              <Button variant="ghost" size="sm">
                Load more
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ActivityFeed;