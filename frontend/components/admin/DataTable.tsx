'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';

interface Column<T> {
    key: keyof T | string;
    header: string;
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
    emptyMessage = 'Aucune donnée disponible',
}: DataTableProps<T>) {
    const getCellValue = (item: T, key: string): React.ReactNode => {
        const keys = key.split('.');
        let value: unknown = item;
        for (const k of keys) {
            value = (value as Record<string, unknown>)?.[k];
        }
        return value as React.ReactNode;
    };

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="text-slate-500">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            {columns.map((column) => (
                                <th
                                    key={String(column.key)}
                                    className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${column.width || ''}`}
                                >
                                    <div className="flex items-center gap-1">
                                        {column.header}
                                        {column.sortable && (
                                            <div className="flex flex-col">
                                                <ChevronUp className="w-3 h-3 -mb-1 text-slate-300" />
                                                <ChevronDown className="w-3 h-3 text-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((item) => (
                            <tr
                                key={item.id}
                                onClick={() => onRowClick?.(item)}
                                className={`
                                    hover:bg-slate-50 transition-colors
                                    ${onRowClick ? 'cursor-pointer' : ''}
                                `}
                            >
                                {columns.map((column) => (
                                    <td
                                        key={String(column.key)}
                                        className="px-4 py-4 text-sm text-slate-700"
                                    >
                                        {column.render
                                            ? column.render(item)
                                            : getCellValue(item, String(column.key))
                                        }
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
