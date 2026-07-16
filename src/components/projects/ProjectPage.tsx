import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ApiOutlined,
  CloudSyncOutlined,
  DeleteOutlined,
  EditOutlined,
  LoginOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { api } from '../../api/mockApi';
import { useReviewStore } from '../../store/useReviewStore';
import type { Project, ProjectInput } from '../../types/domain';
import { navigateTo } from '../../utils/router';

const defaultValues: ProjectInput = {
  name: '',
  description: '',
  bucket_name: '',
  bucket_prefix: '',
  file_filter_regex: '.*\\.mp4$',
  endpoint: 'http://127.0.0.1:9000',
  access_key_id: '',
  secret_access_key: '',
  recursive_scan: true,
  assignment_mode: 'preemptive',
};

const projectToForm = (project: Project): ProjectInput => ({
  name: project.name,
  description: project.description,
  bucket_name: project.bucket_name,
  bucket_prefix: project.bucket_prefix,
  file_filter_regex: project.file_filter_regex,
  endpoint: project.endpoint,
  access_key_id: project.access_key_id,
  secret_access_key: '',
  recursive_scan: project.recursive_scan,
  assignment_mode: project.assignment_mode,
});

const compactPayload = (values: ProjectInput) => {
  const payload = { ...values };
  if (!payload.secret_access_key) delete payload.secret_access_key;
  return payload;
};

