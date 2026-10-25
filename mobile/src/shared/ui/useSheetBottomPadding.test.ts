import { renderHook } from '@testing-library/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSheetBottomPadding } from './useSheetBottomPadding';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

const insets = useSafeAreaInsets as jest.Mock;

describe('useSheetBottomPadding', () => {
  it('ajoute la barre de gestes à la marge de design (Android 16, bord à bord)', () => {
    insets.mockReturnValue({ top: 24, bottom: 48, left: 0, right: 0 });
    const { result } = renderHook(() => useSheetBottomPadding(24));
    expect(result.current).toBe(72);
  });

  it('ne change rien sur un appareil sans barre de gestes', () => {
    insets.mockReturnValue({ top: 24, bottom: 0, left: 0, right: 0 });
    const { result } = renderHook(() => useSheetBottomPadding(24));
    expect(result.current).toBe(24);
  });
});
