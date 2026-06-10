/*
 * @Description: Tab Layout — Messenger + PRD tabs
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const tabBarStyle = {
    height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
    paddingTop: 8,
    paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 8 }),
    paddingHorizontal: 16,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Чаты',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="chat" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="overview"
        options={{
          title: 'Обзор',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="dashboard" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="features"
        options={{
          title: 'Функционал',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="featured-play-list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tech"
        options={{
          title: 'Технологии',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="code" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="roadmap"
        options={{
          title: 'Роадмап',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="timeline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
