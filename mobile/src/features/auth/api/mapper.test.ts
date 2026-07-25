import { mapUserDto } from './mapper';
import type { UserDto } from './dto';

const base: UserDto = {
  id: 7,
  email: 'a@b.tn',
  phone: '+21612345678',
  role: 'TRANSPORTER',
  first_name: 'Ali',
  last_name: 'B',
  is_phone_verified: true,
  verification_status: 'VERIFIED',
};

describe('mapUserDto', () => {
  it('traduit snake_case -> camelCase et is_phone_verified -> isVerified', () => {
    expect(mapUserDto(base)).toEqual({
      id: 7,
      email: 'a@b.tn',
      role: 'TRANSPORTER',
      isVerified: true,
      firstName: 'Ali',
      lastName: 'B',
      phone: '+21612345678',
      verificationStatus: 'VERIFIED',
    });
  });

  it('conserve un rôle connu', () => {
    expect(mapUserDto({ ...base, role: 'CLIENT' }).role).toBe('CLIENT');
    expect(mapUserDto({ ...base, role: 'ADMIN' }).role).toBe('ADMIN');
    expect(mapUserDto({ ...base, role: 'MODERATOR' }).role).toBe('MODERATOR');
  });

  it('rabat un rôle inconnu sur CLIENT (garde-fou)', () => {
    expect(mapUserDto({ ...base, role: 'WEIRD' }).role).toBe('CLIENT');
  });

  it('propage verification_status null', () => {
    expect(mapUserDto({ ...base, verification_status: null }).verificationStatus).toBeNull();
  });
});
