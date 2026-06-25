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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-10">
      <section className="grid w-full max-w-[480px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">


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

