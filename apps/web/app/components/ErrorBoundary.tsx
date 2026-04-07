"use client";
import React, { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container page-section" style={{ textAlign: "center", paddingTop: "6rem" }}>
          <div className="glass-panel" style={{ maxWidth: 520, margin: "0 auto", padding: "3rem 2rem" }}>
            <h2 style={{ marginBottom: "1rem" }}>Something went wrong</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              className="btn"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
