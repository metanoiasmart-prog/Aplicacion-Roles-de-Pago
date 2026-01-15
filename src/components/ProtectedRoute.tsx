import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
  requireEmailVerification?: boolean;
}

// Maximum time to wait for auth to load before showing error
const AUTH_TIMEOUT_MS = 15000;

const ProtectedRoute = ({ children, requireEmailVerification = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);
  const [showDelayMessage, setShowDelayMessage] = useState(false);

  // Handle loading timeout to prevent infinite loading state
  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      setShowDelayMessage(false);
      return;
    }

    // Show delay message after 3 seconds
    const delayTimer = setTimeout(() => {
      if (loading) {
        setShowDelayMessage(true);
      }
    }, 3000);

    // Set timeout for loading state
    const timeoutTimer = setTimeout(() => {
      if (loading) {
        console.error("Auth loading timed out after", AUTH_TIMEOUT_MS, "ms");
        setTimedOut(true);
      }
    }, AUTH_TIMEOUT_MS);

    return () => {
      clearTimeout(delayTimer);
      clearTimeout(timeoutTimer);
    };
  }, [loading]);

  // Timeout state - show error with retry option
  if (timedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">
              Error de conexión
            </h1>
            <p className="text-muted-foreground text-sm">
              No se pudo verificar su sesión. Esto puede deberse a problemas de conexión o del servidor.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Reintentar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                sessionStorage.removeItem("empresaData");
                window.location.href = "/auth";
              }}
              className="w-full"
            >
              Ir a iniciar sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state with better feedback
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <span className="text-muted-foreground">Verificando sesión...</span>
            {showDelayMessage && (
              <p className="text-xs text-muted-foreground/70 mt-2">
                Esto está tardando más de lo esperado...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to auth
  if (!user) {
    // Clear any stale session data
    sessionStorage.removeItem("empresaData");
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if email verification is required and not verified
  if (requireEmailVerification && !user.email_confirmed_at) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
