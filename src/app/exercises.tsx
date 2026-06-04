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
import { MUSCLE_ORDER, MUSCLE_COLOR, getMuscle, muscleChips } from '../constants/muscles';

type Category = 'EMPUJE' | 'TRACCION' | 'PIERNA' | 'SKILL';
type TrackingType = 'weight' | 'time' | 'reps';

const CATEGORIES: Category[] = ['EMPUJE', 'TRACCION', 'PIERNA', 'SKILL'];
const TRACKING_TYPES: { key: TrackingType; label: string; desc: string }[] = [
  { key: 'weight', label: 'Peso + Reps', desc: 'Calcula 1RM estimado (lastre + peso corporal)' },
  { key: 'time', label: 'Segundos', desc: 'Para holds e isométricos (Front Lever, L-Sit...)' },
  { key: 'reps', label: 'Repeticiones', desc: 'Solo cuenta reps, sin peso (Muscle Ups...)' },
];

// Auto-derive category from muscle group
const MUSCLE_TO_CATEGORY: Record<string, Category> = {
  'Pecho': 'EMPUJE', 'Hombros': 'EMPUJE', 'Tríceps': 'EMPUJE',
  'Bíceps': 'TRACCION', 'Espalda': 'TRACCION', 'Trapecios': 'TRACCION',
  'Cuádriceps': 'PIERNA', 'Isquiotibiales': 'PIERNA', 'Glúteos': 'PIERNA',
  'Gemelos': 'PIERNA', 'Sóleo': 'PIERNA',
  'Core': 'SKILL', 'Abdominales': 'SKILL', 'Otros': 'EMPUJE',
};

interface FormState {
  name: string;
  category: Category;
  tracking_type: TrackingType;
  muscle_group: string;
}

