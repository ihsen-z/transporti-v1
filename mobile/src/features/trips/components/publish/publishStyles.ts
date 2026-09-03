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
    color: colors.text.green,
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
  // T1.2 — bandeau de véhicule pré-rempli et choix tactile de la part.
  prefillBanner: {
    backgroundColor: colors.brand[50],
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  prefillText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.brand[600],
  },
  partRow: { flexDirection: 'row', gap: spacing.sm },
  partChoice: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
  },
  partChoiceActive: {
    borderColor: colors.brand[500],
    backgroundColor: colors.brand[50],
  },
  partLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  partLabelActive: { color: colors.brand[600] },

  error: { color: colors.text.error, fontSize: fontSize.sm, fontWeight: '600' },
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
    color: colors.text.green,
    textAlign: 'center',
  },
});
