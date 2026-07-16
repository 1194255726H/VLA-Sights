import { useEffect, useState } from 'react';
import { ConfigProvider, Spin } from 'antd';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './components/auth/LoginPage';
import { useReviewStore } from './store/useReviewStore';
import { getProjectIdFromUrl, getRouteFromPath, navigateTo } from './utils/router';

export default function App() {
  const [route, setRoute] = useState(() => getRouteFromPath());
  const user = useReviewStore((state) => state.user);
  const authChecked = useReviewStore((state) => state.authChecked);
  const authLoading = useReviewStore((state) => state.authLoading);
  const currentProject = useReviewStore((state) => state.currentProject);
  const restoreSession = useReviewStore((state) => state.restoreSession);
  const openProject = useReviewStore((state) => state.openProject);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const handleRouteChange = () => setRoute(getRouteFromPath());
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    if (!user && route !== 'login') {
      navigateTo('/login', true);
      return;
    }

    if (user && route === 'login') {
      navigateTo('/project', true);
    }
  }, [authChecked, route, user]);

  useEffect(() => {
    if (!authChecked || !user || route !== 'projects') return;

    const projectId = getProjectIdFromUrl();
    if (!projectId) {
      navigateTo('/project', true);
      return;
    }

    if (currentProject?.id !== projectId) {
      void openProject(projectId).catch(() => navigateTo('/project', true));
    }
  }, [authChecked, currentProject?.id, openProject, route, user]);

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 6,
          colorPrimary: '#2563eb',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      {!authChecked && authLoading ? (
        <div className="flex h-screen min-w-[1180px] items-center justify-center bg-slate-100">
          <Spin tip="恢复登录态" />
        </div>
      ) : route === 'login' || !user ? (
        <LoginPage />
      ) : (
        <AppShell route={route} />
      )}
    </ConfigProvider>
  );
}
