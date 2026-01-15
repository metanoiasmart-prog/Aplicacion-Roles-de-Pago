import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Empleado } from '@/types/nomina';
import { useToast } from '@/hooks/use-toast';

export const useEmpleados = (empresaId: string | null) => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch employees from database
  const fetchEmpleados = useCallback(async () => {
    // If no empresaId, set empty state and stop loading
    if (!empresaId) {
      setEmpleados([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('empleados')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Supabase error fetching empleados:', fetchError);
        throw new Error(fetchError.message);
      }

      // Map database records to Empleado type
      const mappedEmpleados: Empleado[] = (data || []).map((emp) => ({
        id: emp.id,
        nombreCompleto: emp.nombre_completo,
        cargo: emp.cargo || '',
        fechaIngreso: emp.fecha_ingreso,
        fechaSalida: emp.fecha_salida || undefined,
        sueldoNominal: Number(emp.sueldo_nominal),
        cedula: emp.cedula || '',
        activo: emp.activo,
        mensualizaDecimos: emp.mensualiza_decimos,
        ganaFondoReserva: emp.gana_fondo_reserva,
        historicoSueldos: [],
        historicoLaboral: [],
      }));

      setEmpleados(mappedEmpleados);
      setError(null);
    } catch (err: any) {
      const errorMsg = err?.message || 'Error desconocido al cargar empleados';
      console.error('Error fetching empleados:', err);
      setError(errorMsg);
      setEmpleados([]);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los empleados',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, toast]);

  // Create new employee
  const createEmpleado = useCallback(async (empleado: Omit<Empleado, 'id'>) => {
    if (!empresaId || !user) return null;

    try {
      const { data, error } = await supabase
        .from('empleados')
        .insert({
          empresa_id: empresaId,
          user_id: user.id,
          nombre_completo: empleado.nombreCompleto || 'Nuevo Empleado',
          cedula: empleado.cedula || '',
          cargo: empleado.cargo || '',
          sueldo_nominal: empleado.sueldoNominal,
          fecha_ingreso: empleado.fechaIngreso,
          activo: empleado.activo,
          mensualiza_decimos: empleado.mensualizaDecimos,
          gana_fondo_reserva: empleado.ganaFondoReserva,
        })
        .select()
        .single();

      if (error) throw error;

      const newEmpleado: Empleado = {
        id: data.id,
        nombreCompleto: data.nombre_completo,
        cargo: data.cargo || '',
        fechaIngreso: data.fecha_ingreso,
        fechaSalida: data.fecha_salida || undefined,
        sueldoNominal: Number(data.sueldo_nominal),
        cedula: data.cedula || '',
        activo: data.activo,
        mensualizaDecimos: data.mensualiza_decimos,
        ganaFondoReserva: data.gana_fondo_reserva,
        historicoSueldos: [],
        historicoLaboral: [],
      };

      setEmpleados((prev) => [...prev, newEmpleado]);
      return newEmpleado;
    } catch (error: any) {
      console.error('Error creating empleado:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el empleado',
        variant: 'destructive',
      });
      return null;
    }
  }, [empresaId, user, toast]);

  // Update employee
  const updateEmpleado = useCallback(async (id: string, updates: Partial<Empleado>) => {
    try {
      const dbUpdates: Record<string, any> = {};
      
      if (updates.nombreCompleto !== undefined) dbUpdates.nombre_completo = updates.nombreCompleto;
      if (updates.cargo !== undefined) dbUpdates.cargo = updates.cargo || '';
      if (updates.cedula !== undefined) dbUpdates.cedula = updates.cedula;
      if (updates.sueldoNominal !== undefined) dbUpdates.sueldo_nominal = updates.sueldoNominal;
      if (updates.fechaIngreso !== undefined) dbUpdates.fecha_ingreso = updates.fechaIngreso;
      if (updates.fechaSalida !== undefined) dbUpdates.fecha_salida = updates.fechaSalida || null;
      if (updates.activo !== undefined) dbUpdates.activo = updates.activo;
      if (updates.mensualizaDecimos !== undefined) dbUpdates.mensualiza_decimos = updates.mensualizaDecimos;
      if (updates.ganaFondoReserva !== undefined) dbUpdates.gana_fondo_reserva = updates.ganaFondoReserva;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('empleados')
          .update(dbUpdates)
          .eq('id', id);

        if (error) throw error;
      }

      setEmpleados((prev) =>
        prev.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp))
      );

      return true;
    } catch (error: any) {
      console.error('Error updating empleado:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el empleado',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Delete employee
  const deleteEmpleado = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('empleados')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEmpleados((prev) => prev.filter((emp) => emp.id !== id));
      toast({
        title: 'Empleado eliminado',
        description: 'El empleado ha sido eliminado correctamente',
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting empleado:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el empleado',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Update local state without database call (for fields not in DB)
  const updateEmpleadoLocal = useCallback((id: string, updates: Partial<Empleado>) => {
    setEmpleados((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp))
    );
  }, []);

  // Bulk update local state
  const setEmpleadosLocal = useCallback((newEmpleados: Empleado[]) => {
    setEmpleados(newEmpleados);
  }, []);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  return {
    empleados,
    isLoading,
    error,
    createEmpleado,
    updateEmpleado,
    deleteEmpleado,
    updateEmpleadoLocal,
    setEmpleadosLocal,
    refetch: fetchEmpleados,
  };
};
