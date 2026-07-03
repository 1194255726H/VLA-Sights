import { Button, Layout, Tag } from 'antd';
import { ExperimentOutlined, LogoutOutlined, ProjectOutlined } from '@ant-design/icons';
import { TaskList } from '../tasks/TaskList';
import { Workspace } from '../workspace/Workspace';
import { ReviewPanel } from '../review/ReviewPanel';
import { ProjectPage } from '../projects/ProjectPage';
import { useReviewStore } from '../../store/useReviewStore';
import { roleLabel } from '../../utils/labels';
import { navigateTo } from '../../utils/router';

const { Header, Sider, Content } = Layout;

interface AppShellProps {
  route: 'projects' | 'annotation';
}

export function AppShell({ route }: AppShellProps) {
  const user = useReviewStore((state) => state.user);
  const currentProject = useReviewStore((state) => state.currentProject);
  const logout = useReviewStore((state) => state.logout);
  const backToProjects = useReviewStore((state) => state.backToProjects);

  const handleBackToProjects = () => {
    backToProjects();
    navigateTo('/projects');
  };

  const handleLogout = () => {
    logout();
    navigateTo('/login', true);
  };

  return (
    <Layout className="h-screen min-w-[1180px] bg-slate-100">
      <Header className="flex h-14 items-center justify-between bg-slate-950 px-5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-300">
            <ExperimentOutlined />
          </div>
          <div>
            {/* <div className="text-sm font-semibold tracking-wide">VLA 数据审核平台</div> */}
            <div className="text-[11px] text-slate-400">{route === 'annotation' && currentProject ? currentProject.name : '项目工作台'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-300">
          {route === 'annotation' ? (
            <Button size="small" icon={<ProjectOutlined />} onClick={handleBackToProjects}>
              项目
            </Button>
          ) : null}
          {user ? (
            <>
              <Tag color="blue" className="m-0 border-0 bg-blue-500/15 text-blue-100">
                {roleLabel[user.role]}
              </Tag>
              <span>{user.username}</span>
              <Button size="small" type="text" className="text-slate-200 hover:!bg-slate-800 hover:!text-white" icon={<LogoutOutlined />} onClick={handleLogout}>
                退出
              </Button>
            </>
          ) : null}
        </div>
      </Header>

      {route === 'annotation' ? (
        <Layout className="min-h-0 flex-1 overflow-hidden">
          <Sider width={300} theme="light" className="border-r border-slate-200 bg-white">
            <TaskList />
          </Sider>
          <Content className="min-w-0 bg-slate-100">
            <Workspace />
          </Content>
          <Sider width="35vw" theme="light" className="border-l border-slate-200 bg-white">
            <ReviewPanel />
          </Sider>
        </Layout>
      ) : (
        <ProjectPage />
      )}
    </Layout>
  );
}
