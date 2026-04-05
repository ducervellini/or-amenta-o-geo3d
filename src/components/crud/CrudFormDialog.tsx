import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "number" | "textarea" | "select" | "checkbox";
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  step?: string;
  defaultValue?: string | number | boolean;
}

interface CrudFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FieldConfig[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  loading?: boolean;
  onFieldChange?: (fieldName: string, value: unknown, allValues: Record<string, unknown>) => Record<string, unknown> | undefined;
}

function buildDefaults(fields: FieldConfig[], initialValues?: Record<string, unknown>) {
  const defaults: Record<string, unknown> = {};
  fields.forEach((f) => {
    defaults[f.name] = initialValues?.[f.name] ?? f.defaultValue ?? (f.type === "number" ? 0 : "");
  });
  return defaults;
}

export function CrudFormDialog({
  open,
  onOpenChange,
  title,
  fields,
  initialValues,
  onSubmit,
  loading,
  onFieldChange,
}: CrudFormDialogProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => buildDefaults(fields, initialValues));

  useEffect(() => {
    if (open) {
      setValues(buildDefaults(fields, initialValues));
    }
  }, [open, initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const setValue = (name: string, value: unknown) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      if (onFieldChange) {
        const updates = onFieldChange(name, value, next);
        if (updates) return { ...next, ...updates };
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={field.name}
                  value={(values[field.name] as string) || ""}
                  onChange={(e) => setValue(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              ) : field.type === "select" ? (
                <Select
                  value={(values[field.name] as string) || ""}
                  onValueChange={(v) => setValue(field.name, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder || "Selecione..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "number" ? (
                <Input
                  id={field.name}
                  type="number"
                  step={field.step || "0.01"}
                  value={(values[field.name] as number) ?? 0}
                  onChange={(e) => setValue(field.name, parseFloat(e.target.value) || 0)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              ) : (
                <Input
                  id={field.name}
                  type="text"
                  value={(values[field.name] as string) || ""}
                  onChange={(e) => setValue(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
