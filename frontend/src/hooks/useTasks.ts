import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import {
  Task,
  TaskFilters,
  TaskStats,
  TaskSortOptions,
  PaginationOptions,
} from "@/types/task";
import { useAuth } from "./useAuth";

interface TaskState {
  tasks: Task[];
  stats: TaskStats | null;
  filters: TaskFilters;
  sort: TaskSortOptions;
  pagination: PaginationOptions;
  isLoading: boolean;
  error: string | null;
  selectedTasks: string[];
  view: "list" | "board" | "calendar" | "timeline";
  searchQuery: string;
}

interface TaskActions {
  createTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string, permanent?: boolean) => Promise<void>;
  restoreTask: (id: string) => Promise<Task>;
  archiveTask: (id: string) => Promise<Task>;
  assignTask: (id: string, assigneeId: string) => Promise<Task>;
  addSubtask: (taskId: string, subtaskId: string) => Promise<Task>;
  removeSubtask: (taskId: string, subtaskId: string) => Promise<Task>;
  addComment: (taskId: string, comment: string) => Promise<Task>;
  removeComment: (taskId: string, commentId: string) => Promise<Task>;
  addAttachment: (taskId: string, file: File) => Promise<Task>;
  removeAttachment: (taskId: string, attachmentId: string) => Promise<Task>;
  toggleChecklistItem: (taskId: string, index: number) => Promise<Task>;
  startTimeTracking: (taskId: string) => Promise<Task>;
  pauseTimeTracking: (taskId: string) => Promise<Task>;
  stopTimeTracking: (taskId: string) => Promise<Task>;
  addWatcher: (taskId: string) => Promise<Task>;
  removeWatcher: (taskId: string) => Promise<Task>;
  addReminder: (taskId: string, time: Date, type: string) => Promise<Task>;
  removeReminder: (taskId: string, reminderId: string) => Promise<Task>;
  bulkUpdate: (taskIds: string[], updates: Partial<Task>) => Promise<void>;
  setFilters: (filters: TaskFilters) => void;
  setSort: (sort: TaskSortOptions) => void;
  setPagination: (pagination: PaginationOptions) => void;
  setSearch: (query: string) => void;
  setView: (view: "list" | "board" | "calendar" | "timeline") => void;
  selectTask: (id: string) => void;
  deselectTask: (id: string) => void;
  selectAllTasks: () => void;
  deselectAllTasks: () => void;
  clearSelection: () => void;
  refetch: () => void;
}

