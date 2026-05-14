import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border rounded-lg shadow-sm p-6 space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Algo deu errado</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Ocorreu um erro inesperado nesta página. Você pode tentar recarregar.
            </p>
          </div>
          {this.state.error?.message && (
            <pre className="text-xs bg-muted rounded px-3 py-2 overflow-x-auto text-left">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={this.reset}>
              Tentar novamente
            </Button>
            <Button size="sm" onClick={() => window.location.reload()} className="gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Recarregar página
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
