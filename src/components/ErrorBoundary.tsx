import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Report to error tracking service (Sentry, LogRocket, etc.)
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, { extra: errorInfo });
    // }
    
    toast.error('Ha ocurrido un error inesperado', {
      description: 'La aplicación se reiniciará automáticamente',
      duration: 5000,
    });
  }

  private resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetErrorBoundary={this.resetErrorBoundary} />;
      }

      return (
        <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 size-16 rounded-[28px] bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="size-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Algo salió mal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground text-sm">
                La aplicación ha encontrado un error inesperado. 
                Tus datos están a salvo guardados localmente.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="rounded-lg bg-muted/50 p-3 text-left">
                  <summary className="font-mono text-xs text-muted-foreground cursor-pointer">
                    Detalles técnicos (solo desarrollo)
                  </summary>
                  <pre className="mt-2 font-mono text-[10px] text-foreground overflow-auto max-h-40">
                    {this.state.error.name}: {this.state.error.message}
                    {this.state.error.stack && '\n\n' + this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={this.resetErrorBoundary}
                  className="w-full h-11 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow"
                  variant="default"
                >
                  <RefreshCw className="size-4 mr-2" />
                  Reintentar
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full h-11 rounded-2xl border border-border bg-background hover:bg-muted"
                  variant="outline"
                >
                  <Home className="size-4 mr-2" />
                  Recargar
                </Button>
              </div>
              
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Error: ${this.state.error?.name}: ${this.state.error?.message}\nStack: ${this.state.error?.stack}\nTime: ${new Date().toISOString()}\nUserAgent: ${navigator.userAgent}`
                  );
                  toast.success('Error copiado al portapapeles');
                }}
                className="w-full h-10 rounded-2xl border border-border bg-muted hover:bg-muted/80 text-xs"
                variant="outline"
              >
                <Bug className="size-3.5 mr-1.5" />
                Copiar detalles para soporte
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;