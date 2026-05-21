import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type QuickFormField = {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "password" | "textarea";
  placeholder?: string;
  required?: boolean;
};

type QuickFormDialogProps = {
  open: boolean;
  title: string;
  fields: QuickFormField[];
  initialValues?: Record<string, string>;
  submitLabel?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, string>) => void;
};

export function QuickFormDialog({
  open,
  title,
  fields,
  initialValues,
  submitLabel = "Simpan",
  onOpenChange,
  onSubmit,
}: QuickFormDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? {});
    }
  }, [initialValues, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.08] bg-[#1E1E20] text-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(values);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const Control = field.type === "textarea" ? Textarea : Input;
              return (
                <label
                  key={field.name}
                  className={field.type === "textarea" ? "sm:col-span-2" : ""}
                >
                  <span className="mb-1 block text-xs text-white/50">
                    {field.label}
                  </span>
                  <Control
                    required={field.required}
                    type={
                      field.type === "number" ||
                      field.type === "email" ||
                      field.type === "password"
                        ? field.type
                        : "text"
                    }
                    value={values[field.name] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                    className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/35"
                  />
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
            >
              Batal
            </Button>
            <Button type="submit" className="btn-primary-gold">
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
