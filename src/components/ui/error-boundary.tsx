"use client";

import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-red-500/20 bg-red-500/5 text-center my-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3 text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100 mb-1">
            Component Error
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-4">
            {this.state.error?.message || "An unexpected error occurred while rendering this section."}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={this.resetError}
            className="border-[#1c1c2e] hover:bg-violet-500/10 hover:text-violet-400 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
