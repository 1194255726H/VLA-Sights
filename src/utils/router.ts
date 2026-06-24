export type AppRoute = 'login' | 'projects' | 'annotation';

export const getRouteFromPath = (pathname = window.location.pathname): AppRoute => {
  if (pathname.startsWith('/annotation')) return 'annotation';
  if (pathname.startsWith('/projects')) return 'projects';
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
