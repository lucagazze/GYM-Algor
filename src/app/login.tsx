import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../utils/supabase';
import { C } from '../constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Faltan datos', 'Ingresá tu email y contraseña.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert(
        'Error al entrar',
        error.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : error.message
      );
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.inner}
      >
        <View style={s.logoSection}>
          <Text style={s.logo}>
            ALGO<Text style={{ color: C.primary }}>R</Text>LIFT
          </Text>
          <Text style={s.tagline}>Tu progreso. Tu récord.</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Iniciar sesión</Text>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>EMAIL</Text>
            <View style={s.inputRow}>
              <Ionicons name="mail-outline" size={15} color={C.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor={C.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>CONTRASEÑA</Text>
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={15} color={C.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={C.muted}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                onSubmitEditing={handleLogin}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={{ padding: 4 }}>
                <Ionicons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={15}
                  color={C.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
            style={{ marginTop: 10 }}
          >
            <LinearGradient
              colors={[C.primary, '#D91646']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[s.loginBtn, loading && { opacity: 0.6 }]}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.loginBtnTxt}>ENTRAR</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>Pedile el acceso a Luca 💪</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 28 },

  logoSection: { alignItems: 'center', gap: 6 },
  logo: { fontSize: 32, fontWeight: '900', color: C.text, letterSpacing: -1 },
  tagline: { fontSize: 13, color: C.muted, fontWeight: '600', letterSpacing: 0.3 },

  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    gap: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  cardTitle: { fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: -0.5, marginBottom: 4 },

  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 10, color: C.muted, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 46,
  },
  input: { flex: 1, color: C.text, fontSize: 14, fontWeight: '500' },

  loginBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  loginBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },

  footer: { textAlign: 'center', fontSize: 12, color: C.muted },
});