export function ProjectPage() {
  const [form] = Form.useForm<ProjectInput>();
  const [messageApi, messageContext] = message.useMessage();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project>();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string }>();
  const [syncingIds, setSyncingIds] = useState<number[]>([]);
  const user = useReviewStore((state) => state.user);
  const projects = useReviewStore((state) => state.projects);
  const pagination = useReviewStore((state) => state.projectPagination);
  const projectLoading = useReviewStore((state) => state.projectLoading);
  const loadProjects = useReviewStore((state) => state.loadProjects);
  const selectProject = useReviewStore((state) => state.selectProject);
  const isAdmin = user?.role === 'admin';

  const refresh = async (page = pagination.page) => {
    try {
      await loadProjects(page);
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '项目列表加载失败');
    }
  };

  const handleSelectProject = async (projectId: number) => {
    try {
      await selectProject(projectId);
      navigateTo(`/projects?project_id=${projectId}`);
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '项目打开失败');
    }
  };

  const openCreate = () => {
    setEditingProject(undefined);
    setTestResult(undefined);
    form.setFieldsValue(defaultValues);
    setFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setTestResult(undefined);
    form.setFieldsValue(projectToForm(project));
    setFormOpen(true);
  };

  const testConnection = async () => {
    try {
      const values = await form.validateFields();
      setTesting(true);
      setTestResult(undefined);
      const result = await api.testProjectStorage(compactPayload(values), editingProject?.id);
      setTestResult(result);
      void messageApi.success(result.message);
    } catch (error) {
      if (error instanceof Error) {
        setTestResult({ ok: false, message: error.message });
        void messageApi.error(error.message);
      }
    } finally {
      setTesting(false);
    }
  };

  const saveProject = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editingProject) {
        await api.updateProject(editingProject.id, compactPayload(values));
        void messageApi.success('项目配置已更新');
      } else {
        await api.createProject(values);
        void messageApi.success('项目已创建，可继续同步任务');
      }
      setFormOpen(false);
      await refresh(editingProject ? pagination.page : 1);
    } catch (error) {
      if (error instanceof Error) void messageApi.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const testSavedProject = async (project: Project) => {
    try {
      setTesting(true);
      const result = await api.testProjectStorage({}, project.id);
      void messageApi.success(`${project.name}：${result.message}`);
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  const syncProject = async (project: Project) => {
    setSyncingIds((ids) => [...ids, project.id]);
    try {
      let job = await api.syncProject(project.id);
      void messageApi.info(`同步任务 #${job.id} 已提交`);
      for (let attempt = 0; attempt < 20 && ['pending', 'running'].includes(job.status); attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, attempt === 0 ? 700 : 1500));
        job = await api.getProjectJob(job.id);
      }
      if (job.status === 'failed') throw new Error(job.last_error || '任务同步失败');
      if (job.status !== 'succeeded') throw new Error('同步仍在后台执行，请稍后刷新项目');
      const result = job.payload.result as { created_tasks?: number; updated_tasks?: number; total_tasks?: number } | undefined;
      void messageApi.success(
        result
          ? `同步完成：新增 ${result.created_tasks ?? 0}，更新 ${result.updated_tasks ?? 0}，共 ${result.total_tasks ?? 0} 个任务`
          : '同步完成',
      );
      await refresh();
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '任务同步失败');
    } finally {
      setSyncingIds((ids) => ids.filter((id) => id !== project.id));
    }
  };

  const deleteProject = (project: Project) => {
    Modal.confirm({
      title: `删除项目“${project.name}”？`,
      content: '项目及其任务、事件、标注与审核结果会被永久删除，无法恢复。',
      okText: '删除项目及全部数据',
      okButtonProps: { danger: true },
      cancelText: '取消',
      async onOk() {
        const result = await api.deleteProject(project.id);
        void messageApi.success(`项目已删除，共清理 ${result.deleted_count} 条数据`);
        await refresh(projects.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page);
      },
    });
  };

  const columns: ColumnsType<Project> = [
    {
      title: '项目',
      dataIndex: 'name',
      width: 220,
      render: (name: string, project) => (
        <div className="min-w-0">
          <button className="max-w-full truncate border-0 bg-transparent p-0 text-left font-semibold text-blue-600 hover:text-blue-700" onClick={() => void handleSelectProject(project.id)}>
            {name}
          </button>
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{project.description || '暂无说明'}</div>
        </div>
      ),
    },
    {
      title: '存储位置',
      width: 245,
      render: (_, project) => (
        <div className="text-xs leading-5">
          <div className="truncate font-medium text-slate-700">{project.bucket_name}</div>
          <Tooltip title={project.bucket_prefix}><div className="truncate font-mono text-slate-500">{project.bucket_prefix || '/'}</div></Tooltip>
        </div>
      ),
    },
    {
      title: '扫描规则',
      width: 210,
      render: (_, project) => (
        <div className="text-xs leading-5">
          <Tooltip title={project.file_filter_regex}><div className="truncate font-mono text-slate-600">{project.file_filter_regex}</div></Tooltip>
          <span className="text-slate-400">{project.recursive_scan ? '递归扫描子目录' : '仅扫描当前目录'}</span>
        </div>
      ),
    },
    {
      title: '任务',
      dataIndex: 'task_count',
      width: 80,
      align: 'right',
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 150,
      render: (value: string) => <span className="text-xs text-slate-500">{new Date(value).toLocaleString('zh-CN', { hour12: false })}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: isAdmin ? 330 : 100,
      fixed: 'right',
      render: (_, project) => (
        <Space size={4}>
          <Button type="primary" size="small" icon={<LoginOutlined />} onClick={() => void handleSelectProject(project.id)}>进入</Button>
          {isAdmin ? (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(project)}>编辑</Button>
              <Tooltip title="测试已保存的 MinIO 配置"><Button size="small" icon={<ApiOutlined />} loading={testing} onClick={() => void testSavedProject(project)}>测试</Button></Tooltip>
              <Button size="small" icon={<CloudSyncOutlined />} loading={syncingIds.includes(project.id)} onClick={() => void syncProject(project)}>同步</Button>
              <Tooltip title="删除项目"><Button danger size="small" aria-label={`删除 ${project.name}`} icon={<DeleteOutlined />} onClick={() => deleteProject(project)} /></Tooltip>
            </>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-slate-100">
      {messageContext}
      <div className="mx-auto max-w-[1440px] px-8 py-7">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-500">{user?.company_name}</div>
            <Typography.Title level={2} className="!mb-0 !mt-1 !text-2xl">项目管理</Typography.Title>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} loading={projectLoading} onClick={() => void refresh()}>刷新</Button>
            {isAdmin ? <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建项目</Button> : null}
          </Space>
        </div>

        {!isAdmin ? <Alert className="mb-4" type="info" showIcon message="当前账号可查看并进入项目，项目配置由公司管理员维护。" /> : null}

        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <Table<Project>
            rowKey="id"
            columns={columns}
            dataSource={projects}
            loading={projectLoading}
            scroll={{ x: 1130 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可见项目" /> }}
            pagination={{
              current: pagination.page,
              pageSize: pagination.page_size,
              total: pagination.total,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 个项目`,
              onChange: (page) => void refresh(page),
            }}
          />
        </div>
      </div>

      <Modal
        width={760}
        title={editingProject ? '编辑项目' : '新建项目'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        destroyOnHidden
        footer={[
          <Button key="test" icon={<ApiOutlined />} loading={testing} onClick={() => void testConnection()}>测试连接</Button>,
          <Button key="cancel" onClick={() => setFormOpen(false)}>取消</Button>,
          <Button key="save" type="primary" loading={saving} onClick={() => void saveProject()}>保存</Button>,
        ]}
      >
        {testResult ? <Alert className="mb-4" showIcon type={testResult.ok ? 'success' : 'error'} message={testResult.message} /> : null}
        <Form form={form} layout="vertical" initialValues={defaultValues} requiredMark="optional">
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item className="col-span-2" name="name" label="项目名称" rules={[{ required: true, whitespace: true, message: '请输入项目名称' }]}>
              <Input placeholder="例如：厨房动作数据集" />
            </Form.Item>
            <Form.Item className="col-span-2" name="description" label="项目说明">
              <Input.TextArea rows={2} placeholder="简要说明数据来源和标注目标" />
            </Form.Item>
            <Form.Item name="endpoint" label="MinIO Endpoint" rules={[{ required: true, message: '请输入 MinIO Endpoint' }]}>
              <Input placeholder="http://127.0.0.1:9000" />
            </Form.Item>
            <Form.Item name="bucket_name" label="Bucket Name" rules={[{ required: true, whitespace: true, message: '请输入 Bucket Name' }]}>
              <Input placeholder="video-bucket" />
            </Form.Item>
            <Form.Item name="access_key_id" label="Access Key" rules={[{ required: true, whitespace: true, message: '请输入 Access Key' }]}>
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item
              name="secret_access_key"
              label="Secret Key"
              extra={editingProject?.secret_access_key_set ? '留空将保留当前密钥' : undefined}
              rules={[{ required: !editingProject, message: '请输入 Secret Key' }]}
            >
              <Input.Password autoComplete="new-password" placeholder={editingProject ? '留空不修改' : '请输入 Secret Key'} />
            </Form.Item>
            <Form.Item
              name="bucket_prefix"
              label="扫描 Prefix"
              rules={[
                { required: true, message: '请输入扫描 Prefix' },
                { validator: (_, value: string) => value?.startsWith('/') ? Promise.reject(new Error('Prefix 不能以 / 开头')) : Promise.resolve() },
              ]}
            >
              <Input placeholder="datasets/kitchen/" />
            </Form.Item>
            <Form.Item name="file_filter_regex" label="文件过滤正则" rules={[{ required: true, message: '请输入文件过滤正则' }]}>
              <Input className="font-mono" placeholder=".*\\.mp4$" />
            </Form.Item>
            <Form.Item name="assignment_mode" label="任务分配模式" rules={[{ required: true }]}>
              <Select options={[{ value: 'preemptive', label: '抢占式领取' }, { value: 'assigned', label: '指定分配' }]} />
            </Form.Item>
            <Form.Item className="flex items-end" name="recursive_scan" valuePropName="checked">
              <Checkbox>递归扫描 Prefix 下的子目录</Checkbox>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </main>
  );
}
