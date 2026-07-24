import type { AnalysisJob, AnalysisQuery, AuthSession, EventUpdatePayload, Project, ProjectInput, ProjectPage, Task, User, VideoEvent } from '../types/domain';

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
    bucket_name: 'video-bucket',
    bucket_prefix: 'vla/',
    file_filter_regex: '.*\\.mp4$',
    endpoint: 'http://127.0.0.1:9000',
    access_key_id: 'minio',
    secret_access_key_set: true,
    recursive_scan: true,
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
  title: index === 0 ? '关键接近' : index === 1 ? '动作完成' : '动作调整',
  description:
    index === 0
      ? `目标开始接近，进入关键动作前段。`
      : index === 1
        ? `目标完成主要动作，可继续核对时间区间。`
        : `动作包含短暂停顿和位置调整。`,
  reasoning_description:
    index === 0
      ? `推理依据：与“${prompt}”的初始阶段一致，画面中目标开始接近目标区域。`
      : index === 1
        ? `推理依据：与“${prompt}”的完成阶段一致，主要动作已经结束。`
        : `推理依据：与“${prompt}”的过渡阶段一致，存在短暂停顿和位置变化。`,
  confidence: [0.91, 0.84, 0.79][index] ?? 0.8,
  source: 'model',
  status: 'active',
  review_status: 'pending',
  raw_payload: { demo: true, rank: index + 1, prompt },
  created_at: '2026-06-25T12:00:00+08:00',
  updated_at: '2026-06-25T12:00:00+08:00',
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

const analysisQueriesByTaskId = tasks.reduce<Record<number, AnalysisQuery[]>>((acc, task, index) => {
  acc[task.id] = index < 2
    ? [
        {
          id: task.id * 100 + 1,
          task_id: task.id,
          query: '寻找将物品放入书架的关键动作片段',
          query_hash: `mock-hash-${task.id}-1`,
          prompt_version: 'video-event-query-v2:segments',
          event_count: eventsByTaskId[task.id]?.length ?? 0,
          created_by: defaultUser.id,
          created_at: '2026-06-25T12:00:00+08:00',
          updated_at: '2026-06-25T12:01:00+08:00',
        },
        {
          id: task.id * 100 + 2,
          task_id: task.id,
          query: '寻找车辆超过行人的时刻',
          query_hash: `mock-hash-${task.id}-2`,
          prompt_version: 'video-event-query-v2:segments',
          event_count: 3,
          created_by: defaultUser.id,
          created_at: '2026-06-25T12:03:00+08:00',
          updated_at: '2026-06-25T12:04:00+08:00',
        },
      ]
    : [];
  return acc;
}, {});

