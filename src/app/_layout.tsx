import React from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { C } from '../constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarBackground: () => (
            <View style={StyleSheet.absoluteFill}>
              <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(9, 9, 11, 0.7)' }]} />
            </View>
          ),
          tabBarStyle: {
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 24 : 16,
            left: 16,
            right: 16,
            elevation: 10,
            backgroundColor: 'transparent',
            borderRadius: 24,
            height: 64,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
            paddingBottom: Platform.OS === 'ios' ? 20 : 0,
            paddingTop: Platform.OS === 'ios' ? 12 : 0,
            overflow: 'hidden',
          },
          tabBarItemStyle: {
            paddingTop: Platform.OS === 'android' ? 8 : 0,
            paddingBottom: Platform.OS === 'android' ? 8 : 0,
          },
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: C.muted,
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: '800',
            letterSpacing: 0.5,
            marginTop: 2,
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
