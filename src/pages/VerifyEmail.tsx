import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, RefreshCw, CheckCircle } from "lucide-react";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Check if email is already verified
    if (user?.email_confirmed_at) {
      setEmailVerified(true);
      setTimeout(() => {
        navigate("/crear-empresa");
      }, 1500);
    }
  }, [user, navigate]);

  // Listen for auth state changes (when user verifies email)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "USER_UPDATED" && session?.user?.email_confirmed_at) {
          setEmailVerified(true);
          toast.success("¡Correo verificado exitosamente!");
          setTimeout(() => {
            navigate("/crear-empresa");
          }, 1500);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleResendEmail = async () => {
    if (!user?.email) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/crear-empresa`
        }
      });

      if (error) {
        toast.error("Error al reenviar correo: " + error.message);
      } else {
        toast.success("Correo de verificación reenviado");
      }
    } catch (error) {
      toast.error("Error inesperado al reenviar correo");
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        toast.error("Error al verificar estado");
      } else if (data.user?.email_confirmed_at) {
        setEmailVerified(true);
        toast.success("¡Correo verificado!");
        setTimeout(() => {
          navigate("/crear-empresa");
        }, 1500);
      } else {
        toast.info("El correo aún no ha sido verificado");
      }
    } catch (error) {
      toast.error("Error al verificar");
    } finally {
      setIsChecking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (emailVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-semibold">¡Correo verificado!</h2>
          <p className="text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left section - Info */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 border-r border-border">
        <div>
          <h1 className="text-5xl tracking-tight font-bold">Verificación de Correo</h1>
        </div>
        <div className="space-y-8">
          <p className="text-lg text-muted-foreground font-light leading-relaxed max-w-md">
            Para garantizar la seguridad de su cuenta, necesitamos verificar su dirección de correo electrónico
          </p>
          <div className="h-px w-24 bg-border" />
        </div>
      </div>

      {/* Right section - Verification */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-24">
        <div className="w-full max-w-sm mx-auto space-y-12">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-muted-foreground" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl tracking-tight font-semibold">
                Verifique su correo
              </h2>
              <p className="text-sm text-muted-foreground">
                Hemos enviado un enlace de verificación a:
              </p>
              <p className="text-base font-medium">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                Por favor revise su bandeja de entrada y haga clic en el enlace de verificación para continuar.
              </p>
              <p className="text-xs text-muted-foreground">
                Si no encuentra el correo, revise su carpeta de spam.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleCheckVerification}
                className="w-full h-12 rounded-none font-medium"
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Ya verifiqué mi correo"
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleResendEmail}
                className="w-full h-12 rounded-none font-medium"
                disabled={isResending}
              >
                {isResending ? "Reenviando..." : "Reenviar correo de verificación"}
              </Button>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Usar otro correo electrónico
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
