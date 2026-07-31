import { StyleSheet } from 'react-native';
import { colors, spacing, fontSize, radii } from '@/shared/theme';

// Styles partagés du formulaire de publication (repris à l'identique de
// l'ancien composant monolithique — aucun changement visuel).
export const publishStyles = StyleSheet.create({
  form: { gap: spacing.lg },
  section: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.brand[600],
    marginTop: spacing.sm,
  },
  rowGap: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  estimate: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.green[700],
  },
  hint: { fontSize: fontSize.sm, color: colors.neutral[500] },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  switchLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  error: { color: colors.error, fontSize: fontSize.sm, fontWeight: '600' },
  submit: { marginTop: spacing.sm },
  successBox: {
    backgroundColor: colors.brand[50],
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  successText: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.green[700],
    textAlign: 'center',
  },
});
