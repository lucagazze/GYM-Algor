import React from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0A0A0A',
            borderTopColor: '#1A1A1A',
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 90 : 72,
            paddingBottom: Platform.OS === 'ios' ? 22 : 10,
            paddingTop: 6,
          },
          tabBarActiveTintColor: '#E63946',
          tabBarInactiveTintColor: '#3A3A3A',
          tabBarLabelStyle: { fontSize: 9, fontWeight: '700', letterSpacing: 0, marginTop: 2 },
          tabBarIconStyle: { marginBottom: 0 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'LOG',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="pencil-plus-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'PROGRESO',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trending-up" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'HISTORIAL',
            tabBarLabel: 'HISTORIAL',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="records"
          options={{
            title: '1RM',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="trophy-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="exercises"
          options={{
            title: 'EJERCICIOS',
            tabBarLabel: 'EJERCS.',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="barbell-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>
    </>
  );
}