export function useTasks(): TaskState & TaskActions {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [state, setState] = useState<TaskState>({
    tasks: [],
    stats: null,
    filters: {},
    sort: { field: "createdAt", direction: "desc" },
    pagination: { page: 1, limit: 20 },
    isLoading: false,
    error: null,
    selectedTasks: [],
    view: "list",
    searchQuery: "",
  });

  const {
    data: tasksData,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: [
      "tasks",
      state.filters,
      state.sort,
      state.pagination,
      state.searchQuery,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (state.filters.status)
        params.append("status", state.filters.status.join(","));
      if (state.filters.priority)
        params.append("priority", state.filters.priority.join(","));
      if (state.filters.assignee)
        params.append("assignee", state.filters.assignee);
      if (state.filters.creator)
        params.append("creator", state.filters.creator);
      if (state.filters.team) params.append("team", state.filters.team);
      if (state.filters.project)
        params.append("project", state.filters.project);
      if (state.filters.labels)
        params.append("labels", state.filters.labels.join(","));
      if (state.filters.tags)
        params.append("tags", state.filters.tags.join(","));
      if (state.filters.dueDateFrom)
        params.append("dueDateFrom", state.filters.dueDateFrom.toISOString());
      if (state.filters.dueDateTo)
        params.append("dueDateTo", state.filters.dueDateTo.toISOString());
      if (state.filters.createdFrom)
        params.append("createdFrom", state.filters.createdFrom.toISOString());
      if (state.filters.createdTo)
        params.append("createdTo", state.filters.createdTo.toISOString());
      if (state.filters.completed !== undefined)
        params.append("completed", String(state.filters.completed));
      if (state.filters.overdue !== undefined)
        params.append("overdue", String(state.filters.overdue));
      if (state.filters.parentTask)
        params.append("parentTask", state.filters.parentTask);
      if (state.filters.isRecurring !== undefined)
        params.append("isRecurring", String(state.filters.isRecurring));
      if (state.filters.hasSubtasks !== undefined)
        params.append("hasSubtasks", String(state.filters.hasSubtasks));
      if (state.filters.hasAttachments !== undefined)
        params.append("hasAttachments", String(state.filters.hasAttachments));
      if (state.filters.hasComments !== undefined)
        params.append("hasComments", String(state.filters.hasComments));
      if (state.searchQuery) params.append("search", state.searchQuery);

      params.append("page", String(state.pagination.page));
      params.append("limit", String(state.pagination.limit));
      params.append("sortBy", state.sort.field);
      params.append("sortOrder", state.sort.direction);

      const response = await api.get<{
        tasks: Task[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/tasks?${params.toString()}`);

      return response.data;
    },
    staleTime: 30 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["task-stats", user?.id],
    queryFn: async () => {
      const response = await api.get<TaskStats>("/tasks/stats");
      return response.data;
    },
    staleTime: 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const response = await api.post<Task>("/tasks", task);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      toast.success("Task created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create task");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Task>;
    }) => {
      const response = await api.put<Task>(`/tasks/${id}`, updates);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      toast.success("Task updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update task");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async ({
      id,
      permanent,
    }: {
      id: string;
      permanent?: boolean;
    }) => {
      await api.delete(`/tasks/${id}${permanent ? "?permanent=true" : ""}`);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      toast.success("Task deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete task");
    },
  });

  const restoreTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.put<Task>(`/tasks/${id}/restore`, {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
      toast.success("Task restored successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to restore task");
    },
  });

  const archiveTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.put<Task>(`/tasks/${id}/archive`, {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      toast.success("Task archived successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to archive task");
    },
  });

  const assignTaskMutation = useMutation({
    mutationFn: async ({
      id,
      assigneeId,
    }: {
      id: string;
      assigneeId: string;
    }) => {
      const response = await api.put<Task>(`/tasks/${id}/assign`, {
        assigneeId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
      toast.success("Task assigned successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign task");
    },
  });

  const addSubtaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      subtaskId,
    }: {
      taskId: string;
      subtaskId: string;
    }) => {
      const response = await api.post<Task>(`/tasks/${taskId}/subtasks`, {
        subtaskId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
      toast.success("Subtask added successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add subtask");
    },
  });

  const removeSubtaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      subtaskId,
    }: {
      taskId: string;
      subtaskId: string;
    }) => {
      const response = await api.delete<Task>(`/tasks/${taskId}/subtasks`, {
        data: { subtaskId },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
      toast.success("Subtask removed successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove subtask");
    },
  });

  const toggleChecklistItemMutation = useMutation({
    mutationFn: async ({
      taskId,
      index,
    }: {
      taskId: string;
      index: number;
    }) => {
      const response = await api.put<Task>(`/tasks/${taskId}/checklist`, {
        index,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to toggle checklist item");
    },
  });

  const startTimeTrackingMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.post<Task>(`/tasks/${taskId}/time/start`, {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
      toast.success("Time tracking started");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start time tracking");
    },
  });

  const pauseTimeTrackingMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.post<Task>(`/tasks/${taskId}/time/pause`, {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
      toast.success("Time tracking paused");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to pause time tracking");
    },
  });

  const stopTimeTrackingMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.post<Task>(`/tasks/${taskId}/time/stop`, {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
      toast.success("Time tracking stopped");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to stop time tracking");
    },
  });

  const addWatcherMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.post<Task>(`/tasks/${taskId}/watchers`, {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
      toast.success("Added as watcher");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add watcher");
    },
  });

  const removeWatcherMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.delete<Task>(`/tasks/${taskId}/watchers`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
      toast.success("Removed from watchers");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove watcher");
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({
      taskIds,
      updates,
    }: {
      taskIds: string[];
      updates: Partial<Task>;
    }) => {
      await api.put("/tasks/bulk", { taskIds, updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      toast.success("Bulk update completed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to perform bulk update");
    },
  });

  useEffect(() => {
    if (tasksData) {
      setState((prev) => ({
        ...prev,
        tasks: tasksData.tasks || [],
        pagination: {
          ...prev.pagination,
          total: tasksData.total || 0,
          totalPages: tasksData.totalPages || 1,
        },
      }));
    }
  }, [tasksData]);

  useEffect(() => {
    if (statsData) {
      setState((prev) => ({
        ...prev,
        stats: statsData,
      }));
    }
  }, [statsData]);

  const createTask = useCallback(
    async (task: Partial<Task>) => {
      return await createTaskMutation.mutateAsync(task);
    },
    [createTaskMutation],
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      return await updateTaskMutation.mutateAsync({ id, updates });
    },
    [updateTaskMutation],
  );

  const deleteTask = useCallback(
    async (id: string, permanent?: boolean) => {
      await deleteTaskMutation.mutateAsync({ id, permanent });
    },
    [deleteTaskMutation],
  );

  const restoreTask = useCallback(
    async (id: string) => {
      return await restoreTaskMutation.mutateAsync(id);
    },
    [restoreTaskMutation],
  );

  const archiveTask = useCallback(
    async (id: string) => {
      return await archiveTaskMutation.mutateAsync(id);
    },
    [archiveTaskMutation],
  );

  const assignTask = useCallback(
    async (id: string, assigneeId: string) => {
      return await assignTaskMutation.mutateAsync({ id, assigneeId });
    },
    [assignTaskMutation],
  );

  const addSubtask = useCallback(
    async (taskId: string, subtaskId: string) => {
      return await addSubtaskMutation.mutateAsync({ taskId, subtaskId });
    },
    [addSubtaskMutation],
  );

  const removeSubtask = useCallback(
    async (taskId: string, subtaskId: string) => {
      return await removeSubtaskMutation.mutateAsync({ taskId, subtaskId });
    },
    [removeSubtaskMutation],
  );

  const toggleChecklistItem = useCallback(
    async (taskId: string, index: number) => {
      return await toggleChecklistItemMutation.mutateAsync({ taskId, index });
    },
    [toggleChecklistItemMutation],
  );

  const startTimeTracking = useCallback(
    async (taskId: string) => {
      return await startTimeTrackingMutation.mutateAsync(taskId);
    },
    [startTimeTrackingMutation],
  );

  const pauseTimeTracking = useCallback(
    async (taskId: string) => {
      return await pauseTimeTrackingMutation.mutateAsync(taskId);
    },
    [pauseTimeTrackingMutation],
  );

  const stopTimeTracking = useCallback(
    async (taskId: string) => {
      return await stopTimeTrackingMutation.mutateAsync(taskId);
    },
    [stopTimeTrackingMutation],
  );

  const addWatcher = useCallback(
    async (taskId: string) => {
      return await addWatcherMutation.mutateAsync(taskId);
    },
    [addWatcherMutation],
  );

  const removeWatcher = useCallback(
    async (taskId: string) => {
      return await removeWatcherMutation.mutateAsync(taskId);
    },
    [removeWatcherMutation],
  );

  const bulkUpdate = useCallback(
    async (taskIds: string[], updates: Partial<Task>) => {
      await bulkUpdateMutation.mutateAsync({ taskIds, updates });
    },
    [bulkUpdateMutation],
  );

  const setFilters = useCallback((filters: TaskFilters) => {
    setState((prev) => ({
      ...prev,
      filters,
      pagination: { ...prev.pagination, page: 1 },
    }));
  }, []);

  const setSort = useCallback((sort: TaskSortOptions) => {
    setState((prev) => ({ ...prev, sort }));
  }, []);

  const setPagination = useCallback((pagination: PaginationOptions) => {
    setState((prev) => ({ ...prev, pagination }));
  }, []);

  const setSearch = useCallback((searchQuery: string) => {
    setState((prev) => ({
      ...prev,
      searchQuery,
      pagination: { ...prev.pagination, page: 1 },
    }));
  }, []);

  const setView = useCallback(
    (view: "list" | "board" | "calendar" | "timeline") => {
      setState((prev) => ({ ...prev, view }));
    },
    [],
  );

  const selectTask = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      selectedTasks: [...prev.selectedTasks, id],
    }));
  }, []);

  const deselectTask = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      selectedTasks: prev.selectedTasks.filter((taskId) => taskId !== id),
    }));
  }, []);

  const selectAllTasks = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedTasks: prev.tasks.map((task) => task.id),
    }));
  }, []);

  const deselectAllTasks = useCallback(() => {
    setState((prev) => ({ ...prev, selectedTasks: [] }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((prev) => ({ ...prev, selectedTasks: [] }));
  }, []);

  const refetch = useCallback(() => {
    refetchTasks();
    queryClient.invalidateQueries({ queryKey: ["task-stats"] });
  }, [refetchTasks, queryClient]);

  const value = useMemo(
    () => ({
      tasks: state.tasks,
      stats: state.stats,
      filters: state.filters,
      sort: state.sort,
      pagination: state.pagination,
      isLoading: tasksLoading || statsLoading || state.isLoading,
      error: tasksError?.message || state.error,
      selectedTasks: state.selectedTasks,
      view: state.view,
      searchQuery: state.searchQuery,
      createTask,
      updateTask,
      deleteTask,
      restoreTask,
      archiveTask,
      assignTask,
      addSubtask,
      removeSubtask,
      toggleChecklistItem,
      startTimeTracking,
      pauseTimeTracking,
      stopTimeTracking,
      addWatcher,
      removeWatcher,
      bulkUpdate,
      setFilters,
      setSort,
      setPagination,
      setSearch,
      setView,
      selectTask,
      deselectTask,
      selectAllTasks,
      deselectAllTasks,
      clearSelection,
      refetch,
      addComment: () => Promise.resolve({} as Task),
      removeComment: () => Promise.resolve({} as Task),
      addAttachment: () => Promise.resolve({} as Task),
      removeAttachment: () => Promise.resolve({} as Task),
      addReminder: () => Promise.resolve({} as Task),
      removeReminder: () => Promise.resolve({} as Task),
    }),
    [
      state,
      tasksLoading,
      statsLoading,
      tasksError,
      createTask,
      updateTask,
      deleteTask,
      restoreTask,
      archiveTask,
      assignTask,
      addSubtask,
      removeSubtask,
      toggleChecklistItem,
      startTimeTracking,
      pauseTimeTracking,
      stopTimeTracking,
      addWatcher,
      removeWatcher,
      bulkUpdate,
      setFilters,
      setSort,
      setPagination,
      setSearch,
      setView,
      selectTask,
      deselectTask,
      selectAllTasks,
      deselectAllTasks,
      clearSelection,
      refetch,
    ],
  );

  return value;
}

export default useTasks;
