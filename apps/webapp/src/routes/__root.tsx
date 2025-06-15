import Loader from "@/components/loader";
import { LoginCard } from "@/components/login-card";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import "../index.css";

import type { ConvexReactClient } from "convex/react";

/**
 * Router-wide context available to all routes.
 */
export interface RouterAppContext {
  /** Convex client used for loader queries */
  convex: ConvexReactClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "Hyperwave",
      },
      {
        name: "description",
        content: "Hyperwave is an open-source AI chat app built with Convex and TanStack Router.",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  const isFetching = useRouterState({
    select: (s) => s.isLoading,
  });

  if (isFetching) {
    return <Loader />;
  }

  return (
    <>
      <HeadContent />
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <AuthLoading>
          <div className="flex min-h-svh w-full flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-foreground/80 text-lg font-medium">Spooling the hyperdrive...</p>
          </div>
        </AuthLoading>
        <Unauthenticated>
          <SignInLogin />
        </Unauthenticated>
        <Authenticated>
          <div className="grid grid-rows-[auto_1fr] h-svh">
            <Outlet />
          </div>
        </Authenticated>
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
    </>
  );
}

function SignInLogin() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              Logo here
            </div>
            Hyperwave
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginCard />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/placeholder.svg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
