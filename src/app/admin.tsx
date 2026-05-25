import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../utils/supabase';
import { C } from '../constants/theme';

const SUPABASE_URL = 'https://omcdlfdgtnmolntmhits.supabase.co';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
}

export default function AdminScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  const ADMIN_ID = '4268fa86-a71b-48bb-8421-998177c39f3d';

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const admin = user.id === ADMIN_ID;
    setIsAdmin(admin);

    if (admin) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      setProfiles(data ?? []);
    }
    setLoading(false);
  };

  const createUser = async () => {
    setCreateError('');
    setCreateSuccess('');
    const slug = username.trim().toLowerCase().replace(/\s+/g, '_');
    if (!slug || !password.trim()) { setCreateError('Ingresá usuario y contraseña.'); return; }
    if (password.trim().length < 6) { setCreateError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setCreateError('Sin sesión activa.'); return; }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: slug,
          password: password.trim(),
          display_name: displayName.trim() || slug,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setCreateError(json.error ?? `Error ${res.status}`); return; }
      setCreateSuccess(`@${slug} creado correctamente.`);
      setUsername(''); setDisplayName(''); setPassword('');
      await load();
    } catch (e: any) {
      setCreateError(e.message ?? 'Error de red al conectar con el servidor.');
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = (p: Profile) => {
    if (p.is_admin) { Alert.alert('No podés eliminar un admin.'); return; }
    Alert.alert(
      'Eliminar usuario',
      `¿Eliminar a @${p.username}? Se perderán todos sus registros.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ user_id: p.id }),
            });
            await load();
          },
        },
      ]
    );
  };

  if (!isAdmin && !loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ionicons name="lock-closed" size={48} color={C.border} />
          <Text style={{ color: C.muted, fontSize: 14 }}>Acceso restringido</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top','left','right']}>
      <View style={s.header}>
        <Text style={s.logo}>ALGO<Text style={{ color: C.primary }}>R</Text>LIFT</Text>
        <View style={s.headerBadge}>
          <Ionicons name="shield-checkmark" size={12} color={C.primary} />
          <Text style={s.headerBadgeTxt}>ADMIN</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.titleRow}>
          <Text style={s.pageTitle}>Usuarios</Text>
          <TouchableOpacity style={s.newBtn} onPress={() => setCreateOpen(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.newBtnTxt}>CREAR</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
        ) : (
          profiles.map(p => (
            <View key={p.id} style={s.userCard}>
              <View style={[s.avatar, p.is_admin && { backgroundColor: C.primary + '22', borderColor: C.primary }]}>
                <Text style={[s.avatarTxt, p.is_admin && { color: C.primary }]}>
                  {p.display_name[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.userName}>{p.display_name}</Text>
                  {p.is_admin && (
                    <View style={s.adminBadge}>
                      <Text style={s.adminBadgeTxt}>ADMIN</Text>
                    </View>
                  )}
                </View>
                <Text style={s.userSlug}>@{p.username}</Text>
                <Text style={s.userDate}>
                  Creado {new Date(p.created_at).toLocaleDateString('es-AR')}
                </Text>
              </View>
              {!p.is_admin && (
                <TouchableOpacity onPress={() => deleteUser(p)} style={{ padding: 8 }}>
                  <Ionicons name="trash-outline" size={16} color={C.muted} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Create User Modal */}
      <Modal visible={createOpen} animationType="slide" transparent>
        <View style={s.overlay}>
          <SafeAreaView style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Crear usuario</Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)} style={s.closeBtn}>
                <Ionicons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.sheetScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>NOMBRE DE USUARIO</Text>
              <Text style={s.fieldHint}>Solo letras y números, sin espacios. Así entra al login.</Text>
              <View style={s.inputRow}>
                <Text style={s.inputPrefix}>@</Text>
                <TextInput
                  style={s.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="hermano"
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={[s.fieldLabel, { marginTop: 16 }]}>NOMBRE PARA MOSTRAR</Text>
              <Text style={s.fieldHint}>Cómo aparece en la app. Puede tener mayúsculas.</Text>
              <View style={s.inputRow}>
                <TextInput
                  style={s.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Nombre (opcional)"
                  placeholderTextColor={C.muted}
                />
              </View>

              <Text style={[s.fieldLabel, { marginTop: 16 }]}>CONTRASEÑA</Text>
              <Text style={s.fieldHint}>Mínimo 6 caracteres.</Text>
              <View style={s.inputRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={C.muted}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} style={{ padding: 4 }}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={15} color={C.muted} />
                </TouchableOpacity>
              </View>

              {username.trim().length > 0 && password.trim().length > 0 && (
                <View style={s.preview}>
                  <Ionicons name="information-circle-outline" size={14} color={C.traccion} />
                  <Text style={s.previewTxt}>
                    Va a entrar con usuario <Text style={{ color: C.text, fontWeight: '800' }}>
                      {username.trim().toLowerCase()}
                    </Text> y la contraseña que pusiste.
                  </Text>
                </View>
              )}

              {createError ? (
                <View style={{ backgroundColor: '#ff000020', borderWidth: 1, borderColor: '#ff000060', borderRadius: 10, padding: 12, marginTop: 14 }}>
                  <Text style={{ color: '#ff4444', fontSize: 13, fontWeight: '600' }}>{createError}</Text>
                </View>
              ) : null}
              {createSuccess ? (
                <View style={{ backgroundColor: C.success + '20', borderWidth: 1, borderColor: C.success + '60', borderRadius: 10, padding: 12, marginTop: 14 }}>
                  <Text style={{ color: C.success, fontSize: 13, fontWeight: '600' }}>{createSuccess}</Text>
                </View>
              ) : null}

              <TouchableOpacity onPress={createUser} disabled={creating} activeOpacity={0.85} style={{ marginTop: 16 }}>
                <LinearGradient
                  colors={[C.primary, '#D91646']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[s.createBtn, creating && { opacity: 0.6 }]}
                >
                  {creating
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.createBtnTxt}>CREAR USUARIO</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  logo: { fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primaryDim, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  headerBadgeTxt: { fontSize: 9, color: C.primary, fontWeight: '900', letterSpacing: 1 },

  scroll: { padding: 14, paddingBottom: 100, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  pageTitle: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  newBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },

  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 16, fontWeight: '900', color: C.textSub },
  userName: { fontSize: 15, fontWeight: '800', color: C.text },
  userSlug: { fontSize: 11, color: C.muted, fontWeight: '600', marginTop: 2 },
  userDate: { fontSize: 10, color: C.mutedLight, marginTop: 2 },
  adminBadge: { backgroundColor: C.primaryDim, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  adminBadgeTxt: { fontSize: 8, color: C.primary, fontWeight: '900', letterSpacing: 0.5 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, maxHeight: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: C.border },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: C.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  sheetScroll: { padding: 20, paddingBottom: 60 },

  fieldLabel: { fontSize: 10, color: C.mutedLight, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  fieldHint: { fontSize: 11, color: C.muted, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, height: 46 },
  inputPrefix: { fontSize: 16, color: C.muted, fontWeight: '700', marginRight: 4 },
  input: { flex: 1, color: C.text, fontSize: 14, fontWeight: '500' },

  preview: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.traccion + '12', borderWidth: 1, borderColor: C.traccion + '30', borderRadius: 10, padding: 12, marginTop: 14 },
  previewTxt: { flex: 1, fontSize: 12, color: C.textSub, lineHeight: 18 },

  createBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  createBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
