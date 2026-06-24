import { Alert, Button, Empty, Input, Space, Spin, Tag, message } from 'antd';
import { ThunderboltOutlined, SearchOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { useReviewStore } from '../../store/useReviewStore';
import type { VideoEvent } from '../../types/domain';
import { taskStatusLabel } from '../../utils/labels';
import { EventTimeline } from './EventTimeline';
import { VideoReviewPlayer } from './VideoReviewPlayer';

export function Workspace() {
  const [prompt, setPrompt] = useState('寻找车辆超过行人的时刻');
  const user = useReviewStore((state) => state.user);
  const currentTask = useReviewStore((state) => state.currentTask);
  const events = useReviewStore((state) => state.events);
  const selectedEvent = useReviewStore((state) => state.selectedEvent);
  const seekRequestId = useReviewStore((state) => state.seekRequestId);
  const reviewResults = useReviewStore((state) => state.reviewResults);
  const isLoading = useReviewStore((state) => state.isLoading);
  const analysisLoading = useReviewStore((state) => state.analysisLoading);
  const analysisJob = useReviewStore((state) => state.analysisJob);
  const analysisError = useReviewStore((state) => state.analysisError);
  const selectEvent = useReviewStore((state) => state.selectEvent);
  const queryCurrentTask = useReviewStore((state) => state.queryCurrentTask);
  const analyzeCurrentTask = useReviewStore((state) => state.analyzeCurrentTask);

  const canAnalyze = user?.role === 'admin' || user?.role === 'labeler';

  const reviewStatusByEventId = useMemo(() => {
    return reviewResults.reduce<Record<number, string>>((acc, result) => {
      acc[result.eventId] = result.status;
      return acc;
    }, {});
  }, [reviewResults]);

  const handleSelectEvent = (event: VideoEvent) => {
    selectEvent(event.id);
  };

  const runQuery = async () => {
    if (!prompt.trim()) {
      void message.warning('请输入查询内容');
      return;
    }
    await queryCurrentTask(prompt.trim());
    void message.success('查询完成');
  };

  const runAnalyze = async () => {
    if (!prompt.trim()) {
      void message.warning('请输入分析内容');
      return;
    }
    await analyzeCurrentTask(prompt.trim());
    void message.success('分析完成');
  };

  if (!currentTask) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty description="请选择任务" />
      </div>
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wide text-slate-500">任务 #{currentTask.id}</div>
            <h1 className="m-0 truncate text-base font-semibold leading-6 text-slate-950">{currentTask.oss_key}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Tag color="geekblue" className="m-0">
              {taskStatusLabel[currentTask.status]}
            </Tag>
            <Tag className="m-0">{currentTask.assigned_username ?? '未分配'}</Tag>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="输入自然语言查询，例如：寻找车辆超过行人的时刻"
            disabled={!canAnalyze || analysisLoading}
            onPressEnter={() => canAnalyze && void runQuery()}
          />
          <Space.Compact>
            <Button icon={<SearchOutlined />} loading={analysisLoading} disabled={!canAnalyze} onClick={() => void runQuery()}>
              快速查询
            </Button>
            {/* <Button type="primary" icon={<ThunderboltOutlined />} loading={analysisLoading} disabled={!canAnalyze} onClick={() => void runAnalyze()}>
              异步分析
            </Button> */}
          </Space.Compact>
        </div>

        {!canAnalyze ? <Alert className="mt-3" type="info" showIcon message="当前角色可查看任务和事件，不能发起分析。" /> : null}
        {analysisJob && analysisLoading ? <div className="mt-2 text-xs text-slate-500">分析任务 #{analysisJob.id}：{analysisJob.status}</div> : null}
        {analysisError ? <Alert className="mt-3" type="error" showIcon message={analysisError} /> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <Spin spinning={isLoading} wrapperClassName="h-full [&_.ant-spin-container]:h-full">
          <div className="flex h-full min-h-0 flex-col">
            <VideoReviewPlayer url={currentTask.presigned_url ?? undefined} selectedEvent={selectedEvent} seekRequestId={seekRequestId} />
            <EventTimeline
              events={events}
              selectedEvent={selectedEvent}
              reviewStatusByEventId={reviewStatusByEventId}
              onSelect={handleSelectEvent}
            />
          </div>
        </Spin>
      </div>
    </main>
  );
}
