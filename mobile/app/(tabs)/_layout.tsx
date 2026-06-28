import { Tabs } from 'expo-router';
import React from 'react';
import { useTheme } from '../../src/core/theme/ThemeProvider';
import { useAuthStore } from '../../src/core/auth/authStore';
import { Feather } from '@expo/vector-icons';

export default function TabsLayout() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const isClient = user?.role === 'CLIENT';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: theme.colors.neutral[400],
        tabBarStyle: {
          backgroundColor: theme.colors.background.card,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border.default,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: theme.typography.fontFamily.medium,
          fontSize: 11,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="jobs/index"
        options={{
          title: isClient ? 'Mes Annonces' : 'Missions',
          tabBarIcon: ({ color, size }) => <Feather name={isClient ? "list" : "truck"} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="create/index"
        options={{
          title: isClient ? 'Publier' : 'Dispo',
          tabBarIcon: ({ color, size }) => <Feather name="plus-circle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => <Feather name="message-square" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
