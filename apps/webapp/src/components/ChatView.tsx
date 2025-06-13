import React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// If you use Tailwind in your project, keep these classes. If not, let me know and I will convert to vanilla CSS.
export function ChatView() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-screen bg-[#1c1a19]">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-[#1c1a19]">
            {/* Top Bar */}
            <header className="h-[60px] flex items-center px-8 border-b border-[#393432] bg-[#1c1a19a6] backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="bg-[#c5420a] text-[#fffdfc] flex items-center justify-center rounded-md w-8 h-8 font-bold text-lg shadow-lg">
                  H
                </div>
                <span className="font-bold text-lg tracking-wide">Demo chat 1</span>
              </div>
            </header>
            {/* Chat messages */}
            <main className="flex-1 overflow-y-auto p-8 space-y-4">
              <div className="flex gap-4 items-start">
                <div className="bg-[#c5420a] text-[#fffdfc] rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  U
                </div>
                <div className="bg-[#272321] text-[#e5e2e1] rounded-lg px-4 py-2 max-w-xl">
                  Hello, how can I use Hyperwave?
                </div>
              </div>
              <div className="flex gap-4 items-start flex-row-reverse">
                <div className="bg-[#393432] text-[#e5e2e1] rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  B
                </div>
                <div className="bg-[#393432] text-[#e5e2e1] rounded-lg px-4 py-2 max-w-xl">
                  Hi! Hyperwave helps you chat with AI. Try typing a message below.
                </div>
              </div>
            </main>
            {/* Chat input */}
            <form className="flex items-center gap-4 p-6 border-t border-[#393432] bg-[#1c1a19]">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 bg-[#272321] text-[#e5e2e1] rounded-lg px-4 py-3 outline-none border border-[#393432] focus:border-[#c5420a] transition"
              />
              <button
                type="submit"
                className="bg-[#c5420a] text-[#fffdfc] rounded-lg px-6 py-3 font-semibold shadow hover:bg-[#a63700] transition"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
