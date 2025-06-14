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
import { Link } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const healthCheck = useQuery(api.healthCheck?.get);
  const threads = useQuery(api.chat.listThreads) ?? [];
  const user = useQuery(api.auth.me);
  const deleteThread = useAction(api.chatActions.deleteThread);

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
                <SidebarMenuItem key={t._id} className="flex items-center">
                  <SidebarMenuButton asChild className="flex-1 truncate">
                    <Link to="/chat/$threadId" params={{ threadId: t._id }} className="truncate">
                      {t.title ?? "Untitled"}
                    </Link>
                  </SidebarMenuButton>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteThread({ threadId: t._id })}
                    aria-label="Delete thread"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
