// Shared service types
// Production — real API data only

export type DataSource = 'api';

export interface ServiceResult<T> {
    data: T;
    source: DataSource;
}

/** DRF PageNumberPagination response wrapper */
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
