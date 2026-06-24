import { Button, Form, Input, Alert, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useReviewStore } from '../../store/useReviewStore';
import { navigateTo } from '../../utils/router';

interface LoginFormValues {
  username: string;
  password: string;
}

const demoAccounts = [
  ['admin', 'Admin123456!', '管理员'],
  ['labeler', 'Labeler123456!', '标注员'],
  ['reviewer', 'Reviewer123456!', '审核员'],
] as const;

export function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();
  const login = useReviewStore((state) => state.login);
  const authLoading = useReviewStore((state) => state.authLoading);
  const authError = useReviewStore((state) => state.authError);

  const handleSubmit = async (values: LoginFormValues) => {
    await login(values.username, values.password);
    navigateTo('/projects', true);
  };

  const fillAccount = (username: string, password: string) => {
    form.setFieldsValue({ username, password });
  };

  return (
    <main className="flex min-h-screen min-w-[1180px] items-center justify-center bg-slate-100 px-6 py-10">
      <section className="grid w-full max-w-[980px] grid-cols-[1.05fr_0.95fr] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between bg-slate-950 p-10 text-white">
          <div>
            {/* <div className="text-sm font-semibold text-cyan-300">VLA 数据审核平台</div> */}
            <h1 className="mt-5 text-3xl font-semibold leading-tight">视频标注 Demo 联调入口</h1>
            <p className="mt-4 max-w-[420px] text-sm leading-7 text-slate-300">
              登录后先进入项目列表，再选择项目进入任务标注工作台。权限将按接口返回角色控制可用操作。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-slate-300">
            {demoAccounts.map(([username, password, role]) => (
              <button
                key={username}
                type="button"
                onClick={() => fillAccount(username, password)}
                className="rounded-md border border-white/10 bg-white/5 p-3 text-left transition hover:border-cyan-300/50 hover:bg-white/10"
              >
                <div className="font-semibold text-white">{role}</div>
                <div className="mt-1 font-mono text-[11px] text-slate-400">{username}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-10">
          <Typography.Title level={3} className="!mb-1">
            登录
          </Typography.Title>
          <div className="mb-8 text-sm text-slate-500">使用后端初始化脚本内置账号登录。</div>

          {authError ? <Alert className="mb-5" type="error" showIcon message={authError} /> : null}

          <Form form={form} layout="vertical" initialValues={{ username: 'labeler', password: 'Labeler123456!' }} onFinish={handleSubmit}>
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input size="large" prefix={<UserOutlined />} placeholder="admin / labeler / reviewer" />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password size="large" prefix={<LockOutlined />} placeholder="请输入密码" />
            </Form.Item>
            <Button block size="large" type="primary" htmlType="submit" loading={authLoading}>
              登录进入项目
            </Button>
          </Form>
        </div>
      </section>
    </main>
  );
}

