
import { LoginForm } from "@/components/login-form";
import { ChatView } from "@/components/ChatView";
import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";


export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {

  return (
   <>
      <AuthLoading>Loading indicator here</AuthLoading>
      <Unauthenticated>
        <SignInLogin />
      </Unauthenticated>
      <Authenticated>
        <ChatView />
      </Authenticated>
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
            <LoginForm />
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
