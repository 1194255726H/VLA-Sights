import { Button, Empty, Form, Input, InputNumber, Modal, Popconfirm, Space, Tag, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, DownOutlined, EditOutlined, RightOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useReviewStore } from '../../store/useReviewStore';
import type { EventEditPayload, EventReviewStatus, VideoEvent } from '../../types/domain';
import { reviewStatusLabel } from '../../utils/labels';
import { formatRange } from '../../utils/time';

const { TextArea } = Input;

const reviewTagColor: Record<EventReviewStatus, string | undefined> = {
  pending: undefined,
  approved: 'green',
  rejected: 'red',
};

type EventAction = 'approve' | 'reject' | 'edit' | 'delete';

export function ReviewPanel() {
  const [expandedEventIds, setExpandedEventIds] = useState<Set<number>>(new Set());
  const [activeEvent, setActiveEvent] = useState<VideoEvent>();
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState<{ eventId: number; action: EventAction }>();
  const [form] = Form.useForm<EventEditPayload>();

  const user = useReviewStore((state) => state.user);
  const currentTask = useReviewStore((state) => state.currentTask);
  const events = useReviewStore((state) => state.events);
  const selectedEvent = useReviewStore((state) => state.selectedEvent);
  const selectEvent = useReviewStore((state) => state.selectEvent);
  const acceptEvent = useReviewStore((state) => state.acceptEvent);
  const rejectEvent = useReviewStore((state) => state.rejectEvent);
  const editEvent = useReviewStore((state) => state.editEvent);
  const deleteEvent = useReviewStore((state) => state.deleteEvent);

  const canManageEvents = user?.role === 'admin' || user?.role === 'labeler';

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
      confidence: event.confidence,
    });
    setEditOpen(true);
  };

  const handleAccept = async (event: VideoEvent) => {
    setSubmitting({ eventId: event.id, action: 'approve' });
    try {
      await acceptEvent(event.id);
      void message.success(`事件 ${event.id} 已通过`);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '批准事件失败');
    } finally {
      setSubmitting(undefined);
    }
  };

  const handleReject = async (event: VideoEvent) => {
    setSubmitting({ eventId: event.id, action: 'reject' });
    try {
      await rejectEvent(event.id);
      void message.warning(`事件 ${event.id} 已拒绝`);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '拒绝事件失败');
    } finally {
      setSubmitting(undefined);
    }
  };

  const handleEdit = async () => {
    if (!activeEvent) return;

    let values: EventEditPayload;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSubmitting({ eventId: activeEvent.id, action: 'edit' });
    try {
      await editEvent(activeEvent.id, values);
      void message.success(`事件 ${activeEvent.id} 已修改`);
      setEditOpen(false);
      setActiveEvent(undefined);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '编辑事件失败');
    } finally {
      setSubmitting(undefined);
    }
  };

  const handleDelete = async (event: VideoEvent) => {
    setSubmitting({ eventId: event.id, action: 'delete' });
    try {
      await deleteEvent(event.id);
      void message.success(`事件 ${event.id} 已删除`);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '删除事件失败');
    } finally {
      setSubmitting(undefined);
    }
  };

  const closeEdit = () => {
    if (submitting?.action === 'edit') return;
    setEditOpen(false);
    setActiveEvent(undefined);
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
            const selected = selectedEvent?.id === event.id;
            const reviewStatus = event.review_status ?? 'pending';

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
                  <Tag color={reviewTagColor[reviewStatus]} className="m-0 shrink-0">
                    {reviewStatusLabel[reviewStatus]}
                  </Tag>
                </button>

                {expanded ? (
                  <div className="border-t border-slate-200 bg-white p-3">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div>
                        <div className="mb-1 text-xs font-semibold text-slate-500">事件描述</div>
                        <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-slate-700">{event.description}</p>
                      </div>
                      <div className="mt-6 flex justify-end">
                        <Space size={8} wrap>
                          <Button
                            size="small"
                            type="primary"
                            disabled={!canManageEvents || reviewStatus === 'approved'}
                            loading={submitting?.eventId === event.id && submitting.action === 'approve'}
                            icon={<CheckCircleOutlined />}
                            onClick={() => void handleAccept(event)}
                          >
                            通过
                          </Button>
                          <Popconfirm
                            title="拒绝这个事件？"
                            okText="拒绝"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleReject(event)}
                          >
                            <Button
                              size="small"
                              danger
                              disabled={!canManageEvents || reviewStatus === 'rejected'}
                              loading={submitting?.eventId === event.id && submitting.action === 'reject'}
                              icon={<CloseCircleOutlined />}
                            >
                              拒绝
                            </Button>
                          </Popconfirm>
                          <Button size="small" disabled={!canManageEvents} icon={<EditOutlined />} onClick={() => openEdit(event)}>
                            编辑
                          </Button>
                          <Popconfirm
                            title="删除这个事件？"
                            description="删除后将不再出现在任务事件列表中。"
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDelete(event)}
                          >
                            <Button
                              size="small"
                              danger
                              disabled={!canManageEvents}
                              loading={submitting?.eventId === event.id && submitting.action === 'delete'}
                              icon={<DeleteOutlined />}
                            >
                              删除
                            </Button>
                          </Popconfirm>
                        </Space>
                      </div>
                    </div>

                    <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                      <div className="mb-2 text-xs font-semibold text-slate-500">推理描述</div>
                      <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-slate-700">{event.reasoning_description}</p>
                    </div>
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

      <Modal
        title="编辑事件"
        open={editOpen}
        onCancel={closeEdit}
        onOk={handleEdit}
        confirmLoading={submitting?.action === 'edit'}
        maskClosable={!submitting}
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="start_time_ms" label="开始时间" rules={[{ required: true, message: '请输入开始时间' }]}>
              <InputNumber min={0} className="w-full" addonAfter="ms" />
            </Form.Item>
            <Form.Item
              name="end_time_ms"
              label="结束时间"
              dependencies={['start_time_ms']}
              rules={[
                { required: true, message: '请输入结束时间' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const startTime = getFieldValue('start_time_ms');
                    return value !== undefined && startTime !== undefined && value < startTime
                      ? Promise.reject(new Error('结束时间不能早于开始时间'))
                      : Promise.resolve();
                  },
                }),
              ]}
            >
              <InputNumber min={0} className="w-full" addonAfter="ms" />
            </Form.Item>
          </div>
          <Form.Item name="title" label="事件标题" rules={[{ required: true, message: '请输入事件标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="事件描述" rules={[{ required: true, message: '请输入事件描述' }]}>
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="reasoning_description" label="推理描述" rules={[{ required: true, message: '请输入推理描述' }]}>
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="confidence" label="置信度">
            <InputNumber min={0} max={1} step={0.01} precision={2} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </aside>
  );
}
