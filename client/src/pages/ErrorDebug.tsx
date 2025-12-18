import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface ErrorEntry {
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
}

export default function ErrorDebugPage() {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [globalErrors, setGlobalErrors] = useState<ErrorEntry[]>([]);

  // Query server error logs
  const { data: serverErrors, refetch } = trpc.errorViewer.getErrors.useQuery();

  // Capture global errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setGlobalErrors(prev => [...prev, {
        timestamp: new Date().toISOString(),
        type: 'global',
        message: event.message,
        stack: event.error?.stack
      }]);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setGlobalErrors(prev => [...prev, {
        timestamp: new Date().toISOString(),
        type: 'unhandledRejection',
        message: String(event.reason),
        stack: event.reason?.stack
      }]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Test mutation
  const generateMutation = trpc.insights.generate.useMutation({
    onSuccess: (data) => {
      setErrors(prev => [...prev, {
        timestamp: new Date().toISOString(),
        type: 'success',
        message: `Generated insight ${data.insightId}`
      }]);
    },
    onError: (error) => {
      setErrors(prev => [...prev, {
        timestamp: new Date().toISOString(),
        type: 'mutation_error',
        message: error.message,
        stack: error.stack
      }]);
    }
  });

  return (
    <div className="container py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Error Debug Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button 
              onClick={() => {
                try {
                  console.log('[ErrorDebug] Calling mutation...');
                  generateMutation.mutate({ bookId: 1 });
                } catch (e) {
                  setErrors(prev => [...prev, {
                    timestamp: new Date().toISOString(),
                    type: 'catch',
                    message: e instanceof Error ? e.message : String(e),
                    stack: e instanceof Error ? e.stack : undefined
                  }]);
                }
              }}
              disabled={generateMutation.isPending}
            >
              Test Generate Mutation
            </Button>
            <Button 
              onClick={() => refetch()}
              variant="outline"
              className="ml-2"
            >
              Refresh Server Errors
            </Button>
          </div>

          {/* Global Errors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Global Errors ({globalErrors.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {globalErrors.length === 0 ? (
                <p className="text-muted-foreground">No global errors</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {globalErrors.map((error, i) => (
                    <div key={i} className="border p-3 rounded text-sm">
                      <div className="font-mono text-xs text-muted-foreground">{error.timestamp}</div>
                      <div className="font-semibold text-red-600">{error.type}</div>
                      <div className="mt-1">{error.message}</div>
                      {error.stack && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                          {error.stack}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mutation Errors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mutation Errors ({errors.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {errors.length === 0 ? (
                <p className="text-muted-foreground">No mutation errors</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {errors.map((error, i) => (
                    <div key={i} className="border p-3 rounded text-sm">
                      <div className="font-mono text-xs text-muted-foreground">{error.timestamp}</div>
                      <div className="font-semibold text-red-600">{error.type}</div>
                      <div className="mt-1">{error.message}</div>
                      {error.stack && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                          {error.stack}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Server Errors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Server Errors ({serverErrors?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {!serverErrors || serverErrors.length === 0 ? (
                <p className="text-muted-foreground">No server errors</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {serverErrors.map((error, i) => (
                    <div key={i} className="border p-3 rounded text-sm">
                      <div className="font-mono text-xs text-muted-foreground">{error.timestamp}</div>
                      <div className="font-semibold text-red-600">{error.errorType}</div>
                      <div className="mt-1">{error.errorMessage}</div>
                      {error.errorStack && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                          {error.errorStack}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
