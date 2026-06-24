import { Badge, Tag } from 'antd';
import clsx from 'clsx';
import type { Task } from '../../types/domain';
import { taskStatusLabel } from '../../utils/labels';

interface TaskCardProps {
  task: Task;
  active: boolean;
  eventCount: number;
  onClick: () => void;
}

const statusColor = {
  pending: 'default',
  labeling: 'processing',
  analyzing: 'warning',
  completed: 'success',
  failed: 'error',
} as const;

const fileNameFromOssKey = (ossKey: string) => {
  const parts = ossKey.split('/');
  return parts[parts.length - 1] || ossKey;
};

export function TaskCard({ task, active, eventCount, onClick }: TaskCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full rounded-md border p-3 text-left transition',
        active ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-slate-600">#{task.id}</span>
        <Badge status={statusColor[task.status]} text={<span className="text-xs">{taskStatusLabel[task.status]}</span>} />
      </div>
      <div className="line-clamp-2 text-sm font-medium leading-5 text-slate-900">{fileNameFromOssKey(task.oss_key)}</div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Tag className="m-0 rounded" color={eventCount > 0 ? 'geekblue' : 'default'}>
          {eventCount} 个事件
        </Tag>
        <span className="truncate text-xs text-slate-500">{task.assigned_username ?? '未分配'}</span>
      </div>
    </button>
  );
}