const emptyForm = (): FormState => ({
  name: '',
  category: 'EMPUJE',
  tracking_type: 'weight',
  muscle_group: '',
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
      });
      if (error) Alert.alert('Error', error);
    } else {
      const { error } = await workoutService.createExercise({
        name: form.name.trim(),
        category: form.category,
        tracking_type: form.tracking_type,
        muscle_group: form.muscle_group,
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

  const getMuscle = (ex: Exercise): string => ex.muscle_group?.trim() || 'Otros';

  // Build filter chips from actual muscle groups in canonical order
  const availableMuscles = MUSCLE_ORDER.filter(m =>
    exercises.some(e => getMuscle(e) === m)
  );
  const cats = ['TODOS', ...availableMuscles];

  const filtered = filterCat === 'TODOS'
    ? exercises
    : exercises.filter(e => getMuscle(e) === filterCat);

  const grouped: Record<string, Exercise[]> = {};
  for (const ex of filtered) {
    const m = getMuscle(ex);
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(ex);
  }
  // Sort items within each group: favorites first, then alphabetical
  for (const m of Object.keys(grouped)) {
    grouped[m].sort((a, b) =>
      (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0) ||
      a.name.localeCompare(b.name)
    );
  }
  // Sort groups by canonical order
  const sortedMuscles = MUSCLE_ORDER.filter(m => grouped[m])
    .concat(Object.keys(grouped).filter(m => !MUSCLE_ORDER.includes(m)));

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
        contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingVertical: 10 }}
      >
        {cats.map(c => {
          const active = filterCat === c;
          const col = c === 'TODOS' ? C.primary : (MUSCLE_COLOR[c] ?? C.primary);
          return (
            <TouchableOpacity
              key={c}
              style={[s.catChip, active && { backgroundColor: col + '22', borderColor: col }]}
              onPress={() => setFilterCat(c)}
            >
              <Text style={[s.catChipTxt, active && { color: col }]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          {sortedMuscles.map(muscle => {
            const items = grouped[muscle];
            if (!items?.length) return null;
            const cc = MUSCLE_COLOR[muscle] ?? C.muted;
            return (
              <View key={muscle} style={s.catSection}>
                {/* Section header */}
                <View style={[s.catSectionHeader, { borderLeftColor: cc }]}>
                  <Text style={[s.catSectionLabel, { color: cc }]}>{muscle.toUpperCase()}</Text>
                  <Text style={s.catSectionCount}>{items.length}</Text>
                </View>

                {/* Table */}
                <View style={s.tableWrap}>
                  {items.map((ex, i) => {
                    const typeIcon = ex.tracking_type === 'time' ? '⏱' : ex.tracking_type === 'reps' ? '🔢' : '⚖️';
                    return (
                      <TouchableOpacity
                        key={ex.id}
                        style={[s.exRow, i % 2 === 1 && s.exRowAlt]}
                        onPress={() => openEdit(ex)}
                        activeOpacity={0.7}
                      >
                        <View style={[s.exColorBar, { backgroundColor: cc }]} />
                        <Text style={s.exName} numberOfLines={1}>{ex.name}</Text>
                        {ex.muscle_group ? (
                          <Text style={s.exMuscle} numberOfLines={1}>{ex.muscle_group}</Text>
                        ) : null}
                        <TouchableOpacity
                          onPress={async (e) => {
                            e.stopPropagation?.();
                            await workoutService.toggleFavorite(ex.id);
                            await loadExercises();
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                        >
                          <Ionicons
                            name={ex.is_favorite ? 'star' : 'star-outline'}
                            size={13}
                            color={ex.is_favorite ? '#F59E0B' : C.surfaceHigh}
                          />
                        </TouchableOpacity>
                        {ex.is_custom && (
                          <View style={s.customBadge}>
                            <Text style={s.customBadgeTxt}>+</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {sortedMuscles.length === 0 && (
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

              <Text style={s.fieldLabel}>GRUPO MUSCULAR</Text>
              <View style={s.muscleGrid}>
                {MUSCLE_ORDER.map(m => {
                  const active = form.muscle_group === m;
                  const col = MUSCLE_COLOR[m] ?? C.muted;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[s.muscleChip, active && { backgroundColor: col + '28', borderColor: col }]}
                      onPress={() => setForm(f => ({
                        ...f,
                        muscle_group: m,
                        category: MUSCLE_TO_CATEGORY[m] ?? 'EMPUJE',
                      }))}
                    >
                      <Text style={[s.muscleChipTxt, active && { color: col }]}>{m}</Text>
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

  catRow: { borderBottomWidth: 1, borderBottomColor: C.border, flexGrow: 0, minHeight: 46 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  catChipTxt: { color: C.mutedLight, fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },

  scroll: { padding: 12, paddingBottom: 100, gap: 6 },

  catSection: { gap: 0 },
  catSectionHeader: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 8, gap: 6, marginTop: 6 },
  catSectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, flex: 1 },
  catSectionCount: { fontSize: 10, color: C.muted, fontWeight: '700' },

  tableWrap: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  exRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  exRowAlt: { backgroundColor: C.surfaceHigh + '55' },
  exColorBar: { width: 3, height: 16, borderRadius: 2 },
  exName: { flex: 1, fontSize: 13, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  exMuscle: { fontSize: 10, color: C.muted, fontWeight: '600', maxWidth: 80 },
  exTypeIcon: { fontSize: 12, width: 18, textAlign: 'center' },
  customBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.primary + '33', alignItems: 'center', justifyContent: 'center' },
  customBadgeTxt: { fontSize: 11, color: C.primary, fontWeight: '900' },

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

  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muscleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  muscleChipTxt: { fontSize: 12, color: C.mutedLight, fontWeight: '700' },

  trackingOpt: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  trackingOptActive: { borderColor: C.primary, backgroundColor: C.primaryDim },
  trackingLabel: { fontSize: 13, fontWeight: '800', color: C.text },
  trackingDesc: { fontSize: 11, color: C.muted, marginTop: 4 },

  saveBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1 },

  deleteModalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: 14 },
  deleteModalBtnTxt: { color: C.error, fontWeight: '800', fontSize: 14 },
});
