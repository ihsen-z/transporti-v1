"use client";

import UiPagination from "@/components/ui/Pagination";

/*
 * Adaptateur — l'admin utilisait sa propre Pagination (~95 % identique à
 * ui/Pagination, API différente). Le rendu est désormais délégué au composant
 * unique ; seule la conversion d'API (page/totalPages → currentPage/
 * totalItems/pageSize) vit ici.
 */

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: PaginationProps) {
  const hasCount = totalItems != null && pageSize != null;
  return (
    <UiPagination
      currentPage={page}
      // Sans compte fourni, on synthétise totalItems/pageSize pour que
      // ceil(totalItems/pageSize) === totalPages ; la ligne de compte est masquée.
      totalItems={hasCount ? totalItems : totalPages}
      pageSize={hasCount ? pageSize : 1}
      onPageChange={onPageChange}
      showCount={hasCount}
      className="mt-4"
    />
  );
}
