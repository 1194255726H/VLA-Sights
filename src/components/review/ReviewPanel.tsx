import { Button, Empty, Form, Input, InputNumber, Modal, Space, Tag, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, DownOutlined, EditOutlined, RightOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useReviewStore } from '../../store/useReviewStore';
import type { EventEditPayload, VideoEvent } from '../../types/domain';
import { reviewStatusLabel } from '../../utils/labels';
import { formatRange } from '../../utils/time';

const { TextArea } = Input;

export function ReviewPanel() {
  const [expandedEventIds, setExpandedEventIds] = useState<Set<number>>(new Set());
  const [activeEvent, setActiveEvent] = useState<VideoEvent | undefined>();
  const [editOpen, setEditOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<EventEditPayload>();
  const [rejectForm] = Form.useForm<{ reason: string }>();

  const currentTask = useReviewStore((state) => state.currentTask);
  const events = useReviewStore((state) => state.events);
  const selectedEvent = useReviewStore((state) => state.selectedEvent);
  const reviewResults = useReviewStore((state) => state.reviewResults);
  const selectEvent = useReviewStore((state) => state.selectEvent);
  const acceptEvent = useReviewStore((state) => state.acceptEvent);
  const rejectEvent = useReviewStore((state) => state.rejectEvent);
  const editEvent = useReviewStore((state) => state.editEvent);

  const reviewResultByEventId = useMemo(() => {
    return reviewResults.reduce<Record<number, (typeof reviewResults)[number]>>((acc, result) => {
      acc[result.eventId] = result;
      return acc;
    }, {});
  }, [reviewResults]);

  useEffect(() => {
    if (!selectedEvent) return;
    setExpandedEventIds((current) => new Set(current).add(selectedEvent.id));
  }, [selectedEvent?.id]);

  const toggleEvent = (event: VideoEvent) => {
    selectEvent(event.id);
    setExpandedEventIds((current) => {
      const next = new Set(current);
      if (next.has(event.id)) {
        next.delete(event.id);
      } else {
        next.add(event.id);
      }
      return next;
    });
  };

  const openEdit = (event: VideoEvent) => {
    setActiveEvent(event);
    form.setFieldsValue({
      start_time_ms: event.start_time_ms,
      end_time_ms: event.end_time_ms,
      title: event.title,
      description: event.description,
      reasoning_description: event.reasoning_description,
    });
    setEditOpen(true);
  };

  const handleAccept = async (event: VideoEvent) => {
    setActiveEvent(event);
    setSubmitting(true);
    await acceptEvent(event.id);
    setSubmitting(false);
    setActiveEvent(undefined);
    void message.success(`已批准 ${event.id}`);
  };

  const handleReject = async () => {
    if (!activeEvent) return;
    const values = await rejectForm.validateFields();
    setSubmitting(true);
    await rejectEvent(activeEvent.id, values.reason);
    setSubmitting(false);
    setRejectOpen(false);
    setActiveEvent(undefined);
    rejectForm.resetFields();
    void message.warning(`已拒绝 ${activeEvent.id}`);
  };

  const handleEdit = async () => {
    if (!activeEvent) return;
    const values = await form.validateFields();
    setSubmitting(true);
    await editEvent(activeEvent.id, values);
    setSubmitting(false);
    setEditOpen(false);
    setActiveEvent(undefined);
    void message.success(`已修改 ${activeEvent.id}`);
  };

  const openReject = (event: VideoEvent) => {
    setActiveEvent(event);
    setRejectOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setActiveEvent(undefined);
  };

  const closeReject = () => {
    setRejectOpen(false);
    setActiveEvent(undefined);
    rejectForm.resetFields();
  };

  if (!currentTask) {
    return (
      <aside className="flex h-full items-center justify-center">
        <Empty description="请选择任务" />
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">活动</div>
            <div className="mt-1 text-xs text-slate-500">全部事件已加载，可展开查看详情</div>
          </div>
          <Tag color="blue" className="m-0">
            {events.length} 事件
          </Tag>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
        {events.length ? (
          events.map((event, index) => {
            const expanded = expandedEventIds.has(event.id);
            const reviewResult = reviewResultByEventId[event.id];
            const selected = selectedEvent?.id === event.id;

            return (
              <section
                key={event.id}
                className={clsx(
                  'overflow-hidden rounded-md border bg-white shadow-sm transition',
                  selected ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200',
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleEvent(event)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-slate-50"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center text-xs text-slate-400">
                    {expanded ? <DownOutlined /> : <RightOutlined />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-950">{event.title}</span>
                    <span className="mt-1 block font-mono text-xs text-slate-500">
                      事件 {index + 1}/{events.length} · {formatRange(event.start_time_ms / 1000, event.end_time_ms / 1000)}
                    </span>
                  </span>
                  {reviewResult ? (
                    <Tag color={reviewResult.status === 'rejected' ? 'red' : reviewResult.status === 'accepted' ? 'green' : 'blue'} className="m-0 shrink-0">
                      {reviewStatusLabel[reviewResult.status]}
                    </Tag>
                  ) : (
                    <Tag className="m-0 shrink-0">未审核</Tag>
                  )}
                </button>

                {expanded ? (
                  <div className="border-t border-slate-200 bg-white p-3">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      
                      <div className="space-y-3">
                        <div>
                          <div className="mb-1 text-xs font-semibold text-slate-500">事件描述</div>
                          <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-slate-700">{event.description}</p>
                        </div>
                        {/* <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-slate-500">
                          <span>{formatRange(event.start_time_ms / 1000, event.end_time_ms / 1000)}</span>
                          <span>置信度 {Math.round(event.confidence * 100)}%</span>
                        </div> */}
                      </div>
                      <div className="mb-3 flex justify-end mt-6">
                        <Space size={8}>
                          <Button size="small" type="primary" loading={submitting && activeEvent?.id === event.id} icon={<CheckCircleOutlined />} onClick={() => void handleAccept(event)}>
                            批准
                          </Button>
                          <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => openReject(event)}>
                            拒绝
                          </Button>
                          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(event)}>
                            编辑
                          </Button>
                        </Space>
                      </div>
                    </div>

                    <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                      <div className="mb-2 text-xs font-semibold text-slate-500">推理描述</div>
                      <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-slate-700">{event.reasoning_description}</p>
                    </div>

                    {reviewResult?.comment && reviewResult.comment !== 'manual_edit' ? (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{reviewResult.comment}</div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })
        ) : (
          <div className="flex h-full items-center justify-center">
            <Empty description="暂无事件" />
          </div>
        )}
      </div>

      <Modal title="编辑事件" open={editOpen} onCancel={closeEdit} onOk={handleEdit} confirmLoading={submitting}>
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="start_time_ms" label="开始时间" rules={[{ required: true }]}>
              <InputNumber min={0} className="w-full" addonAfter="ms" />
            </Form.Item>
            <Form.Item name="end_time_ms" label="结束时间" rules={[{ required: true }]}>
              <InputNumber min={0} className="w-full" addonAfter="ms" />
            </Form.Item>
          </div>
          <Form.Item name="title" label="事件标题" rules={[{ required: true }]}> 
            <Input />
          </Form.Item>
          <Form.Item name="description" label="事件描述" rules={[{ required: true }]}> 
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="reasoning_description" label="推理描述" rules={[{ required: true }]}> 
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="驳回事件" open={rejectOpen} onCancel={closeReject} onOk={handleReject} confirmLoading={submitting} okButtonProps={{ danger: true }}>
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="reason" label="驳回原因" rules={[{ required: true, message: '请输入驳回原因' }]}> 
            <TextArea rows={4} placeholder="说明驳回原因，例如时间区间错误、事件描述不匹配或置信度不足。" />
          </Form.Item>
        </Form>
      </Modal>
    </aside>
  );
}
