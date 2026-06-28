export type DisputeStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'REJECTED';

export type DisputeReason =
  | 'DAMAGED_ITEMS'
  | 'LATE_DELIVERY'
  | 'NO_SHOW'
  | 'PAYMENT_ISSUE'
  | 'HARASSMENT'
  | 'FRAUD'
  | 'OTHER';

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: 'Ouvert',
  INVESTIGATING: 'En investigation',
  RESOLVED: 'Résolu',
  REJECTED: 'Rejeté',
};

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  DAMAGED_ITEMS: 'Marchandise endommagée',
  LATE_DELIVERY: 'Retard de livraison',
  NO_SHOW: 'Transporteur absent',
  PAYMENT_ISSUE: 'Problème de paiement',
  HARASSMENT: 'Harcèlement',
  FRAUD: 'Fraude suspectée',
  OTHER: 'Autre',
};

export interface JobSummary {
  id: number;
  type: string;
  status: string;
  pickup?: string;
  dropoff?: string;
}

export class DisputeModel {
  constructor(
    public readonly id: number,
    public readonly job: number,
    public readonly reason: DisputeReason,
    public readonly description: string,
    public readonly status: DisputeStatus,
    public readonly resolutionNotes: string | null,
    public readonly openedByName: string,
    public readonly jobSummary: JobSummary | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly resolvedAt: Date | null
  ) {}

  get statusLabel(): string {
    return DISPUTE_STATUS_LABELS[this.status] || this.status;
  }

  get reasonLabel(): string {
    return DISPUTE_REASON_LABELS[this.reason] || this.reason;
  }
}
