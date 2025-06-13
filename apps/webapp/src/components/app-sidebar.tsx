import * as React from "react";
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
import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const healthCheck = useQuery(api.healthCheck.get);
  const threads = useQuery(api.chat.listThreads) ?? [];

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-2">
                <div className="bg-[#c5420a] text-[#fffdfc] flex items-center justify-center rounded-md w-8 h-8 font-bold text-lg shadow-lg">
                  H
                </div>
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
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
