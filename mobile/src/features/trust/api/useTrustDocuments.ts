import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { DocumentDto } from './dto';

// GET /api/v1/trust/documents/ — réponse = tableau JSON (pas de pagination).
async function fetchDocuments(): Promise<DocumentDto[]> {
  const res = await apiClient.get<DocumentDto[]>('trust/documents/');
  return res.data;
}

export function useTrustDocuments(enabled: boolean) {
  return useQuery({
    queryKey: ['trustDocuments'],
    queryFn: fetchDocuments,
    enabled,
  });
}
