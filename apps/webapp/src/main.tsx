import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { createRouter, RouterProvider, type ReactNode } from "@tanstack/react-router";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache";
import { ConvexReactClient } from "convex/react";
import ReactDOM from "react-dom/client";

import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => <Loader />,
  context: {},
  Wrap: function WrapComponent({ children }: { children: ReactNode }) {
    return (
      <ConvexAuthProvider client={convex}>
        <ConvexQueryCacheProvider expiration={300_000} maxIdleEntries={250} debug={false}>
          {children}
        </ConvexQueryCacheProvider>
      </ConvexAuthProvider>
    );
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<RouterProvider router={router} />);
}
