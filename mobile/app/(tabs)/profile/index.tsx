import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuthStore } from '../../../src/core/auth/authStore';
import { useTheme } from '../../../src/core/theme/ThemeProvider';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { theme, toggleRTL, isRTL } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation('auth');

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const changeLanguage = (lang: 'fr' | 'ar') => {
    i18n.changeLanguage(lang);
    if ((lang === 'ar' && !isRTL) || (lang === 'fr' && isRTL)) {
      toggleRTL();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <ScrollView>
        <View style={[styles.userCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary[50] }]}>
            <Text style={[styles.avatarText, { color: theme.colors.primary[700] }]}>
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.colors.text.primary }]}>{user?.name || 'Utilisateur'}</Text>
            <Text style={[styles.userEmail, { color: theme.colors.text.secondary }]}>{user?.email}</Text>
            <Text style={[styles.userPhone, { color: theme.colors.text.secondary }]}>{user?.phone}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>Paramètres</Text>

          {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
            <TouchableOpacity
              style={[styles.optionRow, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}
              onPress={() => router.push('/admin/dashboard')}
            >
              <View style={styles.optionLeft}>
                <Feather name="activity" size={20} color={theme.colors.primary[500]} />
                <Text style={[styles.optionText, { color: theme.colors.text.primary }]}>Tableau de Bord Admin</Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.colors.neutral[400]} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.optionRow, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}
            onPress={() => router.push('/trust/status')}
          >
            <View style={styles.optionLeft}>
              <Feather name="shield" size={20} color={theme.colors.primary[500]} />
              <Text style={[styles.optionText, { color: theme.colors.text.primary }]}>Statut de Vérification (KYC)</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.neutral[400]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionRow, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}
            onPress={() => router.push('/disputes')}
          >
            <View style={styles.optionLeft}>
              <Feather name="alert-triangle" size={20} color={theme.colors.primary[500]} />
              <Text style={[styles.optionText, { color: theme.colors.text.primary }]}>Mes Litiges</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.neutral[400]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionRow, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}
            onPress={() => router.push('/profile/wallet')}
          >
            <View style={styles.optionLeft}>
              <Feather name="credit-card" size={20} color={theme.colors.primary[500]} />
              <Text style={[styles.optionText, { color: theme.colors.text.primary }]}>Mon Portefeuille</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.neutral[400]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionRow, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}
            onPress={() => router.push('/profile/notifications')}
          >
            <View style={styles.optionLeft}>
              <Feather name="bell" size={20} color={theme.colors.primary[500]} />
              <Text style={[styles.optionText, { color: theme.colors.text.primary }]}>Préférences de Notification</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.neutral[400]} />
          </TouchableOpacity>

          <View style={[styles.optionContainer, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.default }]}>
            <View style={styles.languageHeader}>
              <Feather name="globe" size={20} color={theme.colors.primary[500]} />
              <Text style={[styles.optionText, { color: theme.colors.text.primary, marginLeft: 10 }]}>Langue / Language</Text>
            </View>
            <View style={styles.languageButtons}>
              <TouchableOpacity
                style={[styles.langButton, i18n.language === 'fr' && styles.langButtonActive]}
                onPress={() => changeLanguage('fr')}
              >
                <Text style={[styles.langButtonText, i18n.language === 'fr' && styles.langButtonTextActive]}>Français</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langButton, i18n.language === 'ar' && styles.langButtonActive]}
                onPress={() => changeLanguage('ar')}
              >
                <Text style={[styles.langButtonText, i18n.language === 'ar' && styles.langButtonTextActive]}>العربية</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: theme.colors.error[500] }]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={20} color={theme.colors.error[700]} />
          <Text style={[styles.logoutText, { color: theme.colors.error[700] }]}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  langButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
  },
  langButtonActive: {
    backgroundColor: '#E8F4FD',
    borderWidth: 1,
    borderColor: '#1A73E8',
  },
  langButtonText: {
    fontSize: 13,
    color: '#5F6368',
    fontWeight: '500',
  },
  langButtonTextActive: {
    color: '#1A73E8',
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
