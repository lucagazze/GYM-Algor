import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { workoutService, Exercise } from '../utils/workoutService';

const CAT_COLOR: Record<string, string> = {
  EMPUJE: '#E63946', TRACCION: '#3B82F6', PIERNA: '#10B981', SKILL: '#F59E0B',
};

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

  useFocusEffect(
    useCallback(() => { loadExercises(); }, [])
  );

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
      if (window.confirm(`¿Eliminar "${ex.name}"? Se perderán todos sus registros.`)) {
        doDelete();
      }
      return;
    }

    Alert.alert(
      'Eliminar ejercicio',
      `¿Eliminar "${ex.name}"? Se perderán todos sus registros.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: doDelete,
        },
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
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      {/* ── Header ──────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>EJERCICIOS</Text>
        <TouchableOpacity style={s.addBtn} onPress={openNew}>
          <Ionicons name="add" size={22} color="#FFF" />
          <Text style={s.addBtnTxt}>NUEVO</Text>
        </TouchableOpacity>
      </View>

      {/* ── Category Filter ──────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {cats.map(c => (
          <TouchableOpacity
            key={c}
            style={[s.catChip, filterCat === c && { backgroundColor: c === 'TODOS' ? '#2A2A2A' : (CAT_COLOR[c] ?? '#2A2A2A'), borderColor: 'transparent' }]}
            onPress={() => setFilterCat(c)}
          >
            {c !== 'TODOS' && <Text>{CAT_ICON[c] ?? ''} </Text>}
            <Text style={[s.catChipTxt, filterCat === c && { color: '#FFF' }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color="#E63946" size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          {Object.entries(grouped).map(([cat, items]) => (
            <View key={cat} style={s.catSection}>
              <View style={[s.catSectionHeader, { borderLeftColor: CAT_COLOR[cat] }]}>
                <Text style={s.catSectionIcon}>{CAT_ICON[cat]}</Text>
                <Text style={[s.catSectionLabel, { color: CAT_COLOR[cat] }]}>{cat}</Text>
                <Text style={s.catSectionCount}>{items.length}</Text>
              </View>
              {items.map(ex => (
                <TouchableOpacity key={ex.id} style={s.exCard} onPress={() => openEdit(ex)} activeOpacity={0.8}>
                  <View style={[s.exBar, { backgroundColor: CAT_COLOR[ex.category] }]} />
                  <View style={{ flex: 1 }}>
                    <View style={s.exTopRow}>
                      <Text style={s.exName}>{ex.name}</Text>
                      {ex.is_custom && (
                        <View style={s.customBadge}>
                          <Text style={s.customBadgeTxt}>CUSTOM</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.exMetaRow}>
                      <Text style={s.exMeta}>
                        {ex.tracking_type === 'weight' ? '⚖️ Peso + Reps' : ex.tracking_type === 'time' ? '⏱️ Segundos' : '🔢 Repeticiones'}
                      </Text>
                      {ex.muscle_group ? <Text style={s.exMeta}> · {ex.muscle_group}</Text> : null}
                    </View>
                    {ex.notes ? <Text style={s.exNotes}>{ex.notes}</Text> : null}
                  </View>
                  <View style={s.exActions}>
                    <TouchableOpacity
                      style={s.favBtn}
                      onPress={async () => {
                        await workoutService.toggleFavorite(ex.id);
                        await loadExercises();
                      }}
                    >
                      <Ionicons name={ex.is_favorite ? 'star' : 'star-outline'} size={16} color={ex.is_favorite ? '#F59E0B' : '#333'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.editBtn} onPress={() => openEdit(ex)}>
                      <Ionicons name="pencil-outline" size={16} color="#555" />
                    </TouchableOpacity>
                    {ex.is_custom && (
                      <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(ex)}>
                        <Ionicons name="trash-outline" size={16} color="#E63946" />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {Object.keys(grouped).length === 0 && (
            <View style={s.empty}>
              <Ionicons name="barbell-outline" size={56} color="#222" />
              <Text style={s.emptyTxt}>No hay ejercicios en esta categoría</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Create / Edit Modal ──────────────────────── */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={s.overlay}>
          <SafeAreaView style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editTarget ? 'EDITAR EJERCICIO' : 'NUEVO EJERCICIO'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">
              {/* Name */}
              <Text style={s.fieldLabel}>NOMBRE DEL EJERCICIO</Text>
              <TextInput
                style={s.field}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Ej: Dominadas Prona"
                placeholderTextColor="#333"
              />

              {/* Category */}
              <Text style={s.fieldLabel}>CATEGORÍA</Text>
              <View style={s.optRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[s.optBtn, form.category === cat && { backgroundColor: CAT_COLOR[cat] + '22', borderColor: CAT_COLOR[cat] }]}
                    onPress={() => setForm(f => ({ ...f, category: cat }))}
                  >
                    <Text style={s.optEmoji}>{CAT_ICON[cat]}</Text>
                    <Text style={[s.optLabel, form.category === cat && { color: CAT_COLOR[cat] }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tracking type */}
              <Text style={s.fieldLabel}>TIPO DE SEGUIMIENTO</Text>
              {TRACKING_TYPES.map(tt => (
                <TouchableOpacity
                  key={tt.key}
                  style={[s.trackingOpt, form.tracking_type === tt.key && s.trackingOptActive]}
                  onPress={() => setForm(f => ({ ...f, tracking_type: tt.key }))}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.trackingLabel, form.tracking_type === tt.key && { color: '#E63946' }]}>{tt.label}</Text>
                    <Text style={s.trackingDesc}>{tt.desc}</Text>
                  </View>
                  {form.tracking_type === tt.key && <Ionicons name="checkmark-circle" size={20} color="#E63946" />}
                </TouchableOpacity>
              ))}

              {/* Optional fields */}
              <Text style={s.fieldLabel}>GRUPO MUSCULAR (opcional)</Text>
              <TextInput
                style={s.field}
                value={form.muscle_group}
                onChangeText={v => setForm(f => ({ ...f, muscle_group: v }))}
                placeholder="Ej: Tríceps, Pecho, Espalda..."
                placeholderTextColor="#333"
              />

              <Text style={s.fieldLabel}>NOTAS (opcional)</Text>
              <TextInput
                style={[s.field, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                placeholder="Cómo hacerlo, tips de técnica..."
                placeholderTextColor="#333"
                multiline
              />

              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={s.saveBtnTxt}>{editTarget ? 'GUARDAR CAMBIOS' : 'CREAR EJERCICIO'}</Text>
                }
              </TouchableOpacity>

              {editTarget && editTarget.is_custom && (
                <TouchableOpacity style={s.deleteModalBtn} onPress={() => { setModalOpen(false); handleDelete(editTarget); }}>
                  <Ionicons name="trash-outline" size={18} color="#E63946" />
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
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#161616' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E63946', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },

  catRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#141414', maxHeight: 46, flexGrow: 0 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  catChipTxt: { color: '#666', fontSize: 11, fontWeight: '700' },

  scroll: { padding: 12, paddingBottom: 50, gap: 12 },

  catSection: { gap: 6 },
  catSectionHeader: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, paddingLeft: 10, gap: 7 },
  catSectionIcon: { fontSize: 14 },
  catSectionLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8, flex: 1 },
  catSectionCount: { fontSize: 11, color: '#444', fontWeight: '700' },

  exCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderWidth: 1, borderColor: '#1E1E1E', borderRadius: 12, overflow: 'hidden' },
  exBar: { width: 3, alignSelf: 'stretch' },
  exTopRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, padding: 10, paddingBottom: 3, paddingLeft: 12 },
  exName: { fontSize: 14, fontWeight: '800', color: '#EEE', flex: 1 },
  customBadge: { backgroundColor: '#1E1E1E', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  customBadgeTxt: { fontSize: 9, color: '#888', fontWeight: '900', letterSpacing: 0.5 },
  exMetaRow: { flexDirection: 'row', paddingLeft: 12, paddingBottom: 8, paddingRight: 12 },
  exMeta: { fontSize: 10, color: '#555', fontWeight: '600' },
  exNotes: { fontSize: 10, color: '#444', fontStyle: 'italic', paddingLeft: 12, paddingBottom: 8 },
  exActions: { flexDirection: 'column', alignItems: 'center', paddingRight: 10, gap: 8 },
  favBtn: { padding: 5 },
  editBtn: { padding: 5 },
  deleteBtn: { padding: 5 },

  empty: { paddingTop: 50, alignItems: 'center', gap: 12 },
  emptyTxt: { color: '#333', fontSize: 14, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111', maxHeight: '95%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: '#222' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  sheetTitle: { fontSize: 15, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  formScroll: { padding: 16, gap: 0, paddingBottom: 36 },
  fieldLabel: { fontSize: 9, color: '#555', fontWeight: '800', letterSpacing: 1, marginBottom: 7, marginTop: 14 },
  field: { backgroundColor: '#0A0A0A', color: '#FFF', paddingHorizontal: 14, height: 46, borderRadius: 10, fontSize: 15, fontWeight: '700', borderWidth: 1, borderColor: '#222' },

  optRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  optBtn: { flex: 1, minWidth: '45%', alignItems: 'center', backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#222', borderRadius: 10, padding: 10 },
  optEmoji: { fontSize: 16, marginBottom: 3 },
  optLabel: { fontSize: 10, color: '#666', fontWeight: '800', letterSpacing: 0.5 },

  trackingOpt: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1E1E1E', borderRadius: 10, padding: 10, marginBottom: 6 },
  trackingOptActive: { borderColor: '#E63946', backgroundColor: '#1E0810' },
  trackingLabel: { fontSize: 13, fontWeight: '800', color: '#CCC' },
  trackingDesc: { fontSize: 10, color: '#555', marginTop: 2 },

  saveBtn: { backgroundColor: '#E63946', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  saveBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 15, letterSpacing: 1 },

  deleteModalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, padding: 12 },
  deleteModalBtnTxt: { color: '#E63946', fontWeight: '800', fontSize: 13 },
});
