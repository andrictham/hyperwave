import { Link } from "@tanstack/react-router";
import { api } from "@hyperwave/backend/convex/_generated/api";

import { ModeToggle } from "./mode-toggle";
import { useQuery } from "convex/react";

export default function Header() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/todos", label: "Todos" },
  ];
  const healthCheck = useQuery(api.healthCheck.get);

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} to={to}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
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
      </div>
      <hr />
    </div>
  );
}
