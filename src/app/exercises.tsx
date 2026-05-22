import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { workoutService, Exercise } from '../utils/workoutService';
import { C, CAT_COLOR } from '../constants/theme';

const CAT_ICON: Record<string, string> = {
  EMPUJE: '💪', TRACCION: '🙌', PIERNA: '🦵', SKILL: '⭐',
};

type Category = 'EMPUJE' | 'TRACCION' | 'PIERNA' | 'SKILL';
type TrackingType = 'weight' | 'time' | 'reps';

const CATEGORIES: Category[] = ['EMPUJE', 'TRACCION', 'PIERNA', 'SKILL'];
const TRACKING_TYPES: { key: TrackingType; label: string; desc: string }[] = [
  { key: 'weight', label: 'Peso + Reps', desc: 'Calcula 1RM estimado (lastre + peso corporal)' },
  { key: 'time', label: 'Segundos', desc: 'Para holds e isométricos (Front Lever, L-Sit...)' },
  { key: 'reps', label: 'Repeticiones', desc: 'Solo cuenta reps, sin peso (Muscle Ups...)' },
];

interface FormState {
  name: string;
  category: Category;
  tracking_type: TrackingType;
  muscle_group: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  name: '',
  category: 'EMPUJE',
  tracking_type: 'weight',
  muscle_group: '',
  notes: '',
});

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Exercise | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState<string>('TODOS');

  useFocusEffect(useCallback(() => { loadExercises(); }, []));

  const loadExercises = async () => {
    setLoading(true);
    const list = await workoutService.getExercises();
    setExercises(list);
    setLoading(false);
  };

  const openNew = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (ex: Exercise) => {
    setEditTarget(ex);
    setForm({
      name: ex.name,
      category: ex.category as Category,
      tracking_type: ex.tracking_type as TrackingType,
      muscle_group: ex.muscle_group ?? '',
      notes: ex.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Falta nombre', 'Ingresá un nombre para el ejercicio.');
      return;
    }
    setSaving(true);
    if (editTarget) {
      const { error } = await workoutService.updateExercise(editTarget.id, {
        name: form.name.trim(),
        category: form.category,
        tracking_type: form.tracking_type,
        muscle_group: form.muscle_group,
        notes: form.notes,
      });
      if (error) Alert.alert('Error', error);
    } else {
      const { error } = await workoutService.createExercise({
        name: form.name.trim(),
        category: form.category,
        tracking_type: form.tracking_type,
        muscle_group: form.muscle_group,
        notes: form.notes,
        is_custom: true,
      });
      if (error) Alert.alert('Error', error);
    }
    setSaving(false);
    setModalOpen(false);
    await loadExercises();
  };

  const handleDelete = (ex: Exercise) => {
    const doDelete = async () => {
      const { error } = await workoutService.deleteExercise(ex.id);
      if (error) Alert.alert('Error', error);
      else await loadExercises();
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar "${ex.name}"? Se perderán todos sus registros.`)) doDelete();
      return;
    }
    Alert.alert(
      'Eliminar ejercicio',
      `¿Eliminar "${ex.name}"? Se perderán todos sus registros.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  const cats = ['TODOS', ...CATEGORIES];
  const filtered = filterCat === 'TODOS' ? exercises : exercises.filter(e => e.category === filterCat);
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(e => e.category === cat)
      .sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0));
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <SafeAreaView style={s.container} edges={['top','left','right']}>
      <View style={s.header}>
        <Text style={s.logo}>ALGO<Text style={{ color: C.primary }}>R</Text>LIFT</Text>
        <TouchableOpacity style={s.addBtn} onPress={openNew}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnTxt}>NUEVO</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.catRow}
        contentContainerStyle={{ gap: 7, paddingHorizontal: 14 }}
      >
        {cats.map(c => {
          const active = filterCat === c;
          const col = c === 'TODOS' ? C.primary : (CAT_COLOR[c] ?? C.primary);
          return (
            <TouchableOpacity
              key={c}
              style={[s.catChip, active && { backgroundColor: col + '22', borderColor: col }]}
              onPress={() => setFilterCat(c)}
            >
              {c !== 'TODOS' && <Text style={{ fontSize: 11 }}>{CAT_ICON[c] ?? ''} </Text>}
              <Text style={[s.catChipTxt, active && { color: col }]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.pageTitle}>Ejercicios</Text>

          {Object.entries(grouped).map(([cat, items]) => (
            <View key={cat} style={s.catSection}>
              <View style={[s.catSectionHeader, { borderLeftColor: CAT_COLOR[cat] }]}>
                <Text style={s.catSectionIcon}>{CAT_ICON[cat]}</Text>
                <Text style={[s.catSectionLabel, { color: CAT_COLOR[cat] }]}>{cat}</Text>
                <Text style={s.catSectionCount}>{items.length}</Text>
              </View>
              {items.map(ex => (
                <TouchableOpacity
                  key={ex.id}
                  style={s.exCard}
                  onPress={() => openEdit(ex)}
                  activeOpacity={0.8}
                >
                  <View style={[s.exBar, { backgroundColor: CAT_COLOR[ex.category] ?? C.muted }]} />
                  <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
                    <View style={s.exTopRow}>
                      <Text style={s.exName}>{ex.name}</Text>
                      {ex.is_custom && (
                        <View style={s.customBadge}>
                          <Text style={s.customBadgeTxt}>CUSTOM</Text>
                        </View>
                      )}
                      {ex.is_favorite && (
                        <Ionicons name="star" size={12} color="#F59E0B" />
                      )}
                    </View>
                    <Text style={s.exMeta}>
                      {ex.tracking_type === 'weight' ? '⚖️ Peso + Reps' :
                       ex.tracking_type === 'time' ? '⏱️ Segundos' : '🔢 Repeticiones'}
                      {ex.muscle_group ? ` · ${ex.muscle_group}` : ''}
                    </Text>
                    {ex.notes ? <Text style={s.exNotes}>{ex.notes}</Text> : null}
                  </View>
                  <View style={s.exActions}>
                    <TouchableOpacity
                      style={s.actionBtn}
                      onPress={async () => {
                        await workoutService.toggleFavorite(ex.id);
                        await loadExercises();
                      }}
                    >
                      <Ionicons
                        name={ex.is_favorite ? 'star' : 'star-outline'}
                        size={15}
                        color={ex.is_favorite ? '#F59E0B' : C.muted}
                      />
                    </TouchableOpacity>
                    {ex.is_custom && (
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={() => handleDelete(ex)}
                      >
                        <Ionicons name="trash-outline" size={15} color={C.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {Object.keys(grouped).length === 0 && (
            <View style={s.empty}>
              <Ionicons name="barbell-outline" size={52} color="#222" />
              <Text style={s.emptyTxt}>No hay ejercicios en esta categoría</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Create / Edit Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={s.overlay}>
          <SafeAreaView style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editTarget ? 'EDITAR EJERCICIO' : 'NUEVO EJERCICIO'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>NOMBRE</Text>
              <TextInput
                style={s.field}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Ej: Dominadas Prona"
                placeholderTextColor={C.muted}
              />

              <Text style={s.fieldLabel}>CATEGORÍA</Text>
              <View style={s.optRow}>
                {CATEGORIES.map(cat => {
                  const col = CAT_COLOR[cat];
                  const active = form.category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[s.optBtn, active && { backgroundColor: col + '22', borderColor: col }]}
                      onPress={() => setForm(f => ({ ...f, category: cat }))}
                    >
                      <Text style={s.optEmoji}>{CAT_ICON[cat]}</Text>
                      <Text style={[s.optLabel, active && { color: col }]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.fieldLabel}>TIPO DE SEGUIMIENTO</Text>
              {TRACKING_TYPES.map(tt => {
                const active = form.tracking_type === tt.key;
                return (
                  <TouchableOpacity
                    key={tt.key}
                    style={[s.trackingOpt, active && s.trackingOptActive]}
                    onPress={() => setForm(f => ({ ...f, tracking_type: tt.key }))}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.trackingLabel, active && { color: C.primary }]}>{tt.label}</Text>
                      <Text style={s.trackingDesc}>{tt.desc}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
                  </TouchableOpacity>
                );
              })}

              <Text style={s.fieldLabel}>GRUPO MUSCULAR (opcional)</Text>
              <TextInput
                style={s.field}
                value={form.muscle_group}
                onChangeText={v => setForm(f => ({ ...f, muscle_group: v }))}
                placeholder="Ej: Tríceps, Pecho, Espalda..."
                placeholderTextColor={C.muted}
              />

              <Text style={s.fieldLabel}>NOTAS (opcional)</Text>
              <TextInput
                style={[s.field, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                placeholder="Tips de técnica..."
                placeholderTextColor={C.muted}
                multiline
              />

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[C.primary, '#D91646']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[s.saveBtn, saving && { opacity: 0.6 }]}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.saveBtnTxt}>{editTarget ? 'GUARDAR CAMBIOS' : 'CREAR EJERCICIO'}</Text>}
                </LinearGradient>
              </TouchableOpacity>

              {editTarget?.is_custom && (
                <TouchableOpacity
                  style={s.deleteModalBtn}
                  onPress={() => { setModalOpen(false); handleDelete(editTarget); }}
                >
                  <Ionicons name="trash-outline" size={16} color={C.error} />
                  <Text style={s.deleteModalBtnTxt}>Eliminar ejercicio</Text>
                </TouchableOpacity>
              )}
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
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },

  catRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, maxHeight: 50, flexGrow: 0 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  catChipTxt: { color: C.mutedLight, fontSize: 11, fontWeight: '800' },

  scroll: { padding: 12, paddingBottom: 100, gap: 14 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: -0.5, marginBottom: 2 },

  catSection: { gap: 8 },
  catSectionHeader: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, paddingLeft: 10, gap: 6 },
  catSectionIcon: { fontSize: 14 },
  catSectionLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1, flex: 1 },
  catSectionCount: { fontSize: 11, color: C.muted, fontWeight: '700' },

  exCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  exBar: { width: 4, alignSelf: 'stretch' },
  exTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  exName: { fontSize: 15, fontWeight: '900', color: C.text, flex: 1 },
  customBadge: { backgroundColor: C.surfaceHigh, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  customBadgeTxt: { fontSize: 8, color: C.mutedLight, fontWeight: '900', letterSpacing: 0.5 },
  exMeta: { fontSize: 11, color: C.muted, fontWeight: '700' },
  exNotes: { fontSize: 10, color: C.mutedLight, fontStyle: 'italic', marginTop: 4 },
  exActions: { flexDirection: 'column', alignItems: 'center', paddingRight: 10, gap: 10 },
  actionBtn: { padding: 6 },

  empty: { paddingTop: 60, alignItems: 'center', gap: 10 },
  emptyTxt: { color: C.mutedLight, fontSize: 15, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, maxHeight: '92%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: C.border },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  sheetScroll: { padding: 16, paddingBottom: 60, gap: 14 },
  formScroll: { padding: 16, paddingBottom: 60, gap: 14 },
  fieldLabel: { fontSize: 10, color: C.mutedLight, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  field: { backgroundColor: C.bg, color: C.text, paddingHorizontal: 14, height: 44, borderRadius: 12, fontSize: 14, fontWeight: '700', borderWidth: 1, borderColor: C.border },

  optRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optBtn: { flex: 1, minWidth: '45%', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12 },
  optEmoji: { fontSize: 18, marginBottom: 4 },
  optLabel: { fontSize: 10, color: C.mutedLight, fontWeight: '800', letterSpacing: 0.5 },

  trackingOpt: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  trackingOptActive: { borderColor: C.primary, backgroundColor: C.primaryDim },
  trackingLabel: { fontSize: 13, fontWeight: '800', color: C.text },
  trackingDesc: { fontSize: 11, color: C.muted, marginTop: 4 },

  saveBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1 },

  deleteModalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: 14 },
  deleteModalBtnTxt: { color: C.error, fontWeight: '800', fontSize: 14 },
});
