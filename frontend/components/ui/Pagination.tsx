"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Reusable Pagination Component                                             */
/*  Client-side pagination for lists without backend cursor support            */
/* -------------------------------------------------------------------------- */

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Masquer la ligne "Affichage de X à Y" (utilisé par l'adaptateur admin) */
  showCount?: boolean;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className = "",
  showCount = true,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  // Generate page numbers to display (max 5 visible)
  const getVisiblePages = (): (number | "...")[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [1];

    if (currentPage > 3) pages.push("...");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 ${className}`}
    >
      {/* Item count */}
      {showCount && (
        <p className="text-[13px] text-ink-500 dark:text-neutral-400">
          Affichage de{" "}
          <span className="font-semibold text-ink-900 dark:text-neutral-200">
            {startItem}
          </span>{" "}
          à{" "}
          <span className="font-semibold text-ink-900 dark:text-neutral-200">
            {endItem}
          </span>{" "}
          sur{" "}
          <span className="font-semibold text-ink-900 dark:text-neutral-200">
            {totalItems}
          </span>{" "}
          résultats
        </p>
      )}

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="grid h-9 w-9 place-items-center rounded-chip text-ink-500 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-neutral-400 dark:hover:bg-neutral-700"
          aria-label="Page précédente"
        >
          <ChevronLeft className="w-4 h-4 rtl:-scale-x-100" />
        </button>

        {getVisiblePages().map((page, index) =>
          page === "..." ? (
            <span
              key={`dots-${index}`}
              className="px-2 text-[13px] text-ink-300"
            >
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`min-w-[36px] h-9 rounded-chip text-[13px] font-semibold transition-colors ${
                page === currentPage
                  ? "bg-blue-700 text-white shadow-blue"
                  : "text-ink-500 hover:bg-blue-50 hover:text-blue-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
              }`}
            >
              {page}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="grid h-9 w-9 place-items-center rounded-chip text-ink-500 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-neutral-400 dark:hover:bg-neutral-700"
          aria-label="Page suivante"
        >
          <ChevronRight className="w-4 h-4 rtl:-scale-x-100" />
        </button>
      </div>
    </div>
  );
}

/** Helper: slice data for current page */
export function paginateArray<T>(
  items: T[],
  page: number,
  pageSize: number,
): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
