import type { AnalysisJob, AuthSession, Project, ReviewResult, Task, User, VideoEvent } from '../types/domain';

const API_BASE_URL = import.meta.env.VITE_VLA_API_BASE_URL ?? '';
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';
const TOKEN_KEY = 'vla_demo_token';

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

const delay = (ms = 220) => new Promise((resolve) => window.setTimeout(resolve, ms));

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

const getStoredToken = () => window.localStorage.getItem(TOKEN_KEY);
const setStoredToken = (token: string) => window.localStorage.setItem(TOKEN_KEY, token);
const clearStoredToken = () => window.localStorage.removeItem(TOKEN_KEY);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Token ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `请求失败：${response.status}`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      message = body.error?.message ?? message;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

const defaultUser: User = {
  id: 3,
  username: 'labeler',
  email: '',
  role: 'labeler',
  company_id: 1,
  company_name: '默认 VLA 标注公司',
  is_active: true,
};

const projects: Project[] = [
  {
    id: 1,
    company_id: 1,
    company_name: '默认 VLA 标注公司',
    name: '默认 VLA 视频标注项目',
    description: '默认初始化项目，对应 OSS vla/ 目录。',
    oss_prefix: 'vla/',
    assignment_mode: 'preemptive',
    task_count: 10,
    created_at: '2026-06-23T15:00:00+08:00',
    updated_at: '2026-06-23T15:00:00+08:00',
  },
];

const makeEvent = (taskId: number, index: number, prompt = '寻找将物品放入书架的关键动作片段'): VideoEvent => ({
  id: taskId * 10 + index + 1,
  task_id: taskId,
  start_time_ms: [0, 4200, 8600][index] ?? 0,
  end_time_ms: [3000, 7200, 14000][index] ?? 3000,
  description:
    index === 0
      ? `疑似匹配“${prompt}”：目标开始接近并出现关键动作。`
      : index === 1
        ? `疑似匹配“${prompt}”：目标完成动作，建议人工复核起止时间。`
        : `疑似匹配“${prompt}”：动作包含短暂停顿和位置调整。`,
  confidence: [0.91, 0.84, 0.79][index] ?? 0.8,
  source: 'model',
  status: 'active',
  raw_payload: { demo: true, rank: index + 1, prompt },
});

const tasks: Task[] = Array.from({ length: 10 }, (_, index) => {
  const id = 101 + index;
  return {
    id,
    project_id: 1,
    project_name: projects[0].name,
    oss_key: `vla/demo_${String(index + 1).padStart(3, '0')}.mp4`,
    oss_size: 10485760 + index * 1024,
    oss_etag: `etag-${id}`,
    oss_last_modified: '2026-06-23T15:01:00+08:00',
    status: index < 2 ? 'labeling' : index < 8 ? 'pending' : 'completed',
    assigned_to: index < 2 ? defaultUser.id : null,
    assigned_username: index < 2 ? defaultUser.username : null,
    analysis_prompt: index < 2 ? '寻找将物品放入书架的关键动作片段' : '',
    analysis_error: '',
    presigned_url: null,
    created_at: '2026-06-23T15:01:10+08:00',
    updated_at: '2026-06-23T15:01:10+08:00',
  };
});

const eventsByTaskId = tasks.reduce<Record<number, VideoEvent[]>>((acc, task, index) => {
  acc[task.id] = index < 2 ? [makeEvent(task.id, 0), makeEvent(task.id, 1), makeEvent(task.id, 2)] : [];
  return acc;
}, {});

const mockJobTaskIds: Record<number, number> = {};

