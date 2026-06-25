import { Tag } from 'antd';
import clsx from 'clsx';
import type { VideoEvent } from '../../types/domain';
import { reviewStatusLabel } from '../../utils/labels';
import { formatRange } from '../../utils/time';

interface EventTimelineProps {
  events: VideoEvent[];
  selectedEvent?: VideoEvent;
  reviewStatusByEventId: Record<number, string>;
  onSelect: (event: VideoEvent) => void;
}

export function EventTimeline({ events, selectedEvent, reviewStatusByEventId, onSelect }: EventTimelineProps) {
  return (
    <section className="h-[132px] shrink-0 border-t border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-950">事件时间轴</div>
          <div className="text-xs text-slate-500">点击事件片段跳转到模型返回的时间区间</div>
        </div>
        <Tag color="blue" className="m-0">
          {events.length} 个片段
        </Tag>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelect(event)}
            className={clsx(
              'h-[68px] min-w-[180px] rounded-md border px-3 text-left transition',
              selectedEvent?.id === event.id
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300',
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{event.title}</span>
              {reviewStatusByEventId[event.id] ? (
                <span className="shrink-0 text-[11px] text-blue-600">{reviewStatusLabel[reviewStatusByEventId[event.id] as keyof typeof reviewStatusLabel]}</span>
              ) : null}
            </div>
            <div className="font-mono text-xs text-slate-600">{formatRange(event.start_time_ms / 1000, event.end_time_ms / 1000)}</div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-cyan-500" style={{ width: `${event.confidence * 100}%` }} />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

