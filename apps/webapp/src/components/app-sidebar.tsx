import * as React from "react";
import { useState } from "react";
import logomarkDark from "@/assets/hyperwave-logomark-dark.png";
import logomarkLight from "@/assets/hyperwave-logomark-light.png";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { api } from "@hyperwave/backend/convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import { Check, MessagesSquare, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

/** Component shown when the user has no chat threads. */
function NoThreads(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 p-4 text-center text-sm text-muted-foreground/40">
      <MessagesSquare className="h-8 w-8" />
      <span>No chats yet.</span>
    </div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const healthCheck = useQuery(api.healthCheck?.get);
  const threads = useQuery(api.thread.listThreads) ?? [];
  const user = useQuery(api.auth.me);
  const deleteThread = useMutation(api.thread.deleteThread).withOptimisticUpdate(
    (store, { threadId }) => {
      for (const { args, value } of store.getAllQueries(api.thread.listThreads)) {
        if (!value) continue;
        store.setQuery(
          api.thread.listThreads,
          args,
          value.filter((t) => t._id !== threadId),
        );
      }
      store.setQuery(api.thread.getThread, { threadId }, undefined);
    },
  );
  const updateThread = useMutation(api.thread.updateThread).withOptimisticUpdate(
    (store, { threadId, title }) => {
      if (!title) return;
      const current = store.getQuery(api.thread.getThread, { threadId });
      if (current) {
        store.setQuery(api.thread.getThread, { threadId }, { ...current, title });
      }
      for (const { args, value } of store.getAllQueries(api.thread.listThreads)) {
        if (!value) continue;
        store.setQuery(
          api.thread.listThreads,
          args,
          value.map((t) => (t._id === threadId ? { ...t, title } : t)),
        );
      }
    },
  );
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const { isMobile } = useSidebar();

  const handleRenameStart = (threadId: string, currentTitle: string) => {
    setEditingThreadId(threadId);
    setNewThreadTitle(currentTitle);
  };

  const handleRenameCancel = () => {
    setEditingThreadId(null);
    setNewThreadTitle("");
  };

  const handleRenameSubmit = async (threadId: string) => {
    const title = newThreadTitle.trim();
    if (!title) return;

    try {
      await updateThread({
        threadId,
        title,
      });
      setEditingThreadId(null);
      setNewThreadTitle("");
    } catch (error) {
      console.error("Failed to rename thread:", error);
    }
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between">
            <Link
              to="/"
              className="flex h-12 items-center gap-2 rounded-md px-1 no-underline hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <img src={logomarkLight} alt="Hyperwave logo" className="h-9 dark:hidden" />
              <img src={logomarkDark} alt="Hyperwave logo" className="hidden h-9 dark:block" />
            </Link>
            <div className="flex items-center gap-4">
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
              <ModeToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {threads.length === 0 ? (
                <NoThreads />
              ) : (
                threads.map((t: { _id: string; title?: string | null }) => (
                  <SidebarMenuItem key={t._id} className="flex items-center">
                    <SidebarMenuButton
                      asChild
                      size="default"
                      className={`${editingThreadId === t._id ? "hidden" : ""}`}
                    >
                      <Link to="/chat/$threadId" params={{ threadId: t._id }} className="truncate">
                        {t.title ?? "Untitled"}
                      </Link>
                    </SidebarMenuButton>
                    {editingThreadId === t._id ? (
                      <div className="relative w-full">
                        <Input
                          value={newThreadTitle}
                          onChange={(e) => setNewThreadTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()} // Prevent link navigation
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleRenameSubmit(t._id);
                            } else if (e.key === "Escape") {
                              handleRenameCancel();
                            }
                          }}
                          className="h-8 w-full pr-13 pl-1.5 text-sm"
                          autoFocus
                        />
                        {/* Overlay action buttons so the input spans the full width */}
                        <div className="absolute inset-y-0 right-0 flex items-center gap-0 pr-0.5">
                          <Button
                            variant="ghost"
                            className="h-6 w-6 p-0 flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameSubmit(t._id);
                            }}
                            aria-label="Save rename"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-6 w-6 p-0 flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameCancel();
                            }}
                            aria-label="Cancel rename"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="pl-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction
                              showOnHover={!isMobile}
                              className="bg-sidebar-accent"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">More actions</span>
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-48"
                            side={isMobile ? "bottom" : "right"}
                            align={isMobile ? "end" : "start"}
                            onClick={(e) => e.stopPropagation()} // Prevent link navigation from content clicks
                          >
                            <DropdownMenuItem
                              onSelect={() => {
                                handleRenameStart(t._id, t.title ?? "");
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => {
                                deleteThread({ threadId: t._id });
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />{" "}
                              {/* Icon color handled by variant destructive */}
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <NavSecondary className="mt-auto">
          <Link to="/">
            <Button variant="brand" size="lg" className="overflow-visible z-10 w-full">
              New Chat
            </Button>
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
