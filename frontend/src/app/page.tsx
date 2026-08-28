import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { TaskList } from '@/components/tasks/task-list';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { UpcomingTasks } from '@/components/dashboard/upcoming-tasks';
import { ProductivityChart } from '@/components/dashboard/productivity-chart';
import { TeamActivity } from '@/components/dashboard/team-activity';
import { RecentComments } from '@/components/dashboard/recent-comments';
import { TaskDistribution } from '@/components/dashboard/task-distribution';
import { CompletionRate } from '@/components/dashboard/completion-rate';
import { PriorityMatrix } from '@/components/dashboard/priority-matrix';
import { TimeTrackingOverview } from '@/components/dashboard/time-tracking-overview';
import { NotificationsCenter } from '@/components/dashboard/notifications-center';
import { QuickStats } from '@/components/dashboard/quick-stats';
import { WeeklyGoals } from '@/components/dashboard/weekly-goals';
import { Achievements } from '@/components/dashboard/achievements';
import { Suggestions } from '@/components/dashboard/suggestions';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Dashboard - TodoList Pro',
  description: 'Overview of your tasks, productivity, and team activity.',
};

interface PageProps {
  searchParams: {
    view?: 'list' | 'board' | 'calendar' | 'timeline';
    filter?: string;
    sort?: string;
  };
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const cookieStore = cookies();
  const token = cookieStore.get('accessToken');
  
  if (!token) {
    redirect('/login');
  }

  const { view = 'list', filter, sort } = searchParams;

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-8 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Here's an overview of your tasks and team activity.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <NotificationsCenter />
            <QuickActions />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Suspense fallback={<div className="animate-pulse h-24 rounded-lg bg-muted" />}>
            <StatsCards />
          </Suspense>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            <Suspense fallback={<div className="animate-pulse h-[400px] rounded-lg bg-muted" />}>
              <ProductivityChart />
            </Suspense>
          </div>
          <div className="col-span-3">
            <Suspense fallback={<div className="animate-pulse h-[400px] rounded-lg bg-muted" />}>
              <TaskDistribution />
            </Suspense>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Suspense fallback={<div className="animate-pulse h-[200px] rounded-lg bg-muted" />}>
            <QuickStats />
          </Suspense>
          <Suspense fallback={<div className="animate-pulse h-[200px] rounded-lg bg-muted" />}>
            <WeeklyGoals />
          </Suspense>
          <Suspense fallback={<div className="animate-pulse h-[200px] rounded-lg bg-muted" />}>
            <CompletionRate />
          </Suspense>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            <Suspense fallback={<div className="animate-pulse h-[500px] rounded-lg bg-muted" />}>
              <TaskList view={view} filter={filter} sort={sort} />
            </Suspense>
          </div>
          <div className="col-span-3 space-y-4">
            <Suspense fallback={<div className="animate-pulse h-[200px] rounded-lg bg-muted" />}>
              <UpcomingTasks />
            </Suspense>
            <Suspense fallback={<div className="animate-pulse h-[200px] rounded-lg bg-muted" />}>
              <ActivityFeed />
            </Suspense>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Suspense fallback={<div className="animate-pulse h-[300px] rounded-lg bg-muted" />}>
            <PriorityMatrix />
          </Suspense>
          <Suspense fallback={<div className="animate-pulse h-[300px] rounded-lg bg-muted" />}>
            <TimeTrackingOverview />
          </Suspense>
          <Suspense fallback={<div className="animate-pulse h-[300px] rounded-lg bg-muted" />}>
            <RecentComments />
          </Suspense>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Suspense fallback={<div className="animate-pulse h-[300px] rounded-lg bg-muted" />}>
            <TeamActivity />
          </Suspense>
          <Suspense fallback={<div className="animate-pulse h-[300px] rounded-lg bg-muted" />}>
            <Suggestions />
          </Suspense>
        </div>

        <Suspense fallback={<div className="animate-pulse h-[200px] rounded-lg bg-muted" />}>
          <Achievements />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}