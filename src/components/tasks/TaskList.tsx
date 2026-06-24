import { Input, Progress, Skeleton } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { useReviewStore } from '../../store/useReviewStore';
import { TaskCard } from './TaskCard';

export function TaskList() {
  const [keyword, setKeyword] = useState('');
  const currentProject = useReviewStore((state) => state.currentProject);
  const tasks = useReviewStore((state) => state.tasks);
  const currentTask = useReviewStore((state) => state.currentTask);
  const events = useReviewStore((state) => state.events);
  const taskLoading = useReviewStore((state) => state.taskLoading);
  const selectTask = useReviewStore((state) => state.selectTask);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => `${task.id} ${task.oss_key} ${task.status} ${task.assigned_username ?? ''}`.toLowerCase().includes(keyword.toLowerCase()));
  }, [keyword, tasks]);

  const completed = tasks.filter((task) => task.status === 'completed').length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <aside className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-4">
        <div className="mb-3">
          <div className="truncate text-sm font-semibold text-slate-950">{currentProject?.name ?? '任务队列'}</div>
          <div className="text-xs text-slate-500">项目视频任务</div>
        </div>
        <Input
          allowClear
          size="middle"
          prefix={<SearchOutlined />}
          placeholder="搜索任务"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>完成进度</span>
            <span>
              {completed}/{tasks.length}
            </span>
          </div>
          <Progress percent={progress} size="small" showInfo={false} />
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {taskLoading && !tasks.length ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              active={task.id === currentTask?.id}
              eventCount={task.id === currentTask?.id ? events.length : task.events?.length ?? 0}
              onClick={() => void selectTask(task.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
