import { useState, useEffect, forwardRef, InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string; // ISO format yyyy-mm-dd
  onChange: (value: string) => void;
  onBlur?: () => void;
}

/**
 * Componente de entrada de fecha con digitación manual dd/mm/aaaa
 * Almacena internamente en formato ISO (yyyy-mm-dd) pero muestra dd/mm/aaaa
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, onBlur, className, placeholder = "dd/mm/aaaa", ...props }, ref) => {
    // Convertir ISO a display format
    const isoToDisplay = (iso: string): string => {
      if (!iso) return "";
      const parts = iso.split("-");
      if (parts.length !== 3) return iso;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // Convertir display format a ISO
    const displayToIso = (display: string): string => {
      if (!display) return "";
      const parts = display.split("/");
      if (parts.length !== 3) return "";
      const [day, month, year] = parts;
      if (day.length !== 2 || month.length !== 2 || year.length !== 4) return "";
      return `${year}-${month}-${day}`;
    };

    const [displayValue, setDisplayValue] = useState(isoToDisplay(value));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      setDisplayValue(isoToDisplay(value));
    }, [value]);

    const validateDate = (dateStr: string): boolean => {
      if (!dateStr) return true;
      
      const parts = dateStr.split("/");
      if (parts.length !== 3) return false;
      
      const [dayStr, monthStr, yearStr] = parts;
      
      if (dayStr.length !== 2 || monthStr.length !== 2 || yearStr.length !== 4) {
        return false;
      }
      
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      
      if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
      if (month < 1 || month > 12) return false;
      if (day < 1 || day > 31) return false;
      if (year < 1900 || year > 2100) return false;
      
      // Validar días según el mes
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day > daysInMonth) return false;
      
      return true;
    };

    const formatInput = (input: string): string => {
      // Remover caracteres no numéricos excepto /
      let cleaned = input.replace(/[^0-9/]/g, "");
      
      // Auto-insertar / después de dd y mm
      const digits = cleaned.replace(/\//g, "");
      let formatted = "";
      
      for (let i = 0; i < digits.length && i < 8; i++) {
        if (i === 2 || i === 4) {
          formatted += "/";
        }
        formatted += digits[i];
      }
      
      return formatted;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatInput(e.target.value);
      setDisplayValue(formatted);
      setError(null);
      
      // Solo intentar convertir si tenemos formato completo
      if (formatted.length === 10) {
        if (validateDate(formatted)) {
          const iso = displayToIso(formatted);
          if (iso) {
            onChange(iso);
          }
        } else {
          setError("Fecha inválida");
        }
      } else if (formatted === "") {
        onChange("");
      }
    };

    const handleBlur = () => {
      // Autocorrección: agregar ceros si es necesario
      if (displayValue && displayValue.length > 0 && displayValue.length < 10) {
        const parts = displayValue.split("/");
        if (parts.length >= 1) {
          let day = parts[0] || "";
          let month = parts[1] || "";
          let year = parts[2] || "";
          
          if (day.length === 1) day = "0" + day;
          if (month.length === 1) month = "0" + month;
          if (year.length === 2) year = "20" + year;
          
          if (day && month && year.length === 4) {
            const corrected = `${day}/${month}/${year}`;
            if (validateDate(corrected)) {
              setDisplayValue(corrected);
              const iso = displayToIso(corrected);
              if (iso) {
                onChange(iso);
                setError(null);
              }
            } else {
              setError("Fecha inválida");
            }
          }
        }
      }
      
      if (displayValue && !validateDate(displayValue)) {
        setError("Fecha inválida (dd/mm/aaaa)");
      }
      
      onBlur?.();
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            className,
            error && "border-destructive focus-visible:ring-destructive"
          )}
          maxLength={10}
          {...props}
        />
        {error && (
          <span className="absolute -bottom-5 left-0 text-xs text-destructive">
            {error}
          </span>
        )}
      </div>
    );
  }
);

DateInput.displayName = "DateInput";
