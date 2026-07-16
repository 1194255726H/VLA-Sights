export type AppRoute = 'login' | 'project' | 'projects';

export const getRouteFromPath = (pathname = window.location.pathname): AppRoute => {
  if (pathname === '/project' || pathname === '/project/' || pathname === '/项目' || pathname === '/项目/') return 'project';
  if (pathname.startsWith('/projects') || pathname.startsWith('/annotation')) return 'projects';
  return 'login';
};

export const getProjectIdFromUrl = () => {
  const value = new URLSearchParams(window.location.search).get('project_id');
  return value ? Number(value) : undefined;
};

export const navigateTo = (path: string, replace = false) => {
  if (`${window.location.pathname}${window.location.search}` === path) return;
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method](null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
