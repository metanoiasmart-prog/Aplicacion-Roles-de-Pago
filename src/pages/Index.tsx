import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NominaModule from "@/components/nomina/NominaModule";
import RolPagosModule from "@/components/nomina/RolPagosModule";
import RolEmpleadoModule from "@/components/nomina/RolEmpleadoModule";
import { DatosConfig, Empleado, RolPagosRow } from "@/types/nomina";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEmpleados } from "@/hooks/useEmpleados";
import { Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import { calcularRolPagosConDecimos } from "@/utils/calculosNomina";

const SALARIO_BASICO_UNIFICADO = 470;
const LOADING_TIMEOUT_MS = 15000;

type LoadingState = "loading" | "ready" | "error" | "redirecting" | "timeout";

const Index = () => {
  const navigate = useNavigate();
  const { signOut, loading: authLoading } = useAuth();
  const [datos, setDatos] = useState<DatosConfig | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"nomina" | "rol" | "rolEmpleado">("nomina");
  const [rolPagos, setRolPagos] = useState<Record<string, RolPagosRow>>({});
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const hasInitialized = useRef(false);

  // Use the custom hook for employee management
  const {
    empleados,
    isLoading: empleadosLoading,
    createEmpleado,
    updateEmpleado,
    deleteEmpleado,
    updateEmpleadoLocal,
    setEmpleadosLocal
  } = useEmpleados(empresaId);

  // Timeout handler for loading states
  useEffect(() => {
    if (loadingState !== "loading") return;

    const timer = setTimeout(() => {
      if (loadingState === "loading") {
        console.error("Index loading timed out");
        setLoadingState("timeout");
        setErrorMessage("La carga está tardando demasiado. Por favor, intente nuevamente.");
      }
    }, LOADING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [loadingState]);

  // Load empresa data from sessionStorage
  useEffect(() => {
    // Prevent double initialization
    if (hasInitialized.current) return;
    
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    hasInitialized.current = true;

    try {
      const empresaData = sessionStorage.getItem("empresaData");
      
      if (!empresaData) {
        console.log("No empresaData found, redirecting to seleccionar-empresa");
        setLoadingState("redirecting");
        navigate("/seleccionar-empresa", { replace: true });
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(empresaData);
      } catch (parseError) {
        console.error("Error parsing empresaData JSON:", parseError);
        sessionStorage.removeItem("empresaData");
        setErrorMessage("Datos de empresa corruptos. Seleccione una empresa nuevamente.");
        setLoadingState("error");
        return;
      }
      
      // Validate required fields
      if (!parsed.empresaId || !parsed.empresa) {
        console.error("Invalid empresaData - missing required fields:", parsed);
        sessionStorage.removeItem("empresaData");
        setErrorMessage("Datos de empresa incompletos. Seleccione una empresa nuevamente.");
        setLoadingState("error");
        return;
      }

      setEmpresaId(parsed.empresaId || null);
      setLogoUrl(parsed.logoUrl || null);
      setDatos({
        id: "1",
        empresa: parsed.empresa,
        ruc: parsed.ruc || "",
        mes: parsed.mes || "Enero",
        anio: parsed.anio || new Date().getFullYear(),
        fechaCorte: parsed.fechaCorte || new Date().toISOString().split("T")[0],
        diasMes: parsed.diasMes || 30,
        logoUrl: parsed.logoUrl || null
      });
      setLoadingState("ready");
    } catch (error) {
      console.error("Error loading empresaData:", error);
      sessionStorage.removeItem("empresaData");
      setErrorMessage("Error al cargar los datos de la empresa.");
      setLoadingState("error");
    }
  }, [navigate, authLoading]);

  // Initialize and update rol pagos when employees change
  useEffect(() => {
    if (!datos) return;
    const empleadosActivos = empleados.filter(e => e.activo);
    const updatedRol: Record<string, RolPagosRow> = {};
    empleadosActivos.forEach(emp => {
      if (!rolPagos[emp.id]) {
        const baseRow: RolPagosRow = {
          empleadoId: emp.id,
          diasMes: datos.diasMes,
          sueldoNominal: emp.sueldoNominal,
          salarioBasicoUnificado: SALARIO_BASICO_UNIFICADO,
          // Datos del empleado (entrada)
          diasNoTrabajados: 0,
          diasPermisoMedico: 0,
          // Ingresos editables (entrada)
          horas50: 0,
          horas100: 0,
          bonificacion: 0,
          viaticos: 0,
          // Ingresos calculados
          valorDia: 0,
          descuentoDiasNoTrabajados: 0,
          descuentoPermisoMedico: 0,
          diasTrabajados: 30,
          sueldoGanado: 0,
          valorHoraOrdinaria: 0,
          valorHoras50: 0,
          valorHoras100: 0,
          decimoTerceroMensualizado: 0,
          decimoCuartoMensualizado: 0,
          totalIngresos: 0,
          totalGanado: 0,
          // Descuentos editables (entrada)
          prestamosEmpleado: 0,
          anticipoSueldo: 0,
          aportePersonalManual: 0,
          otrosDescuentos: 0,
          prestamosIess: 0,
          // Descuentos calculados
          aporte945: 0,
          totalDescuentos: 0,
          // Liquidación
          subtotal: 0,
          valorFondoReserva: 0,
          depositoIess: 0,
          netoRecibir: 0
        };
        updatedRol[emp.id] = calcularRolPagosConDecimos(emp, baseRow, emp.mensualizaDecimos);
      } else {
        updatedRol[emp.id] = calcularRolPagosConDecimos(emp, rolPagos[emp.id], emp.mensualizaDecimos);
      }
    });
    setRolPagos(updatedRol);
  }, [empleados, datos]);

  const handleUpdateRolPagos = (newRolPagos: Record<string, RolPagosRow>) => {
    setRolPagos(newRolPagos);
  };

  const handleLogout = async () => {
    sessionStorage.removeItem("empresaData");
    await signOut();
    navigate("/");
  };

  const handleAddEmpleado = async () => {
    const newEmpleado = {
      nombreCompleto: "",
      cargo: "",
      fechaIngreso: new Date().toISOString().split("T")[0],
      sueldoNominal: 470,
      cedula: "",
      activo: true,
      mensualizaDecimos: false,
      ganaFondoReserva: false,
      historicoSueldos: [],
      historicoLaboral: []
    };
    await createEmpleado(newEmpleado);
  };

  // Handler for NominaModule updates
  const handleEmpleadosUpdate = async (updatedEmpleados: Empleado[]) => {
    // Find what changed
    for (const updated of updatedEmpleados) {
      const original = empleados.find(e => e.id === updated.id);
      if (!original) continue;

      // Check if DB fields changed
      const dbFieldsChanged = original.nombreCompleto !== updated.nombreCompleto || original.cargo !== updated.cargo || original.cedula !== updated.cedula || original.sueldoNominal !== updated.sueldoNominal || original.fechaIngreso !== updated.fechaIngreso || original.activo !== updated.activo;
      if (dbFieldsChanged) {
        await updateEmpleado(updated.id, {
          nombreCompleto: updated.nombreCompleto,
          cargo: updated.cargo,
          cedula: updated.cedula,
          sueldoNominal: updated.sueldoNominal,
          fechaIngreso: updated.fechaIngreso,
          activo: updated.activo
        });
      }

      // Update local-only fields
      const localFieldsChanged = original.mensualizaDecimos !== updated.mensualizaDecimos || original.ganaFondoReserva !== updated.ganaFondoReserva || original.fechaSalida !== updated.fechaSalida || JSON.stringify(original.historicoSueldos) !== JSON.stringify(updated.historicoSueldos) || JSON.stringify(original.historicoLaboral) !== JSON.stringify(updated.historicoLaboral);
      if (localFieldsChanged) {
        updateEmpleadoLocal(updated.id, {
          mensualizaDecimos: updated.mensualizaDecimos,
          ganaFondoReserva: updated.ganaFondoReserva,
          fechaSalida: updated.fechaSalida,
          historicoSueldos: updated.historicoSueldos,
          historicoLaboral: updated.historicoLaboral
        });
      }
    }

    // Handle deletions
    const deletedIds = empleados.filter(e => !updatedEmpleados.find(u => u.id === e.id)).map(e => e.id);
    for (const id of deletedIds) {
      await deleteEmpleado(id);
    }
  };

  const handleRetryOrRedirect = () => {
    sessionStorage.removeItem("empresaData");
    navigate("/seleccionar-empresa", { replace: true });
  };

  // Loading state - show spinner
  if (loadingState === "loading" || loadingState === "redirecting" || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">
            {loadingState === "redirecting" ? "Redirigiendo..." : "Cargando aplicación..."}
          </span>
        </div>
      </div>
    );
  }

  // Timeout state - show error with retry
  if (loadingState === "timeout") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Tiempo de espera agotado</h2>
          <p className="text-muted-foreground">{errorMessage}</p>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Reintentar
            </Button>
            <Button onClick={handleRetryOrRedirect}>
              Seleccionar empresa
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error state - show error with retry
  if (loadingState === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Error al cargar</h2>
          <p className="text-muted-foreground">{errorMessage}</p>
          <Button onClick={handleRetryOrRedirect} className="mt-4">
            Seleccionar empresa
          </Button>
        </div>
      </div>
    );
  }

  // Safety check - should never happen after loading is complete
  if (!datos) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Sin datos de empresa</h2>
          <p className="text-muted-foreground">No se encontraron datos de la empresa seleccionada.</p>
          <Button onClick={handleRetryOrRedirect} className="mt-4">
            Seleccionar empresa
          </Button>
        </div>
      </div>
    );
  }

  // Loading employees
  if (empleadosLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando empleados...</span>
        </div>
      </div>
    );
  }

  const canAccessRol = empleados.filter(e => e.activo).length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Fixed top bar */}
      <header className="h-14 border-b border-border flex-shrink-0">
        <div className="h-full flex items-center justify-between px-8">
          {/* Left - Logo and Company info */}
          <div className="flex items-center gap-4">
            {/* Company Logo */}
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt={datos.empresa}
                className="h-8 w-auto max-w-[120px] object-contain"
              />
            )}
            <div className="flex items-center gap-8">
              <div>
                <span className="text-sm font-medium">{datos.empresa}</span>
                <span className="text-muted-foreground mx-3">·</span>
                <span className="text-sm text-muted-foreground">{datos.ruc}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <span className="text-sm text-muted-foreground">{datos.mes} {datos.anio}</span>
            </div>
          </div>

          {/* Right - Navigation */}
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-1">
              <button onClick={() => setActiveTab("nomina")} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "nomina" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Nómina
              </button>
              <button onClick={() => setActiveTab("rol")} disabled={!canAccessRol} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "rol" ? "text-foreground" : "text-muted-foreground hover:text-foreground"} disabled:opacity-40 disabled:cursor-not-allowed`}>
                Rol de Pagos
              </button>
              <button onClick={() => setActiveTab("rolEmpleado")} disabled={!canAccessRol} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "rolEmpleado" ? "text-foreground" : "text-muted-foreground hover:text-foreground"} disabled:opacity-40 disabled:cursor-not-allowed`}>
                Rol por Empleado
              </button>
            </nav>
            <div className="h-4 w-px bg-border" />
            <button onClick={handleLogout} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main content area with horizontal scroll */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="min-h-full flex">
          {activeTab === "nomina" && (
            <>
              {/* Left panel - Section title (sticky) */}
              <section className="w-80 flex-shrink-0 border-r border-border p-8 sticky left-0 top-0 h-[calc(100vh-3.5rem)] bg-background z-20">
                <div className="flex flex-col h-full">
                  <div>
                    <h1 className="text-2xl tracking-tight mb-2 font-bold">Base de Datos</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Gestione la información de cada empleado en el sistema
                    </p>
                  </div>
                  <div className="mt-auto space-y-4">
                    <div className="h-px w-full bg-border my-[7px]" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Total empleados
                      </span>
                      <span className="text-2xl font-light">{empleados.length}</span>
                    </div>
                    <Button onClick={handleAddEmpleado} className="w-full h-10 rounded-none font-medium">
                      Nuevo Empleado
                    </Button>
                  </div>
                </div>
              </section>

              {/* Right panel - Table */}
              <section className="flex-1 min-w-0">
                <NominaModule empleados={empleados} onUpdate={handleEmpleadosUpdate} empresa={datos.empresa} />
              </section>
            </>
          )}

          {activeTab === "rol" && (
            <>
              {/* Left panel - Section title (sticky) */}
              <section className="w-80 flex-shrink-0 border-r border-border p-8 sticky left-0 top-0 h-[calc(100vh-3.5rem)] bg-background z-20">
                <div className="flex flex-col h-full">
                  <div>
                    <h1 className="text-2xl tracking-tight mb-2 font-bold">Rol de Pagos</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Cálculo mensual de ingresos, descuentos y liquidación
                    </p>
                  </div>
                  <div className="mt-auto space-y-4">
                    <div className="h-px w-full bg-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Empleados activos
                      </span>
                      <span className="text-2xl font-semibold">{empleados.filter(e => e.activo).length}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Right panel - Rol table */}
              <section className="flex-1 min-w-0">
                <RolPagosModule empleados={empleados} datos={datos} rolPagos={rolPagos} onUpdateRolPagos={handleUpdateRolPagos} />
              </section>
            </>
          )}

          {activeTab === "rolEmpleado" && (
            <>
              {/* Left panel - Section title (sticky) */}
              <section className="w-80 flex-shrink-0 border-r border-border p-8 sticky left-0 top-0 h-[calc(100vh-3.5rem)] bg-background z-20">
                <div className="flex flex-col h-full">
                  <div>
                    <h1 className="text-2xl tracking-tight mb-2 font-bold">Rol por Empleado</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Consulta y descarga del rol de pagos individual
                    </p>
                  </div>
                  <div className="mt-auto space-y-4">
                    <div className="h-px w-full bg-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Empleados activos
                      </span>
                      <span className="text-2xl font-light">{empleados.filter(e => e.activo).length}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Right panel - Employee list */}
              <section className="flex-1 min-w-0">
                <RolEmpleadoModule empleados={empleados} datos={datos} rolPagos={rolPagos} />
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
