"use client";

import { MenuItemDto } from "@/lib/types";

export default function MenuItemRow({
  item,
  onToggle,
}: {
  item: MenuItemDto;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg px-3 py-1 cursor-pointer transition-colors ${
        item.checked ? "bg-green-100" : "hover:bg-neutral-100"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={item.checked}
        onChange={() => onToggle(item.id, !item.checked)}
        className="mt-1 size-4 accent-green-600"
      />
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`text-sm ${item.category === "polievka" ? "font-medium text-neutral-500" : "text-neutral-900"}`}>
            {item.name}
          </span>
          {item.price && (
            <span className="shrink-0 text-sm font-medium text-neutral-700">{item.price}</span>
          )}
        </span>
        {item.allergens.length > 0 && (
          <span className="text-xs text-neutral-400">Alergény: {item.allergens.join(", ")}</span>
        )}
      </span>
    </label>
  );
}
