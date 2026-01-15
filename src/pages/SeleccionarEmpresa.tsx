import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, LogOut } from "lucide-react";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

const SeleccionarEmpresa = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { empresas, isLoading, hasEmpresas } = useEmpresas();
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [mes, setMes] = useState(MESES[new Date().getMonth()]);
  const [anio, setAnio] = useState(currentYear.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to create empresa if user has no empresas
  useEffect(() => {
    if (!isLoading && hasEmpresas === false) {
      navigate("/crear-empresa");
    }
  }, [isLoading, hasEmpresas, navigate]);

  const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId);

  const handleContinue = async () => {
    if (!selectedEmpresa || !user) {
      toast.error("Por favor seleccione una empresa");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check or create periodo
      const mesIndex = MESES.indexOf(mes) + 1;
      
      const { data: existingPeriodos, error: fetchError } = await supabase
        .from("periodos_nomina")
        .select("*")
        .eq("empresa_id", selectedEmpresa.id)
        .eq("mes", mesIndex)
        .eq("anio", parseInt(anio));

      if (fetchError) {
        console.error("Error fetching periodo:", fetchError);
        toast.error("Error al verificar el período de nómina");
        return;
      }

      let periodo = existingPeriodos && existingPeriodos.length > 0 ? existingPeriodos[0] : null;

      if (!periodo) {
        // Create new periodo
        const { data: newPeriodo, error: periodoError } = await supabase
          .from("periodos_nomina")
          .insert({
            empresa_id: selectedEmpresa.id,
            user_id: user.id,
            mes: mesIndex,
            anio: parseInt(anio),
            dias_mes: 30
          })
          .select()
          .single();

        if (periodoError) {
          console.error("Error creating periodo:", periodoError);
          toast.error("Error al crear el período de nómina");
          return;
        }
        
        periodo = newPeriodo;
      }

      // Store empresa data in sessionStorage for the app
      const empresaData = {
        empresaId: selectedEmpresa.id,
        empresa: selectedEmpresa.nombre,
        ruc: selectedEmpresa.ruc,
        mes,
        anio: parseInt(anio),
        fechaCorte: periodo?.fecha_corte || new Date().toISOString().split("T")[0],
        diasMes: periodo?.dias_mes || 30,
        logoUrl: selectedEmpresa.logo_url
      };

      sessionStorage.setItem("empresaData", JSON.stringify(empresaData));
      
      // Verify the data was stored correctly
      const storedData = sessionStorage.getItem("empresaData");
      if (!storedData) {
        console.error("Failed to store empresaData in sessionStorage");
        toast.error("Error al guardar los datos de la empresa");
        return;
      }

      navigate("/app");
    } catch (error) {
      console.error("Error in handleContinue:", error);
      toast.error("Error al seleccionar la empresa");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem("empresaData");
    await signOut();
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando empresas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left section - Context */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 border-r border-border">
        <div>
          <h1 className="text-5xl font-light tracking-tight">Bienvenido de vuelta</h1>
        </div>
        <div className="space-y-8">
          <p className="text-lg text-muted-foreground font-light leading-relaxed max-w-md">
            Seleccione la empresa con la que desea trabajar y el período de nómina
          </p>
          <div className="h-px w-24 bg-border" />
          <div>
            <p className="text-sm text-muted-foreground">Empresas registradas</p>
            <p className="text-3xl font-bold mt-1">{empresas.length}</p>
          </div>
        </div>
      </div>

      {/* Right section - Selection */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-24 overflow-y-auto py-12">
        <div className="w-full max-w-md mx-auto space-y-12">
          <div className="space-y-3">
            <h2 className="text-3xl font-light tracking-tight">Seleccionar Empresa</h2>
            <p className="text-sm text-muted-foreground">
              {empresas.length > 0 
                ? `Tiene ${empresas.length} empresa${empresas.length !== 1 ? "s" : ""} registrada${empresas.length !== 1 ? "s" : ""}`
                : "Aún no tiene empresas registradas"
              }
            </p>
          </div>

          <div className="space-y-8">
            {empresas.length > 0 ? (
              <>
                {/* Empresa selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Empresa
                  </label>
                  <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                    <SelectTrigger className="h-14 border-0 border-b border-border rounded-none bg-transparent px-0 focus:ring-0">
                      <SelectValue placeholder="Seleccione una empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          <div className="flex items-center gap-3">
                            {empresa.logo_url ? (
                              <img 
                                src={empresa.logo_url} 
                                alt={empresa.nombre}
                                className="w-6 h-6 object-contain rounded"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {empresa.nombre.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{empresa.nombre}</span>
                              <span className="text-xs text-muted-foreground">RUC: {empresa.ruc}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Company Preview */}
                {selectedEmpresa && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-4">
                      {selectedEmpresa.logo_url ? (
                        <img 
                          src={selectedEmpresa.logo_url} 
                          alt={selectedEmpresa.nombre}
                          className="w-12 h-12 object-contain rounded-lg bg-white p-1"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-foreground/10 rounded-lg flex items-center justify-center">
                          <span className="text-xl font-bold">
                            {selectedEmpresa.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{selectedEmpresa.nombre}</p>
                        <p className="text-sm text-muted-foreground">RUC: {selectedEmpresa.ruc}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Period selectors */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Mes
                    </label>
                    <Select value={mes} onValueChange={setMes}>
                      <SelectTrigger className="h-12 border-0 border-b border-border rounded-none bg-transparent px-0 focus:ring-0">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        {MESES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Año
                    </label>
                    <Select value={anio} onValueChange={setAnio}>
                      <SelectTrigger className="h-12 border-0 border-b border-border rounded-none bg-transparent px-0 focus:ring-0">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 space-y-4">
                  <Button
                    onClick={handleContinue}
                    className="w-full h-12 rounded-none font-medium"
                    disabled={!selectedEmpresaId || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      "Continuar"
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Link
                      to="/crear-empresa"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Crear nueva empresa
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              /* No empresas - show create button */
              <div className="pt-4 space-y-6">
                <p className="text-muted-foreground text-center">
                  Para comenzar a usar el sistema, primero debe crear una empresa.
                </p>
                <Link to="/crear-empresa">
                  <Button className="w-full h-12 rounded-none font-medium">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear mi primera empresa
                  </Button>
                </Link>
              </div>
            )}

            <div className="h-px w-full bg-border my-4" />

            <button
              onClick={handleLogout}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeleccionarEmpresa;
