# VLA 数据审核平台

这是一个 VLA(Video-Language-Action) 数据审核平台前端 MVP。平台面向 AI 预标注结果审核，不是从零标注：标注员查看视频、切换事件、跳转时间区间、审核、编辑或驳回事件。

## 技术栈

- React 18
- TypeScript
- Vite
- Ant Design
- Zustand
- TailwindCSS
- React Player

## 运行方式

```bash
npm install
npm run dev
```

构建验证：

```bash
npm run build
```

## 目录结构

```text
src/
  api/
    mockApi.ts                  # Mock API，生成 10 个任务，每个任务 3-8 个事件
  components/
    layout/
      AppShell.tsx              # 三栏布局与深色顶部导航
    review/
      ReviewPanel.tsx           # 事件详情、通过、编辑、驳回操作
    tasks/
      TaskCard.tsx              # 左侧任务卡片
      TaskList.tsx              # 任务列表、搜索、进度
    workspace/
      EventTimeline.tsx         # 事件时间轴与跳转入口
      VideoReviewPlayer.tsx     # 视频播放、暂停、倍速、跳转
      Workspace.tsx             # 问题区、视频区、时间轴组合
  store/
    useReviewStore.ts           # Zustand 状态管理
  types/
    domain.ts                   # 任务、事件、审核结果、动作标注扩展类型
  utils/
    labels.ts                   # 中文状态文案映射
    time.ts                     # 时间格式化
  App.tsx
  main.tsx
  index.css
```

## 使用说明

1. 在左侧任务队列中选择一个任务。
2. 在中间查看审核问题和视频。
3. 点击事件时间轴中的事件片段，视频会跳转到对应开始时间。
4. 在右侧查看事件类型、时间区间、置信度、事件描述和推理依据。
5. 根据判断点击“通过”“编辑”或“驳回”。

后续接真实后端时，主要替换 `src/api/mockApi.ts` 中的接口实现即可。
