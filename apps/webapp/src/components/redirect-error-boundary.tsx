import { Component, type ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

function Redirect({ to }: { to: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to });
  }, [navigate, to]);
  return null;
}

export interface RedirectErrorBoundaryProps {
  /** Path to navigate to when an error is caught. */
  to: string;
  children: ReactNode;
}

interface RedirectErrorBoundaryState {
  hasError: boolean;
}

/**
 * Simple error boundary that redirects when an error is encountered.
 */
export class RedirectErrorBoundary extends Component<
  RedirectErrorBoundaryProps,
  RedirectErrorBoundaryState
> {
  state: RedirectErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RedirectErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Error caught in RedirectErrorBoundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return <Redirect to={this.props.to} />;
    }
    return this.props.children;
  }
}
