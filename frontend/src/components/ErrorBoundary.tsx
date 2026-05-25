import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
          <AlertTriangle size={48} className="mb-4 text-red-400" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Something went wrong
          </h2>
          <p className="mb-6 max-w-md text-sm text-gray-500 dark:text-gray-400">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button variant="primary" onClick={this.handleReset}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
