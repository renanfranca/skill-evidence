export const MISSING_ROUTE = Symbol('MISSING_ROUTE');

export type RouteLookup = Readonly<{ id: string; destination: string }> | typeof MISSING_ROUTE;

export function findRoute(routes: readonly Readonly<{ id: string; destination: string }>[], id: string): RouteLookup {
  return routes.find(route => route.id === id) ?? MISSING_ROUTE;
}
