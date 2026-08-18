// frontend/src/modules/procurement/components/SupplierPicker.tsx
import { useEffect, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { listSuppliers } from "@/services/suppliers";
import { getSupplierItems } from "@/services/lpo";
import type { SupplierItem } from "@/types/lpo";
import { Package } from "lucide-react";

interface SupplierPickerProps {
  value: number | "";
  onChange: (id: number | "") => void;
}

export function SupplierPicker({ value, onChange }: SupplierPickerProps) {
  const { data: suppliers } = useFetch(() => listSuppliers());
  const [knownItems, setKnownItems] = useState<SupplierItem[]>([]);

  useEffect(() => {
    if (!value) {
      setKnownItems([]);
      return;
    }
    let cancelled = false;
    getSupplierItems(Number(value)).then((items) => {
      if (!cancelled) setKnownItems(items);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
        className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
        required
      >
        <option value="">Select a supplier...</option>
        {suppliers?.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {knownItems.length > 0 && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-steel-500">
          <Package size={13} className="mt-0.5 shrink-0" />
          <span>
            Previously ordered:{" "}
            {knownItems
              .slice(0, 5)
              .map((i) => i.description)
              .join(", ")}
            {knownItems.length > 5 && ` +${knownItems.length - 5} more`}
          </span>
        </div>
      )}
    </div>
  );
}
