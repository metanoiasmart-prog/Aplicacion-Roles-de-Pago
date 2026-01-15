import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEmpresas } from "@/hooks/useEmpresas";
import { z } from "zod";
import { Loader2, AlertCircle, RefreshCcw } from "lucide-react";

const emailSchema = z.string().email("Ingrese un correo electrónico válido");
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres");

// Maximum time to wait for auth + empresas loading
const LOADING_TIMEOUT_MS = 20000;

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading } = useAuth();
  const { hasEmpresas, isLoading: loadingEmpresas, error: empresasError } = useEmpresas();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    fullName?: string;
  }>({});

  // Track if we've already redirected to prevent multiple redirects
  const hasRedirected = useRef(false);

  // Handle timeout for loading states
  useEffect(() => {
    if (!loading && !(user && loadingEmpresas)) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      if (loading || (user && loadingEmpresas)) {
        console.error("Auth/Empresas loading timed out");
        setTimedOut(true);
      }
    }, LOADING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [loading, user, loadingEmpresas]);

  // Handle navigation after successful auth
  useEffect(() => {
    // Don't do anything if still loading
    if (loading || loadingEmpresas) return;
    
    // Don't redirect again if we already did
    if (hasRedirected.current) return;
    
    // Only proceed if user exists
    if (!user) return;

    hasRedirected.current = true;

    // Check if email is verified
    if (!user.email_confirmed_at) {
      navigate("/verify-email", { replace: true });
    } else {
      // Always go to seleccionar-empresa first
      navigate("/seleccionar-empresa", { replace: true });
    }
  }, [user, loading, loadingEmpresas, navigate]);

  // Reset redirect flag when user changes
  useEffect(() => {
    if (!user) {
      hasRedirected.current = false;
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
      fullName?: string;
    } = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    if (!isLogin && !fullName.trim()) {
      newErrors.fullName = "El nombre es requerido";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Error de autenticación",
              description: "Credenciales inválidas. Verifique su correo y contraseña.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Bienvenido",
            description: "Sesión iniciada correctamente"
          });
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              title: "Usuario existente",
              description: "Este correo ya está registrado. Intente iniciar sesión.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive"
            });
          }
        } else {
          // Redirect to verify email page without toast notification
          navigate("/verify-email", { replace: true });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Timeout error state
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
              Tiempo de espera agotado
            </h1>
            <p className="text-muted-foreground text-sm">
              La carga está tardando demasiado. Esto puede deberse a problemas de conexión.
            </p>
          </div>

          <Button
            onClick={() => window.location.reload()}
            className="w-full gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // Show loading only if auth is still loading, or if user exists but we're loading empresas
  if (loading || (user && loadingEmpresas && !hasRedirected.current)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Cargando...</span>
        </div>
      </div>
    );
  }

  // If user is already logged in and we haven't redirected yet, wait
  if (user && !hasRedirected.current) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Redirigiendo...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left section - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 border-r border-border">
        <div>
          <h1 className="text-5xl tracking-tight font-bold">Sistema de Gestión de Nómina</h1>
        </div>
        <div className="space-y-8">
          <p className="text-lg text-muted-foreground font-light leading-relaxed max-w-md">
            Esta aplicación fue creada con el fin de gestionar de manera eficiente y rápida el rol de pagos y nómina para su empresa
          </p>
          <div className="h-px w-24 bg-border" />
        </div>
      </div>

      {/* Right section - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-24">
        <div className="w-full max-w-sm mx-auto space-y-12">
          <div className="space-y-3">
            <h2 className="text-3xl tracking-tight font-semibold">
              {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Ingrese sus credenciales para continuar" : "Complete los datos para registrarse"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Nombre Completo
                  </label>
                  <Input 
                    id="fullName" 
                    type="text" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    placeholder="Juan Pérez" 
                    className="h-12 border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground transition-colors" 
                  />
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Correo Electrónico
                </label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="correo@ejemplo.com" 
                  className="h-12 border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground transition-colors" 
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Contraseña
                </label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="h-12 border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground transition-colors" 
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <Button type="submit" className="w-full h-12 rounded-none font-medium" disabled={isSubmitting}>
                {isSubmitting ? "Procesando..." : isLogin ? "Ingresar" : "Crear Cuenta"}
              </Button>
              
              <button 
                type="button" 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }} 
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isLogin ? "¿No tiene cuenta? Regístrese aquí" : "¿Ya tiene cuenta? Inicie sesión"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
