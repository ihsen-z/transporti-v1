export class TrustModel {
  constructor(
    public readonly id: number,
    public readonly userId: number,
    public readonly verificationStatus: 'UNVERIFIED' | 'PENDING' | 'PARTIALLY_REVIEWED' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED',
    public readonly trustScore: number,
    public readonly rejectionReason: string | null,
    public readonly vehicleType: string,
    public readonly vehicleCapacityKg: number | null,
    public readonly vehiclePlate: string,
    public readonly insuranceValidUntil: Date | null
  ) {}

  get isVerified(): boolean {
    return this.verificationStatus === 'VERIFIED';
  }

  get isPending(): boolean {
    return this.verificationStatus === 'PENDING' || this.verificationStatus === 'PARTIALLY_REVIEWED';
  }

  get statusLabel(): string {
    switch (this.verificationStatus) {
      case 'UNVERIFIED':
        return 'Non vérifié';
      case 'PENDING':
      case 'PARTIALLY_REVIEWED':
        return 'En attente de vérification';
      case 'VERIFIED':
        return 'Profil Vérifié ✅';
      case 'REJECTED':
        return 'Vérification Refusée ❌';
      case 'SUSPENDED':
        return 'Compte Suspendu';
      default:
        return 'Inconnu';
    }
  }
}
