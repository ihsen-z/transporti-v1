import { StyleSheet } from 'react-native';
import { colors, spacing, fontSize, radii, TOUCH_TARGET } from '@/shared/theme';

// Styles partagés de la demande cliente. La feuille reprend à l'identique ceux
// de l'ancien composant monolithique ; les sections ajoutent les leurs.
export const requestStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    // La feuille défile désormais : sans marge basse, le bouton d'envoi
    // touchait le bord de l'écran.
    paddingBottom: spacing.xl,
    // Le formulaire est passé de 3 à une douzaine de champs : la feuille ne
    // tient plus dans un écran, d'où le plafond + défilement interne.
    maxHeight: '90%',
  },
  scroll: { gap: spacing.lg, paddingBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
  section: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.brand[600],
    marginTop: spacing.sm,
  },
  hint: { fontSize: fontSize.sm, color: colors.neutral[500] },
  rowGap: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  error: { color: colors.text.error, fontSize: fontSize.sm, fontWeight: '600' },

  // Photos — vignettes carrées + bouton d'ajout de même gabarit.
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  photoBox: {
    width: 84,
    height: 84,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
  },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: spacing.xs,
  },
  photoRemoveGlyph: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: colors.neutral[0],
    fontSize: fontSize.sm,
    fontWeight: '800',
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
    overflow: 'hidden',
  },
  photoAdd: {
    width: 84,
    height: 84,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  photoAddLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.brand[600],
    textAlign: 'center',
  },

  successBox: { gap: spacing.lg, paddingVertical: spacing.lg },
  successText: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text.green,
    textAlign: 'center',
  },
});
