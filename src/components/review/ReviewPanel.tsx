import { Button, Descriptions, Divider, Empty, Form, Input, InputNumber, Modal, Progress, Space, Tag, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EditOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { useReviewStore } from '../../store/useReviewStore';
import type { EventEditPayload } from '../../types/domain';
import { reviewStatusLabel } from '../../utils/labels';
import { formatRange } from '../../utils/time';

const { TextArea } = Input;

export function ReviewPanel() {
  const [editOpen, setEditOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<EventEditPayload>();
  const [rejectForm] = Form.useForm<{ reason: string }>();

  const currentTask = useReviewStore((state) => state.currentTask);
  const selectedEvent = useReviewStore((state) => state.selectedEvent);
  const reviewResults = useReviewStore((state) => state.reviewResults);
  const acceptEvent = useReviewStore((state) => state.acceptEvent);
  const rejectEvent = useReviewStore((state) => state.rejectEvent);
  const editEvent = useReviewStore((state) => state.editEvent);

  const reviewResult = useMemo(() => {
    return reviewResults.find((item) => item.eventId === selectedEvent?.id);
  }, [reviewResults, selectedEvent?.id]);

  const openEdit = () => {
    if (!selectedEvent) return;
    form.setFieldsValue({
      start_time_ms: selectedEvent.start_time_ms,
      end_time_ms: selectedEvent.end_time_ms,
      description: selectedEvent.description,
    });
    setEditOpen(true);
  };

  const handleAccept = async () => {
    if (!selectedEvent) return;
    setSubmitting(true);
    await acceptEvent(selectedEvent.id);
    setSubmitting(false);
    void message.success(`已通过 ${selectedEvent.id}`);
  };

  const handleReject = async () => {
    if (!selectedEvent) return;
    const values = await rejectForm.validateFields();
    setSubmitting(true);
    await rejectEvent(selectedEvent.id, values.reason);
    setSubmitting(false);
    setRejectOpen(false);
    rejectForm.resetFields();
    void message.warning(`已驳回 ${selectedEvent.id}`);
  };

  const handleEdit = async () => {
    if (!selectedEvent) return;
    const values = await form.validateFields();
    setSubmitting(true);
    await editEvent(selectedEvent.id, values);
    setSubmitting(false);
    setEditOpen(false);
    void message.success(`已修改 ${selectedEvent.id}`);
  };

  if (!currentTask || !selectedEvent) {
    return (
      <aside className="flex h-full items-center justify-center">
        <Empty description="请选择事件" />
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">事件面板</div>
            <div className="mt-1 font-mono text-xs text-slate-500">#{selectedEvent.id}</div>
          </div>
          {reviewResult ? (
            <Tag color={reviewResult.status === 'rejected' ? 'red' : reviewResult.status === 'accepted' ? 'green' : 'blue'} className="m-0">
              {reviewStatusLabel[reviewResult.status]}
            </Tag>
          ) : (
            <Tag className="m-0">未审核</Tag>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-slate-950">模型事件</div>
            <div className="font-mono text-xs text-slate-500">{formatRange(selectedEvent.start_time_ms / 1000, selectedEvent.end_time_ms / 1000)}</div>
          </div>
          <Progress
            percent={Math.round(selectedEvent.confidence * 100)}
            size="small"
            strokeColor={selectedEvent.confidence > 0.82 ? '#16a34a' : '#0891b2'}
          />
        </div>

        <Divider className="my-4" />

        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="来源">{selectedEvent.source}</Descriptions.Item>
          <Descriptions.Item label="状态">{selectedEvent.status}</Descriptions.Item>
          <Descriptions.Item label="开始时间">{selectedEvent.start_time_ms} ms</Descriptions.Item>
          <Descriptions.Item label="结束时间">{selectedEvent.end_time_ms} ms</Descriptions.Item>
        </Descriptions>

        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500">事件描述</div>
          <p className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">{selectedEvent.description}</p>
        </div>

        {/* {selectedEvent.raw_payload ? (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500">Raw Payload</div>
            <pre className="max-h-[220px] overflow-auto rounded-md border border-slate-200 bg-slate-950 p-3 text-xs leading-5 text-slate-100">
              {JSON.stringify(selectedEvent.raw_payload, null, 2)}
            </pre>
          </div>
        ) : null} */}

        {reviewResult?.comment && reviewResult.comment !== 'manual_edit' ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{reviewResult.comment}</div>
        ) : null}
      </div>

      <div className="border-t border-slate-200 bg-white p-4">
        <Space.Compact block>
          <Button loading={submitting} type="primary" icon={<CheckCircleOutlined />} onClick={handleAccept}>
            通过
          </Button>
          <Button icon={<EditOutlined />} onClick={openEdit}>
            编辑
          </Button>
          <Button danger icon={<CloseCircleOutlined />} onClick={() => setRejectOpen(true)}>
            驳回
          </Button>
        </Space.Compact>
      </div>

      <Modal title="编辑事件" open={editOpen} onCancel={() => setEditOpen(false)} onOk={handleEdit} confirmLoading={submitting}>
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="start_time_ms" label="开始时间" rules={[{ required: true }]}>
              <InputNumber min={0} className="w-full" addonAfter="ms" />
            </Form.Item>
            <Form.Item name="end_time_ms" label="结束时间" rules={[{ required: true }]}>
              <InputNumber min={0} className="w-full" addonAfter="ms" />
            </Form.Item>
          </div>
          <Form.Item name="description" label="事件描述" rules={[{ required: true }]}> 
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="驳回事件" open={rejectOpen} onCancel={() => setRejectOpen(false)} onOk={handleReject} confirmLoading={submitting} okButtonProps={{ danger: true }}>
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="reason" label="驳回原因" rules={[{ required: true, message: '请输入驳回原因' }]}> 
            <TextArea rows={4} placeholder="说明驳回原因，例如时间区间错误、事件描述不匹配或置信度不足。" />
          </Form.Item>
        </Form>
      </Modal>
    </aside>
  );
}
