export class JobModel {
  constructor(
    public readonly id: number,
    public readonly ownerId: number,
    public readonly ownerName: string,
    public readonly status: 'DRAFT' | 'PUBLISHED' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED',
    public readonly jobType: 'TRANSPORT' | 'MOVING' | 'DELIVERY',
    public readonly pickupAddress: string,
    public readonly pickupLat: number | null,
    public readonly pickupLng: number | null,
    public readonly dropoffAddress: string,
    public readonly dropoffLat: number | null,
    public readonly dropoffLng: number | null,
    public readonly scheduledTime: Date,
    public readonly specifications: Record<string, any>,
    public readonly priceMin: number | null,
    public readonly priceMax: number | null,
    public readonly description: string,
    public readonly photos: string[],
    public readonly pickupGovernorate: string,
    public readonly dropoffGovernorate: string,
    public readonly pickupHint: string,
    public readonly dropoffHint: string,
    public readonly isReturnTrip: boolean,
    public readonly availableCapacity: string,
    public readonly viewCount: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  get isEditable(): boolean {
    return this.status === 'DRAFT' || this.status === 'PUBLISHED';
  }

  get canCancel(): boolean {
    return this.status === 'DRAFT' || this.status === 'PUBLISHED' || this.status === 'MATCHED';
  }

  get hasLocationData(): boolean {
    return (
      this.pickupLat !== null &&
      this.pickupLng !== null &&
      this.dropoffLat !== null &&
      this.dropoffLng !== null
    );
  }

  get formattedPriceRange(): string {
    if (this.priceMin !== null && this.priceMax !== null) {
      return `${Math.round(this.priceMin)} - ${Math.round(this.priceMax)} TND`;
    }
    if (this.priceMax !== null) {
      return `Jusqu'à ${Math.round(this.priceMax)} TND`;
    }
    return 'Budget à discuter';
  }

  get statusLabelKey(): string {
    switch (this.status) {
      case 'DRAFT':
        return 'status_draft';
      case 'PUBLISHED':
        return 'status_published';
      case 'MATCHED':
        return 'status_matched';
      case 'IN_PROGRESS':
        return 'status_in_progress';
      case 'COMPLETED':
        return 'status_completed';
      case 'CANCELLED':
        return 'status_cancelled';
      case 'DISPUTED':
        return 'status_disputed';
      default:
        return 'status_unknown';
    }
  }
}
