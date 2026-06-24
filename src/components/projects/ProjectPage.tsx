import { Button, Empty, Skeleton, Tag } from 'antd';
import { FolderOpenOutlined, SyncOutlined } from '@ant-design/icons';
import { useReviewStore } from '../../store/useReviewStore';
import { navigateTo } from '../../utils/router';

export function ProjectPage() {
  const user = useReviewStore((state) => state.user);
  const projects = useReviewStore((state) => state.projects);
  const projectLoading = useReviewStore((state) => state.projectLoading);
  const loadProjects = useReviewStore((state) => state.loadProjects);
  const selectProject = useReviewStore((state) => state.selectProject);

  const handleSelectProject = async (projectId: number) => {
    await selectProject(projectId);
    navigateTo('/annotation?project_id=' + projectId);
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-slate-100">
      <div className="mx-auto max-w-[1180px] px-8 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-500">{user?.company_name}</div>
            <h1 className="m-0 mt-2 text-2xl font-semibold text-slate-950">项目</h1>
          </div>
          <Button icon={<SyncOutlined />} onClick={() => void loadProjects()} loading={projectLoading}>
            刷新
          </Button>
        </div>

        {projectLoading && !projects.length ? <Skeleton active paragraph={{ rows: 6 }} /> : null}

        {!projectLoading && !projects.length ? (
          <div className="rounded-md border border-slate-200 bg-white py-20">
            <Empty description="暂无可见项目" />
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-4">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => void handleSelectProject(project.id)}
              className="rounded-md border border-slate-200 bg-white p-5 text-left transition hover:border-blue-400 hover:shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                  <FolderOpenOutlined />
                </div>
                <Tag color="blue" className="m-0">
                  {project.task_count} 个任务
                </Tag>
              </div>
              <div className="line-clamp-2 text-base font-semibold leading-6 text-slate-950">{project.name}</div>
              <p className="mt-3 line-clamp-2 min-h-[44px] text-sm leading-6 text-slate-500">{project.description || '暂无描述'}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <div>
                  <div className="mb-1 text-slate-400">OSS Prefix</div>
                  <div className="font-mono text-slate-700">{project.oss_prefix}</div>
                </div>
                <div>
                  <div className="mb-1 text-slate-400">分配模式</div>
                  <div className="text-slate-700">{project.assignment_mode}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}