const mockJobTaskIds: Record<number, number> = {};
const mockSyncJobs: Record<number, AnalysisJob> = {};

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

  async getProjects(): Promise<ProjectPage> {
    await delay();
    return {
      items: [...projects],
      pagination: { page: 1, page_size: 20, total: projects.length, total_pages: projects.length ? 1 : 0 },
    };
  },

  async createProject(input: ProjectInput): Promise<Project> {
    await delay();
    const now = new Date().toISOString();
    const project: Project = {
      id: Math.max(0, ...projects.map((item) => item.id)) + 1,
      company_id: defaultUser.company_id,
      company_name: defaultUser.company_name,
      name: input.name,
      description: input.description ?? '',
      bucket_name: input.bucket_name,
      bucket_prefix: input.bucket_prefix,
      file_filter_regex: input.file_filter_regex,
      endpoint: input.endpoint,
      access_key_id: input.access_key_id,
      secret_access_key_set: Boolean(input.secret_access_key),
      recursive_scan: input.recursive_scan,
      assignment_mode: input.assignment_mode ?? 'preemptive',
      task_count: 0,
      created_at: now,
      updated_at: now,
    };
    projects.unshift(project);
    return project;
  },

  async updateProject(projectId: number, input: Partial<ProjectInput>): Promise<Project> {
    await delay();
    const project = projects.find((item) => item.id === projectId);
    if (!project) throw new Error('项目不存在');
    const { secret_access_key, ...changes } = input;
    Object.assign(project, changes, {
      secret_access_key_set: project.secret_access_key_set || Boolean(secret_access_key),
      updated_at: new Date().toISOString(),
    });
    return { ...project };
  },

  async deleteProject(projectId: number): Promise<{ deleted: boolean; deleted_count: number }> {
    await delay();
    const index = projects.findIndex((item) => item.id === projectId);
    if (index < 0) throw new Error('项目不存在');
    const [project] = projects.splice(index, 1);
    return { deleted: true, deleted_count: project.task_count + 1 };
  },

  async testProjectStorage(): Promise<{ ok: boolean; message: string }> {
    await delay(420);
    return { ok: true, message: 'MinIO 连接测试通过。' };
  },

  async syncProject(projectId: number): Promise<AnalysisJob> {
    await delay();
    const project = projects.find((item) => item.id === projectId);
    if (!project) throw new Error('项目不存在');
    const jobId = Date.now();
    const job: AnalysisJob = {
      id: jobId,
      job_type: 'sync_oss',
      status: 'pending',
      payload: { project_id: projectId },
      attempts: 0,
      max_attempts: 3,
      last_error: '',
      created_at: new Date().toISOString(),
    };
    mockSyncJobs[jobId] = job;
    return job;
  },

  async getProjectJob(jobId: number): Promise<AnalysisJob> {
    await delay(650);
    const job = mockSyncJobs[jobId];
    if (!job) throw new Error('同步任务不存在');
    const projectId = Number(job.payload.project_id);
    const project = projects.find((item) => item.id === projectId);
    if (project) project.updated_at = new Date().toISOString();
    const finished = {
      ...job,
      status: 'succeeded' as const,
      attempts: 1,
      updated_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      payload: { ...job.payload, result: { created_tasks: 0, updated_tasks: 0, total_tasks: project?.task_count ?? 0 } },
    };
    mockSyncJobs[jobId] = finished;
    return finished;
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

  async getAnalysisQueries(taskId: number): Promise<AnalysisQuery[]> {
    await delay(180);
    return analysisQueriesByTaskId[taskId] ?? [];
  },

  async applyAnalysisQuery(taskId: number, queryId: number): Promise<Task> {
    await delay(260);
    const task = tasks.find((item) => item.id === taskId);
    if (!task) throw new Error('任务不存在');
    const query = analysisQueriesByTaskId[taskId]?.find((item) => item.id === queryId);
    if (!query) throw new Error('分析查询不存在或无权访问。');
    const events = [makeEvent(taskId, 0, query.query), makeEvent(taskId, 1, query.query), makeEvent(taskId, 2, query.query)];
    eventsByTaskId[taskId] = events;
    const nextTask = { ...task, status: 'labeling' as const, assigned_to: defaultUser.id, assigned_username: defaultUser.username, analysis_prompt: query.query, presigned_url: '/camera.mp4', events };
    Object.assign(task, nextTask);
    return nextTask;
  },

  async queryTask(taskId: number, prompt: string): Promise<{ task: Task; events: VideoEvent[] }> {
    await delay(520);
    const task = tasks.find((item) => item.id === taskId);
    if (!task) throw new Error('任务不存在');
    const events = [makeEvent(taskId, 0, prompt), makeEvent(taskId, 1, prompt), makeEvent(taskId, 2, prompt)];
    eventsByTaskId[taskId] = events;
    const now = new Date().toISOString();
    const existingQuery = analysisQueriesByTaskId[taskId]?.find((item) => item.query === prompt);
    if (existingQuery) {
      existingQuery.event_count = events.length;
      existingQuery.updated_at = now;
    } else {
      analysisQueriesByTaskId[taskId] = [
        {
          id: Date.now(),
          task_id: taskId,
          query: prompt,
          query_hash: `mock-hash-${taskId}-${Date.now()}`,
          prompt_version: 'video-event-query-v2:segments',
          event_count: events.length,
          created_by: defaultUser.id,
          created_at: now,
          updated_at: now,
        },
        ...(analysisQueriesByTaskId[taskId] ?? []),
      ];
    }
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

  async updateEvent(taskId: number, eventId: number, payload: EventUpdatePayload): Promise<VideoEvent> {
    await delay(180);
    const event = eventsByTaskId[taskId]?.find((item) => item.id === eventId && item.status === 'active');
    if (!event) throw new Error('事件不存在。');

    const startTime = payload.start_time_ms ?? event.start_time_ms;
    const endTime = payload.end_time_ms ?? event.end_time_ms;
    if (endTime < startTime) throw new Error('事件结束时间不能早于开始时间。');

    const contentFields: Array<keyof EventUpdatePayload> = [
      'start_time_ms',
      'end_time_ms',
      'title',
      'description',
      'reasoning_description',
      'confidence',
      'raw_payload',
    ];
    Object.assign(event, payload, {
      source: contentFields.some((field) => field in payload) ? 'human' : event.source,
      updated_at: new Date().toISOString(),
    });
    return { ...event };
  },

  async deleteEvent(taskId: number, eventId: number): Promise<VideoEvent> {
    await delay(180);
    const event = eventsByTaskId[taskId]?.find((item) => item.id === eventId && item.status === 'active');
    if (!event) throw new Error('事件不存在。');
    Object.assign(event, { status: 'deleted', updated_at: new Date().toISOString() });
    return { ...event };
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

  async getProjects(page = 1, pageSize = 20): Promise<ProjectPage> {
    if (USE_MOCK) return mockBackend.getProjects();
    const response = await request<ProjectPage | Project[]>(`/api/vla/projects/?page=${page}&page_size=${pageSize}`);
    if (Array.isArray(response)) {
      return {
        items: response,
        pagination: { page, page_size: pageSize, total: response.length, total_pages: response.length ? 1 : 0 },
      };
    }
    return response;
  },

  async createProject(input: ProjectInput): Promise<Project> {
    if (USE_MOCK) return mockBackend.createProject(input);
    return request<Project>('/api/vla/projects/', { method: 'POST', body: JSON.stringify(input) });
  },

  async updateProject(projectId: number, input: Partial<ProjectInput>): Promise<Project> {
    if (USE_MOCK) return mockBackend.updateProject(projectId, input);
    return request<Project>(`/api/vla/projects/${projectId}/`, { method: 'PATCH', body: JSON.stringify(input) });
  },

  async deleteProject(projectId: number): Promise<{ deleted: boolean; deleted_count: number }> {
    if (USE_MOCK) return mockBackend.deleteProject(projectId);
    return request<{ deleted: boolean; deleted_count: number }>(`/api/vla/projects/${projectId}/`, { method: 'DELETE' });
  },

  async testProjectStorage(input: Partial<ProjectInput>, projectId?: number): Promise<{ ok: boolean; message: string }> {
    if (USE_MOCK) return mockBackend.testProjectStorage();
    const path = projectId ? `/api/vla/projects/${projectId}/storage/test/` : '/api/vla/projects/storage/test/';
    return request<{ ok: boolean; message: string }>(path, { method: 'POST', body: JSON.stringify(input) });
  },

  async syncProject(projectId: number): Promise<AnalysisJob> {
    if (USE_MOCK) return mockBackend.syncProject(projectId);
    return request<AnalysisJob>(`/api/vla/projects/${projectId}/sync/`, { method: 'POST', body: JSON.stringify({}) });
  },

  async getProjectJob(jobId: number): Promise<AnalysisJob> {
    if (USE_MOCK) return mockBackend.getProjectJob(jobId);
    const response = await request<AnalysisJob | { job: AnalysisJob }>(`/api/vla/jobs/${jobId}/`);
    return 'job' in response ? response.job : response;
  },

  async getTasks(projectId: number): Promise<Task[]> {
    if (USE_MOCK) return mockBackend.getTasks(projectId);
    return request<Task[]>(`/api/vla/tasks/?project_id=${projectId}`);
  },

  async getTask(taskId: number): Promise<Task> {
    if (USE_MOCK) return mockBackend.getTask(taskId);
    return request<Task>(`/api/vla/tasks/${taskId}/`);
  },

  async getAnalysisQueries(taskId: number): Promise<AnalysisQuery[]> {
    if (USE_MOCK) return mockBackend.getAnalysisQueries(taskId);
    return request<AnalysisQuery[]>(`/api/vla/tasks/${taskId}/analysis-queries/`);
  },

  async applyAnalysisQuery(taskId: number, queryId: number): Promise<Task> {
    if (USE_MOCK) return mockBackend.applyAnalysisQuery(taskId, queryId);
    return request<Task>(`/api/vla/tasks/${taskId}/analysis-queries/${queryId}/apply/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
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

  async updateEvent(taskId: number, eventId: number, payload: EventUpdatePayload): Promise<VideoEvent> {
    if (USE_MOCK) return mockBackend.updateEvent(taskId, eventId, payload);
    return request<VideoEvent>(`/api/vla/tasks/${taskId}/events/${eventId}/`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteEvent(taskId: number, eventId: number): Promise<VideoEvent> {
    if (USE_MOCK) return mockBackend.deleteEvent(taskId, eventId);
    return request<VideoEvent>(`/api/vla/tasks/${taskId}/events/${eventId}/`, { method: 'DELETE' });
  },
};

export const mockApi = api;






