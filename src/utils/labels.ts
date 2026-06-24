import type { ReviewResult, TaskStatus, UserRole } from '../types/domain';

export const roleLabel: Record<UserRole, string> = {
  admin: '公司管理员',
  labeler: '标注员',
  reviewer: '审核员',
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  pending: '待标注',
  labeling: '标注中',
  analyzing: '分析中',
  completed: '已完成',
  failed: '失败',
};

export const reviewStatusLabel: Record<ReviewResult['status'], string> = {
  accepted: '已通过',
  rejected: '已驳回',
  edited: '已修改',
};
