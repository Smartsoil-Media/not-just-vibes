import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  label?: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Component-local error boundary. Catches render-time crashes in a single
 * panel so a bug in the tutor doesn't take down the editor (or vice-versa).
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.label ?? 'panel'}] render crash`, error, info);
  }

  reset = () => this.setState({ error: null });

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-xs">
        <div className="font-medium text-destructive">
          {this.props.label ?? 'This panel'} crashed.
        </div>
        <div className="max-w-sm whitespace-pre-wrap text-muted-foreground">
          {this.state.error.message}
        </div>
        <button
          type="button"
          onClick={this.reset}
          className="mt-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:bg-secondary"
        >
          Retry
        </button>
      </div>
    );
  }
}
