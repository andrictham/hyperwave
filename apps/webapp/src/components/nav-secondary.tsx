import * as React from "react";
import { SidebarGroup, SidebarGroupContent, SidebarMenu } from "@/components/ui/sidebar";

export function NavSecondary({
  children,
  ...props
}: {
  children: React.ReactNode;
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>{children}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
