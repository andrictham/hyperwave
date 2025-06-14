import * as React from "react";
import logoDark from "@/assets/hyperwave-logo-dark.png";
import logoLight from "@/assets/hyperwave-logo-light.png";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { api } from "@hyperwave/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";
import type { ThreadDoc } from "@convex-dev/agent";

interface SidebarApi {
  healthCheck: {
    get: FunctionReference<"query", "public", Record<never, never>, string>;
  };
  chat: {
    listThreads: FunctionReference<"query", "public", Record<never, never>, ThreadDoc[]>;
  };
  auth: {
    me: FunctionReference<
      "query",
      "public",
      Record<never, never>,
      { name?: string; email?: string; image?: string } | null
    >;
  };
}

const chatApi = api as unknown as SidebarApi;
import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const healthCheck = useQuery(chatApi.healthCheck?.get);
  const threads = useQuery(chatApi.chat.listThreads) ?? [];
  const user = useQuery(chatApi.auth?.me);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-2">
                <img src={logoLight} alt="Hyperwave logo" className="h-8 w-8 dark:hidden" />
                <img src={logoDark} alt="Hyperwave logo" className="hidden h-8 w-8 dark:block" />
                <span className="font-bold text-xl tracking-wide">Hyperwave</span>
              </div>
            </SidebarMenuButton>
            <ModeToggle />
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${healthCheck === "OK" ? "bg-green-5" : healthCheck === undefined ? "bg-orange-5" : "bg-red-5"}`}
              />
              <span className="text-sm text-muted-foreground">
                {healthCheck === undefined
                  ? "Checking..."
                  : healthCheck === "OK"
                    ? "Connected"
                    : "Error"}
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {threads.map((t: { _id: string; title?: string | null }) => (
                <SidebarMenuItem key={t._id}>
                  <SidebarMenuButton asChild>
                    <Link to="/chat/$threadId" params={{ threadId: t._id }} className="truncate">
                      {t.title ?? "Untitled"}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <NavSecondary className="mt-auto">
          <Link to="/chat/new">
            <Button>New Chat</Button>
          </Link>
        </NavSecondary>
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <NavUser
            user={{
              name: user.name ?? "",
              email: user.email ?? "",
              avatar: user.image ?? "",
            }}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
