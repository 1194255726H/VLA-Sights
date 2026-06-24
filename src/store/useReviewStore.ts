import { create } from 'zustand';
import { api } from '../api/mockApi';
import type { AnalysisJob, EventEditPayload, Project, ReviewResult, Task, User, VideoEvent } from '../types/domain';

interface ReviewState {
  user?: User;
  token?: string;
  authChecked: boolean;
  authLoading: boolean;
  authError?: string;
  projects: Project[];
  currentProject?: Project;
  tasks: Task[];
  currentTask?: Task;
  events: VideoEvent[];
  selectedEvent?: VideoEvent;
  seekRequestId: number;
  reviewResults: ReviewResult[];
  isLoading: boolean;
  projectLoading: boolean;
  taskLoading: boolean;
  analysisLoading: boolean;
  analysisJob?: AnalysisJob;
  analysisError?: string;
  login: (username: string, password: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  logout: () => void;
  backToProjects: () => void;
  loadProjects: () => Promise<void>;
  selectProject: (projectId: number) => Promise<void>;
  openProject: (projectId: number) => Promise<void>;
  loadTasks: (projectId?: number) => Promise<void>;
  selectTask: (taskId: number) => Promise<void>;
  selectEvent: (eventId: number) => void;
  queryCurrentTask: (prompt: string) => Promise<void>;
  analyzeCurrentTask: (prompt: string) => Promise<void>;
  acceptEvent: (eventId: number) => Promise<void>;
  rejectEvent: (eventId: number, reason: string) => Promise<void>;
  editEvent: (eventId: number, payload: EventEditPayload) => Promise<void>;
}

const upsertReviewResult = (results: ReviewResult[], result: ReviewResult) => {
  const rest = results.filter((item) => item.eventId !== result.eventId);
  return [...rest, result];
};

const upsertTask = (tasks: Task[], task: Task | Partial<Task> & Pick<Task, 'id'>) => {
  return tasks.map((item) => (item.id === task.id ? { ...item, ...task } : item));
};

const normalizeActiveEvents = (events?: VideoEvent[]) => (events ?? []).filter((event) => event.status === 'active');

export const useReviewStore = create<ReviewState>((set, get) => ({
  authChecked: false,
  authLoading: false,
  projects: [],
  tasks: [],
  events: [],
  seekRequestId: 0,
  reviewResults: [],
  isLoading: false,
  projectLoading: false,
  taskLoading: false,
  analysisLoading: false,

  login: async (username: string, password: string) => {
    set({ authLoading: true, authError: undefined });
    try {
      const session = await api.login(username, password);
      set({ user: session.user, token: session.token, authLoading: false, authChecked: true });
      await get().loadProjects();
    } catch (error) {
      set({ authLoading: false, authError: error instanceof Error ? error.message : '登录失败' });
      throw error;
    }
  },

  restoreSession: async () => {
    const token = api.getStoredToken();
    if (!token) {
      set({ authChecked: true });
      return;
    }

    set({ authLoading: true, authError: undefined, token });
    try {
      const { user } = await api.me();
      set({ user, authLoading: false, authChecked: true });
      await get().loadProjects();
    } catch (error) {
      api.clearStoredToken();
      set({ user: undefined, token: undefined, authLoading: false, authChecked: true, authError: error instanceof Error ? error.message : '登录已失效' });
    }
  },

  logout: () => {
    api.clearStoredToken();
    set({
      user: undefined,
      token: undefined,
      projects: [],
      currentProject: undefined,
      tasks: [],
      currentTask: undefined,
      events: [],
      selectedEvent: undefined,
      reviewResults: [],
      analysisJob: undefined,
      analysisError: undefined,
    });
  },

  backToProjects: () => {
    set({
      currentProject: undefined,
      tasks: [],
      currentTask: undefined,
      events: [],
      selectedEvent: undefined,
      reviewResults: [],
      analysisJob: undefined,
      analysisError: undefined,
    });
  },

  loadProjects: async () => {
    set({ projectLoading: true, isLoading: true });
    const projects = await api.getProjects();
    set({ projects, projectLoading: false, isLoading: false });
  },

  selectProject: async (projectId: number) => {
    await get().openProject(projectId);
  },

  openProject: async (projectId: number) => {
    let project = get().projects.find((item) => item.id === projectId);
    if (!project) {
      await get().loadProjects();
      project = get().projects.find((item) => item.id === projectId);
    }
    if (!project) return;

    set({
      currentProject: project,
      currentTask: undefined,
      tasks: [],
      events: [],
      selectedEvent: undefined,
      reviewResults: [],
      analysisJob: undefined,
      analysisError: undefined,
    });
    await get().loadTasks(projectId);
  },

  loadTasks: async (projectId?: number) => {
    const selectedProjectId = projectId ?? get().currentProject?.id;
    if (!selectedProjectId) return;

    set({ taskLoading: true, isLoading: true });
    const tasks = await api.getTasks(selectedProjectId);
    set({ tasks, taskLoading: false, isLoading: false });
  },

  selectTask: async (taskId: number) => {
    const listTask = get().tasks.find((item) => item.id === taskId);
    if (listTask) {
      set({ currentTask: listTask, taskLoading: true, isLoading: true, events: [], selectedEvent: undefined, analysisError: undefined });
    }

    const task = await api.getTask(taskId);
    const events = normalizeActiveEvents(task.events);
    set({
      currentTask: task,
      events,
      selectedEvent: events[0],
      seekRequestId: events[0] ? get().seekRequestId + 1 : get().seekRequestId,
      taskLoading: false,
      isLoading: false,
      tasks: upsertTask(get().tasks, task),
    });
  },

  selectEvent: (eventId: number) => {
    const selectedEvent = get().events.find((event) => event.id === eventId);
    set({ selectedEvent, seekRequestId: get().seekRequestId + 1 });
  },

  queryCurrentTask: async (prompt: string) => {
    const currentTask = get().currentTask;
    if (!currentTask) return;

    set({ analysisLoading: true, analysisError: undefined });
    try {
      const { task, events } = await api.queryTask(currentTask.id, prompt);
      const activeEvents = normalizeActiveEvents(events);
      set({
        currentTask: task,
        tasks: upsertTask(get().tasks, task),
        events: activeEvents,
        selectedEvent: activeEvents[0],
        seekRequestId: activeEvents[0] ? get().seekRequestId + 1 : get().seekRequestId,
        analysisLoading: false,
      });
    } catch (error) {
      set({ analysisLoading: false, analysisError: error instanceof Error ? error.message : '查询失败' });
      throw error;
    }
  },

  analyzeCurrentTask: async (prompt: string) => {
    const currentTask = get().currentTask;
    if (!currentTask) return;

    set({ analysisLoading: true, analysisError: undefined, analysisJob: undefined });
    try {
      const { job, task } = await api.analyzeTask(currentTask.id, prompt);
      set({
        analysisJob: job,
        currentTask: { ...currentTask, ...task },
        tasks: upsertTask(get().tasks, task),
      });

      let latestJob = job;
      for (let index = 0; index < 12; index += 1) {
        if (latestJob.status !== 'pending' && latestJob.status !== 'running') break;
        await new Promise((resolve) => window.setTimeout(resolve, index === 0 ? 600 : 2500));
        const response = await api.getJob(job.id);
        latestJob = response.job;
        set({ analysisJob: latestJob });

        if (latestJob.status === 'succeeded') {
          const activeEvents = normalizeActiveEvents(response.task.events);
          const nextTask = { ...get().currentTask, ...response.task } as Task;
          set({
            currentTask: nextTask,
            tasks: upsertTask(get().tasks, nextTask),
            events: activeEvents,
            selectedEvent: activeEvents[0],
            seekRequestId: activeEvents[0] ? get().seekRequestId + 1 : get().seekRequestId,
            analysisLoading: false,
          });
          return;
        }

        if (latestJob.status === 'failed') {
          throw new Error(latestJob.last_error || '分析失败');
        }
      }

      set({ analysisLoading: false });
    } catch (error) {
      set({ analysisLoading: false, analysisError: error instanceof Error ? error.message : '分析失败' });
      throw error;
    }
  },

  acceptEvent: async (eventId: number) => {
    const result: ReviewResult = { eventId, status: 'accepted' };
    await api.submitReview(result);
    set({ reviewResults: upsertReviewResult(get().reviewResults, result) });
  },

  rejectEvent: async (eventId: number, reason: string) => {
    const result: ReviewResult = { eventId, status: 'rejected', comment: reason };
    await api.submitReview(result);
    set({ reviewResults: upsertReviewResult(get().reviewResults, result) });
  },

  editEvent: async (eventId: number, payload: EventEditPayload) => {
    const result: ReviewResult = { eventId, status: 'edited', comment: 'manual_edit' };
    await api.submitReview(result);
    const events = get().events.map((event) => (event.id === eventId ? { ...event, ...payload } : event));

    set({
      events,
      selectedEvent: events.find((event) => event.id === eventId),
      reviewResults: upsertReviewResult(get().reviewResults, result),
    });
  },
}));


