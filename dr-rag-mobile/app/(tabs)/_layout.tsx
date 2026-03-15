/**
 * Tabs layout — only shows tabs that are enabled by admin settings.
 */

import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/stores/authStore';

export default function TabsLayout() {
  const { settings } = useAuthStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.borderLight,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Query',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="magnify" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          href: settings.show_history ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved-rubrics"
        options={{
          title: 'Saved',
          href: settings.show_saved_rubrics ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bookmark-multiple" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
