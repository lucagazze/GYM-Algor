import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, View, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, F } from '../constants/theme';
import { supabase } from '../utils/supabase';
import LoginScreen from './login';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={C.primary} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen />
      </>
    );
  }

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
            fontSize: 10,
            fontWeight: '700',
            fontFamily: F.condensed,
            letterSpacing: 1,
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'LOG',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="pencil-plus-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="routines"
          options={{
            title: 'RUTINAS',
            tabBarIcon: ({ color }) => (
              <Ionicons name="list-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'HISTORIAL',
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'PROGRESO',
            tabBarIcon: ({ color }) => (
              <Ionicons name="trending-up" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="exercises"
          options={{
            title: 'EJERCS.',
            tabBarIcon: ({ color }) => (
              <Ionicons name="barbell-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="admin" options={{ href: null }} />
        <Tabs.Screen name="records" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="login" options={{ href: null }} />
      </Tabs>
    </>
  );
}
