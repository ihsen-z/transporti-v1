"use client";

import { ChevronUp, ChevronDown } from "lucide-react";

interface Column<T> {
  key: keyof T | string;
  header: string | React.ReactNode;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export default function DataTable<T extends { id: number | string }>({
  columns,
  data,
  onRowClick,
  emptyMessage = "Aucune donnée disponible",
}: DataTableProps<T>) {
  const getCellValue = (item: T, key: string): React.ReactNode => {
    const keys = key.split(".");
    let value: unknown = item;
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return value as React.ReactNode;
  };

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-200 dark:border-neutral-700 p-12 text-center transition-colors duration-300">
        <p className="text-neutral-500 dark:text-neutral-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden transition-colors duration-300">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 dark:bg-[#0f172a] border-b border-neutral-200 dark:border-neutral-700">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider ${column.width || ""}`}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp className="w-3 h-3 -mb-1 text-neutral-300 dark:text-neutral-600" />
                        <ChevronDown className="w-3 h-3 text-neutral-300 dark:text-neutral-600" />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={`
                  hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors
                  ${onRowClick ? "cursor-pointer" : ""}
                `}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className="px-4 py-4 text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    {column.render
                      ? column.render(item)
                      : getCellValue(item, String(column.key))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
