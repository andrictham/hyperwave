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
import { Frame, LifeBuoy, Map, PieChart, Send } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Chats",
      url: "#",
      items: [
        {
          title: "Cat qubits explained",
          url: "#",
          isActive: true,
        },
        {
          title: "Metaphor for resurfacing memories something something",
          url: "#",
          isActive: false,
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const healthCheck = useQuery(api.healthCheck.get);

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
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <a href={item.url} className="truncate">
                        {item.title}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        <NavSecondary className="mt-auto">
          <Button>New Chat</Button>
        </NavSecondary>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
