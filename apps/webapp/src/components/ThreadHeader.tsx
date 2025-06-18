import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@hyperwave/backend/convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import { Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";

/**
 * Component that displays the header with thread title, sidebar toggle, and thread actions
 */
export function ThreadHeader({ threadId }: { threadId?: string }) {
  const navigate = useNavigate();
  const thread = useQuery(api.thread.getThread, threadId ? { threadId } : "skip");
  const updateThread = useMutation(api.thread.updateThread).withOptimisticUpdate(
    (store, { threadId, title }) => {
      if (!title) return;
      const existing = store.getQuery(api.thread.getThread, { threadId });
      if (existing) {
        store.setQuery(api.thread.getThread, { threadId }, { ...existing, title });
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
  const deleteThread = useMutation(api.thread.deleteThread).withOptimisticUpdate(
    (store, { threadId }) => {
      store.setQuery(api.thread.getThread, { threadId }, undefined);
      for (const { args, value } of store.getAllQueries(api.thread.listThreads)) {
        if (!value) continue;
        store.setQuery(
          api.thread.listThreads,
          args,
          value.filter((t) => t._id !== threadId),
        );
      }
    },
  );
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEditing = () => {
    // Reset the input value to the current thread title
    if (thread?.title) {
      setNewTitle(thread.title);
    }
    setIsDropdownOpen(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset to the current thread title when cancelling
    if (thread?.title) {
      setNewTitle(thread.title);
    }
    setIsEditing(false);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Use requestAnimationFrame to ensure the input is visible in the DOM
      const timer = requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [isEditing]);

  const handleRename = async () => {
    if (!threadId || !newTitle.trim()) {
      setIsEditing(false);
      return;
    }
    try {
      await updateThread({
        threadId,
        title: newTitle.trim(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to rename thread:", error);
    }
  };

  const handleDelete = async () => {
    if (!threadId) return;
    try {
      await deleteThread({ threadId });
      navigate({ to: "/" }); // Navigate to home after deletion
    } catch (error) {
      console.error("Failed to delete thread:", error);
    }
  };

  useEffect(() => {
    if (thread?.title) {
      setNewTitle(thread.title);
    }
  }, [thread?.title]);

  return (
    <header className="flex items-center justify-between h-14 border-b px-4 relative">
      <SidebarTrigger className="mr-2" />
      <div className="flex w-full justify-center">
        {isEditing ? (
          <div className="flex justify-center items-center gap-1 w-full md:w-[50vw]">
            <Input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                else if (e.key === "Escape") setIsEditing(false);
              }}
              className="h-8 max-w-[70vw] xs:max-w-full"
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
              onClick={handleRename}
            >
              <Check className="h-4 w-4" />
              <span className="sr-only">Save</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cancel</span>
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="w-auto max-w-[70vw] truncate text-xs sm:text-sm md:text-md lg:text-lg font-semibold px-2 py-1 rounded-md hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={handleStartEditing}
            disabled={!threadId}
          >
            {!threadId ? (
              "New chat"
            ) : thread ? (
              thread.title || "New chat"
            ) : (
              <Skeleton className="h-6 w-32" />
            )}
          </button>
        )}
      </div>

      <div>
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!threadId}>
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Thread actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleStartEditing();
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => e.preventDefault()}
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
