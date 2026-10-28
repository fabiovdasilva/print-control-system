import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
// The standalone central build generates this route tree. Keeping the router
// pointed at it prevents the central from serving a stale list of routes.
import { routeTree } from "./routeTree.central.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
