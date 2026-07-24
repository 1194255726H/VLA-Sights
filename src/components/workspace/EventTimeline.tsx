import { Tag } from 'antd';
import clsx from 'clsx';
import { useRef } from 'react';
import type { WheelEvent } from 'react';
import type { VideoEvent } from '../../types/domain';
import { reviewStatusLabel } from '../../utils/labels';
import { formatRange } from '../../utils/time';

interface EventTimelineProps {
  events: VideoEvent[];
  selectedEvent?: VideoEvent;
  onSelect: (event: VideoEvent) => void;
}

export function EventTimeline({ events, selectedEvent, onSelect }: EventTimelineProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container) return;

    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    event.preventDefault();
    container.scrollLeft += event.deltaY;
  };
  return (
    <section className="h-[142px] shrink-0 border-t border-slate-200 bg-white p-2">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-950">事件时间轴</div>
          <div className="text-xs text-slate-500">点击事件片段跳转到模型返回的时间区间</div>
        </div>
        <Tag color="blue" className="m-0">
          {events.length} 个片段
        </Tag>
      </div>
      {events.length ? (
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="flex gap-3 overflow-x-auto overflow-y-hidden pb-3 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#06b6d4_#e2e8f0] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-500"
        >
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
                <span className="shrink-0 text-[11px] text-blue-600">{reviewStatusLabel[event.review_status ?? 'pending']}</span>
              </div>
              <div className="font-mono text-xs text-slate-600">{formatRange(event.start_time_ms / 1000, event.end_time_ms / 1000)}</div>
              {/* <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-cyan-500" style={{ width: `${event.confidence * 100}%` }} />
              </div> */}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex h-[88px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
          暂无事件片段
        </div>
      )}
    </section>
  );
}
