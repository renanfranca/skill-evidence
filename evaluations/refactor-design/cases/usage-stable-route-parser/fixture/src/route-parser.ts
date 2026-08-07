export type Route = { kind: 'workspace'; workspaceId: string } | { kind: 'job'; jobId: string } | { kind: 'missing' };

function segments(pathname: string): readonly string[] {
  return pathname.split('/').filter(Boolean);
}

export function parseRoute(pathname: string): Route {
  const [resource, id] = segments(pathname);
  if (resource === 'workspaces' && id) return { kind: 'workspace', workspaceId: id };
  if (resource === 'jobs' && id) return { kind: 'job', jobId: id };
  return { kind: 'missing' };
}
