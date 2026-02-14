export type PaginationResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  start: number;
  end: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export function parsePositiveInt(
  value: string | null | undefined,
  fallback: number,
) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): PaginationResult<T> {
  const safePageSize = Math.max(1, pageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = clamp(page, 1, totalPages);
  const startIndex = (safePage - 1) * safePageSize;
  const endIndex = Math.min(startIndex + safePageSize, total);
  const pagedItems = items.slice(startIndex, endIndex);

  return {
    items: pagedItems,
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages,
    start: total ? startIndex + 1 : 0,
    end: endIndex,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  };
}
