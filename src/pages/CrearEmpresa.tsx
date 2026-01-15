import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Upload, X, Building2 } from "lucide-react";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({
  length: 10
}, (_, i) => currentYear - 5 + i);

const CrearEmpresa = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [empresa, setEmpresa] = useState("");
  const [ruc, setRuc] = useState("");
  const [mes, setMes] = useState(MESES[new Date().getMonth()]);
  const [anio, setAnio] = useState(currentYear.toString());
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const isFormComplete = empresa.trim() !== "" && ruc.trim() !== "" && mes !== "" && anio !== "" && fechaCorte !== "";

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error("Solo se permiten archivos JPG o PNG");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo no debe exceder 5MB");
      return;
    }

    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const uploadLogo = async (empresaId: string): Promise<string | null> => {
    if (!logoFile || !user) return null;

    setIsUploadingLogo(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}/${empresaId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error("Error uploading logo:", uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading logo:", error);
      return null;
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete || !user) return;

    setIsLoading(true);
    try {
      // Create empresa
      const { data, error } = await supabase
        .from("empresas")
        .insert({
          nombre: empresa.trim(),
          ruc: ruc.trim(),
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("Ya existe una empresa con este RUC");
        } else {
          toast.error("Error al crear la empresa: " + error.message);
        }
        return;
      }

      // Upload logo if exists
      let logoUrl: string | null = null;
      if (logoFile) {
        logoUrl = await uploadLogo(data.id);
        
        if (logoUrl) {
          // Update empresa with logo URL
          await supabase
            .from("empresas")
            .update({ logo_url: logoUrl })
            .eq("id", data.id);
        }
      }

      // Create periodo de nómina
      const mesIndex = MESES.indexOf(mes) + 1;
      const { error: periodoError } = await supabase
        .from("periodos_nomina")
        .insert({
          empresa_id: data.id,
          user_id: user.id,
          mes: mesIndex,
          anio: parseInt(anio),
          fecha_corte: fechaCorte,
          dias_mes: 30
        });

      if (periodoError) {
        console.error("Error creating periodo:", periodoError);
      }

      // Guardar datos del período en sessionStorage para uso en la app
      sessionStorage.setItem("empresaData", JSON.stringify({
        empresaId: data.id,
        empresa: data.nombre,
        ruc: data.ruc,
        mes,
        anio: parseInt(anio),
        fechaCorte,
        diasMes: 30,
        logoUrl
      }));

      toast.success("Empresa creada exitosamente");
      navigate("/app");
    } catch (error) {
      toast.error("Error inesperado al crear la empresa");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left section - Context */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 border-r border-border">
        <div>
          <h1 className="text-5xl font-light tracking-tight">Configuración de Parámetros Básicos</h1>
        </div>
        <div className="space-y-8">
          <p className="text-lg text-muted-foreground font-light leading-relaxed max-w-md">
            Complete los datos de la empresa y el período de nómina para comenzar
          </p>
          <div className="h-px w-24 bg-border" />
        </div>
      </div>

      {/* Right section - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-24 overflow-y-auto py-12">
        <div className="w-full max-w-md mx-auto space-y-12">
          <div className="space-y-3">
            <h2 className="text-3xl font-light tracking-tight">Nueva Empresa</h2>
            <p className="text-sm text-muted-foreground">
              Defina los parámetros del período
            </p>
          </div>

          <form onSubmit={handleContinue} className="space-y-8">
            <div className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Logotipo de la Empresa (Opcional)
                </Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-20 h-20 object-contain border rounded-lg bg-white"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-foreground/50 transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">Subir</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                  )}
                  <div className="text-xs text-muted-foreground">
                    <p>Formatos: JPG, PNG</p>
                    <p>Tamaño máximo: 5MB</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="empresa" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Nombre de Empresa
                </label>
                <Input id="empresa" value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ingrese el nombre" className="h-12 border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground transition-colors" required />
              </div>

              <div className="space-y-2">
                <label htmlFor="ruc" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  RUC
                </label>
                <Input id="ruc" value={ruc} onChange={e => setRuc(e.target.value)} placeholder="0000000000001" className="h-12 border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground transition-colors" maxLength={13} required />
              </div>

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
                      {MESES.map(m => <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>)}
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
                      {YEARS.map(y => <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="fechaCorte" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fecha de Corte
                </label>
                <Input id="fechaCorte" type="date" value={fechaCorte} onChange={e => setFechaCorte(e.target.value)} className="h-12 border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground transition-colors" required />
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <Button 
                type="submit" 
                className="w-full h-12 rounded-none font-medium" 
                disabled={!isFormComplete || isLoading || isUploadingLogo}
              >
                {isLoading || isUploadingLogo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploadingLogo ? "Subiendo logo..." : "Guardando..."}
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>

              <div className="flex items-center justify-center pt-2">
                <Link
                  to="/seleccionar-empresa"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  ¿Ya tienes una empresa? Selecciónala aquí
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CrearEmpresa;