const mockBackend = {
  async login(username: string, password: string): Promise<AuthSession> {
    await delay();
    const accounts: Record<string, { password: string; role: User['role']; id: number }> = {
      admin: { password: 'Admin123456!', role: 'admin', id: 1 },
      labeler: { password: 'Labeler123456!', role: 'labeler', id: 3 },
      reviewer: { password: 'Reviewer123456!', role: 'reviewer', id: 4 },
    };
    const account = accounts[username];
    if (!account || account.password !== password) {
      throw new Error('用户名或密码错误');
    }
    const session = {
      token: `mock-token-${username}`,
      user: { ...defaultUser, id: account.id, username, role: account.role },
    };
    setStoredToken(session.token);
    return session;
  },

  async me(): Promise<{ user: User }> {
    await delay(120);
    const token = getStoredToken();
    const username = token?.replace('mock-token-', '') || 'labeler';
    const role = username === 'admin' ? 'admin' : username === 'reviewer' ? 'reviewer' : 'labeler';
    return { user: { ...defaultUser, username, role } };
  },

  async getProjects(): Promise<Project[]> {
    await delay();
    return projects;
  },

  async getTasks(projectId: number): Promise<Task[]> {
    await delay();
    return tasks.filter((task) => task.project_id === projectId).map((task) => ({ ...task, presigned_url: null, events: undefined }));
  },

  async getTask(taskId: number): Promise<Task> {
    await delay(160);
    const task = tasks.find((item) => item.id === taskId);
    if (!task) throw new Error('任务不存在');
    return { ...task, presigned_url: '/camera.mp4', events: eventsByTaskId[taskId] ?? [] };
  },

  async queryTask(taskId: number, prompt: string): Promise<{ task: Task; events: VideoEvent[] }> {
    await delay(520);
    const task = tasks.find((item) => item.id === taskId);
    if (!task) throw new Error('任务不存在');
    const events = [makeEvent(taskId, 0, prompt), makeEvent(taskId, 1, prompt), makeEvent(taskId, 2, prompt)];
    eventsByTaskId[taskId] = events;
    const nextTask = { ...task, status: 'labeling' as const, assigned_to: defaultUser.id, assigned_username: defaultUser.username, analysis_prompt: prompt, presigned_url: '/camera.mp4', events };
    Object.assign(task, nextTask);
    return { task: nextTask, events };
  },

  async analyzeTask(taskId: number, prompt: string): Promise<{ job: AnalysisJob; task: Pick<Task, 'id' | 'status' | 'analysis_prompt'> }> {
    await delay(240);
    const jobId = Date.now();
    mockJobTaskIds[jobId] = taskId;
    return {
      job: {
        id: jobId,
        job_type: 'analyze_video',
        status: 'pending',
        payload: { task_id: taskId },
        attempts: 0,
        max_attempts: 3,
        last_error: '',
      },
      task: { id: taskId, status: 'analyzing', analysis_prompt: prompt },
    };
  },

  async getJob(jobId: number): Promise<{ job: AnalysisJob; task: Pick<Task, 'id' | 'status'> & { events: VideoEvent[] } }> {
    await delay(600);
    const taskId = mockJobTaskIds[jobId] ?? 101;
    if (!eventsByTaskId[taskId]?.length) {
      eventsByTaskId[taskId] = [makeEvent(taskId, 0), makeEvent(taskId, 1), makeEvent(taskId, 2)];
    }
    return {
      job: {
        id: jobId,
        job_type: 'analyze_video',
        status: 'succeeded',
        payload: { task_id: taskId, result: { event_count: 3 } },
        attempts: 1,
        max_attempts: 3,
        last_error: '',
        finished_at: new Date().toISOString(),
      },
      task: { id: taskId, status: 'labeling', events: eventsByTaskId[taskId] ?? [] },
    };
  },

  async submitReview(result: ReviewResult) {
    await delay(180);
    return result;
  },
};

export const api = {
  tokenKey: TOKEN_KEY,
  getStoredToken,
  setStoredToken,
  clearStoredToken,

  async login(username: string, password: string): Promise<AuthSession> {
    if (USE_MOCK) return mockBackend.login(username, password);
    const session = await request<AuthSession>('/api/vla/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setStoredToken(session.token);
    return session;
  },

  async me(): Promise<{ user: User }> {
    if (USE_MOCK) return mockBackend.me();
    return request<{ user: User }>('/api/vla/auth/me/');
  },

  async getProjects(): Promise<Project[]> {
    if (USE_MOCK) return mockBackend.getProjects();
    return request<Project[]>('/api/vla/projects/');
  },

  async getTasks(projectId: number): Promise<Task[]> {
    if (USE_MOCK) return mockBackend.getTasks(projectId);
    return request<Task[]>(`/api/vla/tasks/?project_id=${projectId}`);
  },

  async getTask(taskId: number): Promise<Task> {
    if (USE_MOCK) return mockBackend.getTask(taskId);
    return request<Task>(`/api/vla/tasks/${taskId}/`);
  },

  async queryTask(taskId: number, prompt: string): Promise<{ task: Task; events: VideoEvent[] }> {
    if (USE_MOCK) return mockBackend.queryTask(taskId, prompt);
    return request<{ task: Task; events: VideoEvent[] }>(`/api/vla/tasks/${taskId}/query/`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  async analyzeTask(taskId: number, prompt: string) {
    if (USE_MOCK) return mockBackend.analyzeTask(taskId, prompt);
    return request<{ job: AnalysisJob; task: Pick<Task, 'id' | 'status' | 'analysis_prompt'> }>(`/api/vla/tasks/${taskId}/analyze/`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  async getJob(jobId: number) {
    if (USE_MOCK) return mockBackend.getJob(jobId);
    return request<{ job: AnalysisJob; task: Pick<Task, 'id' | 'status'> & { events: VideoEvent[] } }>(`/api/vla/jobs/${jobId}/`);
  },

  async submitReview(result: ReviewResult) {
    return mockBackend.submitReview(result);
  },
};

export const mockApi = api;





