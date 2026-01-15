import { useState, useRef } from "react";
import { Empleado, RolPagosRow, DatosConfig } from "@/types/nomina";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Eye } from "lucide-react";
import RolEmpleadoDocument from "./RolEmpleadoDocument";
interface RolEmpleadoModuleProps {
  empleados: Empleado[];
  datos: DatosConfig;
  rolPagos: Record<string, RolPagosRow>;
}
export default function RolEmpleadoModule({
  empleados,
  datos,
  rolPagos
}: RolEmpleadoModuleProps) {
  const empleadosActivos = empleados.filter(e => e.activo);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);
  const formatCurrency = (value: number) => {
    return `$ ${value.toFixed(2)}`;
  };
  const handleViewRol = (empleado: Empleado) => {
    setSelectedEmpleado(empleado);
    setIsDialogOpen(true);
  };
  const handleDownload = () => {
    if (!documentRef.current || !selectedEmpleado) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const content = documentRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rol de Pagos - ${selectedEmpleado.nombreCompleto}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: white;
            }
            .tabular-nums { font-variant-numeric: tabular-nums; }
            
            /* Spacing */
            .p-2 { padding: 0.5rem; }
            .p-3 { padding: 0.75rem; }
            .p-4 { padding: 1rem; }
            .p-6 { padding: 1.5rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .px-4 { padding-left: 1rem; padding-right: 1rem; }
            .px-10 { padding-left: 2.5rem; padding-right: 2.5rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
            .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
            .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
            .pt-3 { padding-top: 0.75rem; }
            .pt-4 { padding-top: 1rem; }
            .pt-6 { padding-top: 1.5rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-10 { margin-bottom: 2.5rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-12 { margin-top: 3rem; }
            .mt-16 { margin-top: 4rem; }
            .mx-4 { margin-left: 1rem; margin-right: 1rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .gap-2 { gap: 0.5rem; }
            .gap-4 { gap: 1rem; }
            .gap-6 { gap: 1.5rem; }
            .gap-16 { gap: 4rem; }
            
            /* Layout */
            .flex { display: flex; }
            .inline-block { display: inline-block; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
            .items-start { align-items: flex-start; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .flex-1 { flex: 1; }
            .divide-y > * + * { border-top: 1px solid #f1f5f9; }
            .overflow-hidden { overflow: hidden; }
            
            /* Typography */
            .text-xs { font-size: 0.75rem; line-height: 1rem; }
            .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
            .text-base { font-size: 1rem; line-height: 1.5rem; }
            .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
            .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
            .text-2xl { font-size: 1.5rem; line-height: 2rem; }
            .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
            .font-normal { font-weight: 400; }
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: 700; }
            .uppercase { text-transform: uppercase; }
            .tracking-wide { letter-spacing: 0.025em; }
            .tracking-wider { letter-spacing: 0.05em; }
            .tracking-widest { letter-spacing: 0.1em; }
            
            /* Colors */
            .text-white { color: white; }
            .text-gray-900 { color: #111827; }
            .text-slate-400 { color: #94a3b8; }
            .text-slate-500 { color: #64748b; }
            .text-slate-600 { color: #475569; }
            .text-slate-700 { color: #334155; }
            .text-slate-800 { color: #1e293b; }
            .text-emerald-300 { color: #6ee7b7; }
            .text-emerald-400 { color: #34d399; }
            .text-emerald-700 { color: #047857; }
            .text-emerald-800 { color: #065f46; }
            .text-rose-700 { color: #be123c; }
            .text-rose-800 { color: #9f1239; }
            
            .bg-white { background-color: white; }
            .bg-slate-50 { background-color: #f8fafc; }
            .bg-slate-100 { background-color: #f1f5f9; }
            .bg-slate-700 { background-color: #334155; }
            .bg-slate-800 { background-color: #1e293b; }
            .bg-emerald-50 { background-color: #ecfdf5; }
            .bg-emerald-600 { background-color: #059669; }
            .bg-rose-50 { background-color: #fff1f2; }
            .bg-rose-600 { background-color: #e11d48; }
            .bg-gradient-to-r { background: linear-gradient(to right, #1e293b, #334155); }
            .bg-white\\/10 { background-color: rgba(255,255,255,0.1); }
            
            /* Borders */
            .border { border: 1px solid; }
            .border-t { border-top-width: 1px; }
            .border-t-2 { border-top-width: 2px; }
            .border-b { border-bottom-width: 1px; }
            .border-b-4 { border-bottom-width: 4px; }
            .border-slate-200 { border-color: #e2e8f0; }
            .border-slate-800 { border-color: #1e293b; }
            .border-emerald-600 { border-color: #059669; }
            .border-rose-600 { border-color: #e11d48; }
            .rounded { border-radius: 0.25rem; }
            .rounded-lg { border-radius: 0.5rem; }
            
            /* Width/Height */
            .w-8 { width: 2rem; }
            .h-16 { height: 4rem; }
            .h-px { height: 1px; }
            .w-\\[210mm\\] { width: 210mm; }
            .min-h-\\[297mm\\] { min-height: 297mm; }
            
            @page {
              size: A4;
              margin: 0;
            }
            @media print {
              body { margin: 0; }
              .shadow-2xl { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
  const selectedRol = selectedEmpleado ? rolPagos[selectedEmpleado.id] : null;
  return <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-4 text-xs font-medium text-muted-foreground w-10">No.</th>
              <th className="text-left p-4 text-xs font-medium text-muted-foreground min-w-[200px]">Nombre del Empleado</th>
              <th className="text-left p-4 text-xs font-medium text-muted-foreground min-w-[150px]">Cargo</th>
              <th className="text-left p-4 text-xs font-medium text-muted-foreground min-w-[120px]">Mes</th>
              <th className="text-right p-4 text-xs font-medium text-muted-foreground min-w-[120px]">Neto a Recibir</th>
              <th className="text-center p-4 text-xs font-medium text-muted-foreground min-w-[150px]">Acción</th>
            </tr>
          </thead>
          <tbody>
            {empleadosActivos.map((empleado, index) => {
            const row = rolPagos[empleado.id];
            if (!row) return null;
            return <tr key={empleado.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4 text-sm tabular-nums">{index + 1}</td>
                  <td className="p-4 text-sm font-medium">{empleado.nombreCompleto}</td>
                  <td className="p-4 text-sm text-muted-foreground">{empleado.cargo}</td>
                  <td className="p-4 text-sm">{datos.mes} {datos.anio}</td>
                  <td className="p-4 text-right text-sm font-medium tabular-nums">
                    {formatCurrency(row.netoRecibir)}
                  </td>
                  <td className="p-4 text-center">
                    <Button variant="outline" size="sm" onClick={() => handleViewRol(empleado)} className="gap-2">
                      <Eye className="h-4 w-4" />
                      Ver / Descargar Rol
                    </Button>
                  </td>
                </tr>;
          })}
            {empleadosActivos.length === 0 && <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No hay empleados activos para mostrar
                </td>
              </tr>}
          </tbody>
        </table>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Rol de Pagos - {selectedEmpleado?.nombreCompleto}</span>
              <button onClick={handleDownload} className="text-primary hover:underline flex items-center gap-2 text-sm font-medium mx-[15px]">
                <Download className="h-4 w-4" />
                Descargar PDF
              </button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmpleado && selectedRol && <div className="mt-4 overflow-auto border rounded-lg">
              <RolEmpleadoDocument ref={documentRef} empleado={selectedEmpleado} rol={selectedRol} datos={datos} />
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
}