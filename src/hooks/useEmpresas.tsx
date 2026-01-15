import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Empresa {
  id: string;
  nombre: string;
  ruc: string;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

type LoadState = "idle" | "loading" | "success" | "error";

export const useEmpresas = () => {
  const { user, loading: authLoading } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [hasEmpresas, setHasEmpresas] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEmpresas = useCallback(async () => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      return;
    }

    // If no user, set empty state
    if (!user) {
      setEmpresas([]);
      setLoadState("success");
      setHasEmpresas(false);
      setError(null);
      return;
    }

    try {
      setLoadState("loading");
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("empresas")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Error fetching empresas:", fetchError);
        setError(fetchError.message);
        setLoadState("error");
        toast.error("Error al cargar las empresas");
        return;
      }

      setEmpresas(data || []);
      setHasEmpresas((data?.length || 0) > 0);
      setLoadState("success");
    } catch (err: any) {
      console.error("Error fetching empresas:", err);
      setError(err?.message || "Error desconocido");
      setLoadState("error");
    }
  }, [user?.id, authLoading]); // Only depend on user.id, not the full user object

  useEffect(() => {
    // Only fetch when auth is done loading and we have or don't have a user
    if (!authLoading) {
      fetchEmpresas();
    }
  }, [authLoading, fetchEmpresas]);

  return {
    empresas,
    isLoading: loadState === "loading" || (loadState === "idle" && authLoading),
    hasEmpresas,
    error,
    refetch: fetchEmpresas
  };
};
