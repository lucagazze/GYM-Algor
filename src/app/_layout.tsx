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
            backgroundColor: '#131313',
            borderTopColor: '#222',
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 88 : 68,
            paddingBottom: Platform.OS === 'ios' ? 24 : 10,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#f65b69',
          tabBarInactiveTintColor: '#444',
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 0.5,
            marginTop: 1,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'LOG',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="pencil-plus-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="routines"
          options={{
            title: 'RUTINAS',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'HISTORIAL',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'PROGRESO',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trending-up" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="exercises"
          options={{
            title: 'EJERCS.',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="barbell-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="records" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>
    </>
  );
}
