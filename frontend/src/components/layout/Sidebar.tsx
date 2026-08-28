'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  Users,
  Settings,
  LogOut,
  Home,
  BarChart3,
  Clock,
  Tag,
  Flag,
  FolderKanban,
  MessageSquare,
  HelpCircle,
  Star,
  Zap,
  Sparkles,
  Target,
  Shield,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  User,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  ChevronUp,
  Grid,
  List,
  Filter,
  SortAsc,
  SortDesc,
  Download,
  Upload,
  RefreshCw,
  Copy,
  Share2,
  ExternalLink,
  FileText,
  Paperclip,
  Image,
  Video,
  Music,
  File,
  Link as LinkIcon,
  Trash2,
  Archive,
  Edit,
  Eye,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useTheme } from 'next-themes';
import { toast } from 'react-hot-toast';

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  children?: NavItem[];
  isActive?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({ className, isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const { tasks, stats } = useTasks();
  const [isLoading, setIsLoading] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActiveRoute = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to logout');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: <LayoutDashboard className="h-5 w-5" />,
          isActive: isActiveRoute('/dashboard'),
        },
        {
          label: 'Tasks',
          href: '/tasks',
          icon: <ListTodo className="h-5 w-5" />,
          badge: stats?.total || 0,
          isActive: isActiveRoute('/tasks'),
        },
        {
          label: 'Calendar',
          href: '/calendar',
          icon: <Calendar className="h-5 w-5" />,
          isActive: isActiveRoute('/calendar'),
        },
        {
          label: 'Board',
          href: '/board',
          icon: <FolderKanban className="h-5 w-5" />,
          isActive: isActiveRoute('/board'),
        },
      ],
    },
    {
      title: 'Collaboration',
      items: [
        {
          label: 'Teams',
          href: '/teams',
          icon: <Users className="h-5 w-5" />,
          badge: user?.teams?.length || 0,
          isActive: isActiveRoute('/teams'),
        },
        {
          label: 'Messages',
          href: '/messages',
          icon: <MessageSquare className="h-5 w-5" />,
          isActive: isActiveRoute('/messages'),
        },
      ],
    },
    {
      title: 'Analytics',
      items: [
        {
          label: 'Reports',
          href: '/reports',
          icon: <BarChart3 className="h-5 w-5" />,
          isActive: isActiveRoute('/reports'),
        },
        {
          label: 'Time Tracking',
          href: '/time-tracking',
          icon: <Clock className="h-5 w-5" />,
          isActive: isActiveRoute('/time-tracking'),
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          label: 'Settings',
          href: '/settings',
          icon: <Settings className="h-5 w-5" />,
          isActive: isActiveRoute('/settings'),
        },
        {
          label: 'Help & Support',
          href: '/help',
          icon: <HelpCircle className="h-5 w-5" />,
          isActive: isActiveRoute('/help'),
        },
      ],
    },
  ];

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = item.isActive || isActiveRoute(item.href);
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      const isCollapsed = collapsedSections[item.label] ?? false;
      return (
        <Collapsible
          key={item.href}
          open={!isCollapsed}
          onOpenChange={() => toggleSection(item.label)}
        >
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-primary/10 text-primary font-medium'
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="ml-4 space-y-1">
            {item.children.map((child) => renderNavItem(child, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:text-accent-foreground',
          isActive && 'bg-primary/10 text-primary font-medium',
          depth > 0 && 'ml-4'
        )}
      >
        <span className="flex-shrink-0">{item.icon}</span>
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-primary-foreground font-bold text-lg">T</span>
          </div>
          <span className="font-semibold text-lg">TodoList</span>
        </Link>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => renderNavItem(item))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4 space-y-3">
        <div className="flex items-center gap-3 rounded-lg bg-accent/50 p-3">
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {user ? getInitials(`${user.firstName} ${user.lastName}`) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user ? `${user.firstName} ${user.lastName}` : 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email || 'user@example.com'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {mounted && theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Button
          variant="outline"
          className="w-full justify-start text-sm"
          onClick={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          Logout
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      >
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-72 bg-background shadow-lg transition-transform duration-300',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {sidebarContent}
        </div>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-background transition-all duration-300',
        isOpen ? 'w-64' : 'w-0 -translate-x-full lg:relative lg:translate-x-0 lg:w-16',
        className
      )}
    >
      {sidebarContent}
    </aside>
  );
}

export default Sidebar;