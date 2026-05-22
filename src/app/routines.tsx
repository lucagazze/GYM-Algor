import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, FlatList, Platform, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { C, CAT_COLOR } from '../constants/theme';
import { routineService, Routine, ActiveSession } from '../utils/routineService';
import { workoutService, Exercise, WorkoutLog, RM } from '../utils/workoutService';
import PlateCalculator from '../components/PlateCalculator';

function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtTimer(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60).toString().padStart(2,'0');
  const sec = (s % 60).toString().padStart(2,'0');
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
}
function fmtShortDate(d: string) {
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : d;
}

function RowStepper({ label, value, onChange, step = 1, min = 0, decimals = 0, onPressCalc }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; decimals?: number; onPressCalc?: () => void;
}) {
  const fmt = (v: number) => decimals > 0 ? v.toFixed(decimals) : String(v);
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100));
  const inc = () => onChange(Math.round((value + step) * 100) / 100);
  return (
    <View style={rs.row}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={rs.label}>{label}</Text>
        {onPressCalc && (
          <TouchableOpacity onPress={onPressCalc} style={rs.calcBtn}>
            <Ionicons name="calculator" size={14} color={C.primary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={rs.stepper}>
        <TouchableOpacity onPress={dec} style={rs.btn} activeOpacity={0.5}>
          <Text style={rs.btnTxt}>−</Text>
        </TouchableOpacity>
        <View style={rs.valBox}>
          <TextInput
            style={rs.val}
            value={fmt(value)}
            onChangeText={t => {
              const n = parseFloat(t.replace(',', '.'));
              if (!isNaN(n) && n >= min) onChange(n);
            }}
            keyboardType="decimal-pad"
            textAlign="center"
            selectTextOnFocus
          />
        </View>
        <TouchableOpacity onPress={inc} style={rs.btn} activeOpacity={0.5}>
          <Text style={rs.btnTxt}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const rs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  label: { fontSize: 13, color: C.textSub, fontWeight: '500', letterSpacing: -0.1 },
  calcBtn: { backgroundColor: C.primaryDim, padding: 4, borderRadius: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { width: 34, height: 34, backgroundColor: C.surfaceHigh, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: C.text, fontSize: 20, fontWeight: '400', lineHeight: 22, marginTop: -1 },
  valBox: { width: 70, height: 36, backgroundColor: C.bg, borderRadius: 10, justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  val: { color: C.text, fontSize: 16, fontWeight: '700', backgroundColor: 'transparent', textAlign: 'center' },
});

export default function RoutinesScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit routine modal
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState('');
  const [selectedExIds, setSelectedExIds] = useState<number[]>([]);
  const [exPickerOpen, setExPickerOpen] = useState(false);
  const [exSearch, setExSearch] = useState('');
  const [exCatFilter, setExCatFilter] = useState('TODOS');

  // Session state
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionSecs, setSessionSecs] = useState(0);
  const sessionTimerRef = useRef<any>(null);

  // Per-exercise session data
  const [todaySets, setTodaySets] = useState<WorkoutLog[]>([]);
  const [lastLog, setLastLog] = useState<WorkoutLog | null>(null);
  const [bodyW, setBodyW] = useState(86);
  const [addedW, setAddedW] = useState(0);
  const [repsVal, setRepsVal] = useState(5);
  const [durVal, setDurVal] = useState(10);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [restActive, setRestActive] = useState(false);
  const [restSecs, setRestSecs] = useState(0);
  const [restTarget, setRestTarget] = useState(90);
  const restRef = useRef<NodeJS.Timeout | null>(null);

  const [calcOpen, setCalcOpen] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  useEffect(() => {
    if (restActive) {
      restRef.current = setInterval(() => {
        setRestSecs(s => {
          const next = s + 1;
          if (next === restTarget) {
            Vibration.vibrate([0, 500, 200, 500, 200, 500]);
          }
          return next;
        });
      }, 1000);
    } else if (restRef.current) clearInterval(restRef.current);
    return () => { if (restRef.current) clearInterval(restRef.current); };
  }, [restActive, restTarget]);

  const load = async () => {
    setLoading(true);
    const [rs, exs] = await Promise.all([
      routineService.getAll(),
      workoutService.getExercises(),
    ]);
    const bw = await workoutService.getSavedBodyWeight();
    setBodyW(parseFloat(bw) || 86);
    setRoutines(rs);
    setExercises(exs);
    setLoading(false);
  };

  const getEx = (id: number) => exercises.find(e => e.id === id);

  // ── Create routine ──────────────────────────────────────────────
  const openCreate = () => {
    setEditingRoutineId(null);
    setRoutineName('');
    setSelectedExIds([]);
    setCreateOpen(true);
  };

  const openEdit = (r: Routine) => {
    setEditingRoutineId(r.id);
    setRoutineName(r.name);
    setSelectedExIds([...r.exerciseIds]);
    setCreateOpen(true);
  };

  const saveRoutine = async () => {
    if (!routineName.trim()) { Alert.alert('Falta el nombre'); return; }
    if (selectedExIds.length === 0) { Alert.alert('Agrega al menos un ejercicio'); return; }
    
    if (editingRoutineId) {
      await routineService.update(editingRoutineId, { name: routineName.trim(), exerciseIds: selectedExIds });
    } else {
      await routineService.create(routineName.trim(), selectedExIds);
    }
    
    setCreateOpen(false);
    load();
  };

  const deleteRoutine = (id: string, name: string) => {
    const doDelete = async () => {
      await routineService.delete(id);
      load();
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar rutina "${name}"?`)) doDelete();
      return;
    }
    Alert.alert('Eliminar', `¿Eliminar rutina "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: doDelete },
    ]);
  };

  const toggleExInRoutine = (id: number) => {
    setSelectedExIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const moveEx = (idx: number, dir: -1 | 1) => {
    const arr = [...selectedExIds];
    if (idx + dir < 0 || idx + dir >= arr.length) return;
    const temp = arr[idx];
    arr[idx] = arr[idx + dir];
    arr[idx + dir] = temp;
    setSelectedExIds(arr);
  };

  // ── Session ─────────────────────────────────────────────────────
  const startSession = async (routine: Routine) => {
    const sess: ActiveSession = {
      routineId: routine.id,
      routineName: routine.name,
      exerciseIds: routine.exerciseIds,
      currentIdx: 0,
      startTime: Date.now(),
    };
    setSession(sess);
    setSessionSecs(0);
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    sessionTimerRef.current = setInterval(() => setSessionSecs(s => s + 1), 1000);
    await loadSessionExData(sess, 0);
    setSessionOpen(true);
  };

  const loadSessionExData = async (sess: ActiveSession, idx: number) => {
    const exId = sess.exerciseIds[idx];
    setAddedW(0); setRepsVal(5); setDurVal(10); setNotes('');
    const [last, today] = await Promise.all([
      workoutService.getLastLog(exId),
      workoutService.getTodayLogs(exId, todayStr()),
    ]);
    const prevLast = last?.date !== todayStr() ? last : null;
    setLastLog(prevLast);
    setTodaySets(today);
  };

  const sessionNext = async () => {
    if (!session) return;
    if (session.currentIdx >= session.exerciseIds.length - 1) {
      confirmEndSession();
      return;
    }
    const newIdx = session.currentIdx + 1;
    const updated = { ...session, currentIdx: newIdx };
    setSession(updated);
    await loadSessionExData(updated, newIdx);
  };

  const sessionPrev = async () => {
    if (!session || session.currentIdx === 0) return;
    const newIdx = session.currentIdx - 1;
    const updated = { ...session, currentIdx: newIdx };
    setSession(updated);
    await loadSessionExData(updated, newIdx);
  };

  const sessionLogSet = async () => {
    if (!session) return;
    const exId = session.exerciseIds[session.currentIdx];
    const ex = getEx(exId);
    if (!ex) return;
    const live1rm = ex.tracking_type === 'weight' ? RM.average(bodyW + addedW, repsVal) : 0;
    setSaving(true);
    await workoutService.saveBodyWeight(String(bodyW));
    const result = await workoutService.saveLog({
      date: todayStr(),
      exercise_id: exId,
      added_weight: ex.tracking_type === 'weight' ? addedW : 0,
      body_weight: bodyW,
      reps: ex.tracking_type === 'reps' ? repsVal : (ex.tracking_type === 'weight' ? repsVal : 0),
      duration_sec: ex.tracking_type === 'time' ? durVal : 0,
      estimated_1rm: live1rm,
      rir: 0,
      notes: notes,
      set_number: todaySets.length + 1,
    });
    setSaving(false);
    if (result.data) {
      setTodaySets(prev => [...prev, result.data!]);
      setNotes('');
      setRestSecs(0); setRestActive(true);
      if (result.data.is_pr) {
        Vibration.vibrate([0, 100, 50, 100]);
        Alert.alert('🏆 RÉCORD', `1RM: ${RM.format(live1rm)} kg`);
      } else {
        Vibration.vibrate(50);
      }
    }
  };

  const copyLastToSession = (overload = false) => {
    if (!lastLog || !session) return;
    const ex = getEx(session.exerciseIds[session.currentIdx]);
    if (!ex) return;
    if (ex.tracking_type === 'weight') { setAddedW((lastLog.added_weight||0) + (overload ? 1.25 : 0)); setRepsVal(lastLog.reps||5); }
    else if (ex.tracking_type === 'time') setDurVal((lastLog.duration_sec||10) + (overload ? 5 : 0));
    else setRepsVal((lastLog.reps||5) + (overload ? 1 : 0));
    Vibration.vibrate(30);
  };

  const confirmEndSession = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Terminar sesión? ${todaySets.length} series registradas.`)) endSession();
      return;
    }
    Alert.alert('Terminar sesión', `${todaySets.length} series registradas.`, [
      { text: 'Continuar', style: 'cancel' },
      { text: 'Terminar', style: 'destructive', onPress: endSession },
    ]);
  };

  const endSession = () => {
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    sessionTimerRef.current = null;
    setSession(null);
    setSessionOpen(false);
  };

  const filteredExForPicker = exercises
    .filter(e => {
      const matchCat = exCatFilter === 'TODOS' || e.category === exCatFilter;
      const matchQ = e.name.toLowerCase().includes(exSearch.toLowerCase());
      return matchCat && matchQ;
    })
    .sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0));

  const cats = ['TODOS', 'EMPUJE', 'TRACCION', 'PIERNA', 'SKILL'];

  return (
    <SafeAreaView style={s.container} edges={['top','left','right']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.logo}>ALGO<Text style={{ color: C.primary }}>R</Text>LIFT</Text>
        <TouchableOpacity style={s.newBtn} onPress={openCreate} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.newBtnTxt}>NUEVA</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.pageTitle}>Rutinas</Text>
        <Text style={s.pageSub}>Entrenamiento con estructura</Text>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
        ) : routines.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="list-outline" size={56} color="#222" />
            <Text style={s.emptyTitle}>Sin rutinas todavía</Text>
            <Text style={s.emptySub}>Crea tu primera rutina y entrénala en orden</Text>
          </View>
        ) : (
          routines.map(r => (
            <View key={r.id} style={s.routineCard}>
              <View style={s.routineCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.routineName}>{r.name}</Text>
                  <Text style={s.routineExCount}>{r.exerciseIds.length} ejercicio{r.exerciseIds.length !== 1 ? 's' : ''}</Text>
                </View>
                <TouchableOpacity onPress={() => openEdit(r)} style={[s.delBtn, { marginRight: 8 }]}>
                  <Ionicons name="pencil-outline" size={18} color={C.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteRoutine(r.id, r.name)} style={s.delBtn}>
                  <Ionicons name="trash-outline" size={18} color={C.muted} />
                </TouchableOpacity>
              </View>

              <View style={s.exPreviewList}>
                {r.exerciseIds.slice(0, 4).map((id, i) => {
                  const ex = getEx(id);
                  const cc = CAT_COLOR[ex?.category ?? ''] ?? C.muted;
                  return (
                    <View key={id} style={s.exPreviewRow}>
                      <View style={[s.exPreviewDot, { backgroundColor: cc }]} />
                      <Text style={s.exPreviewName} numberOfLines={1}>{ex?.name ?? `Ejercicio ${id}`}</Text>
                    </View>
                  );
                })}
                {r.exerciseIds.length > 4 && (
                  <Text style={s.moreExTxt}>+{r.exerciseIds.length - 4} más</Text>
                )}
              </View>

              <TouchableOpacity onPress={() => startSession(r)} activeOpacity={0.8}>
                <LinearGradient
                  colors={[C.primary, '#D91646']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.startBtn}
                >
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={s.startBtnTxt}>EMPEZAR SESIÓN</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Create Routine Modal ───────────────────────────── */}
      <Modal visible={createOpen} animationType="slide" transparent>
        <View style={s.overlay}>
          <SafeAreaView style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editingRoutineId ? 'Editar Rutina' : 'Nueva Rutina'}</Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)} style={s.closeBtn}>
                <Ionicons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.sheetScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>NOMBRE DE LA RUTINA</Text>
              <TextInput
                style={s.field}
                value={routineName}
                onChangeText={setRoutineName}
                placeholder="Ej: Push Day, Espalda..."
                placeholderTextColor={C.muted}
              />

              <Text style={[s.fieldLabel, { marginTop: 20 }]}>EJERCICIOS ({selectedExIds.length})</Text>
              {selectedExIds.map((id, i) => {
                const ex = getEx(id);
                const cc = CAT_COLOR[ex?.category ?? ''] ?? C.muted;
                return (
                  <View key={id} style={s.selectedExRow}>
                    <Text style={s.selectedExNum}>{i+1}</Text>
                    <View style={[s.selDot, { backgroundColor: cc }]} />
                    <Text style={s.selectedExName} numberOfLines={1}>{ex?.name ?? `Ejercicio ${id}`}</Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <TouchableOpacity onPress={() => moveEx(i, -1)} style={{ padding: 4 }} disabled={i === 0}>
                        <Ionicons name="arrow-up" size={16} color={i === 0 ? C.surfaceHigh : C.textSub} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => moveEx(i, 1)} style={{ padding: 4 }} disabled={i === selectedExIds.length - 1}>
                        <Ionicons name="arrow-down" size={16} color={i === selectedExIds.length - 1 ? C.surfaceHigh : C.textSub} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleExInRoutine(id)} style={{ padding: 4, marginLeft: 4 }}>
                        <Ionicons name="close-circle" size={20} color={C.muted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              <TouchableOpacity style={s.addExBtn} onPress={() => setExPickerOpen(true)} activeOpacity={0.8}>
                <Ionicons name="add" size={18} color={C.muted} />
                <Text style={s.addExBtnTxt}>Agregar ejercicio</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveRoutine} activeOpacity={0.8}>
                <LinearGradient colors={[C.primary, '#D91646']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.saveBtn}>
                  <Text style={s.saveBtnTxt}>{editingRoutineId ? 'GUARDAR CAMBIOS' : 'CREAR RUTINA'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── Exercise Picker (inside create routine) ──────── */}
      <Modal visible={exPickerOpen} animationType="slide" transparent>
        <View style={s.overlay}>
          <SafeAreaView style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Agregar ejercicio</Text>
              <TouchableOpacity onPress={() => setExPickerOpen(false)} style={s.closeBtn}>
                <Ionicons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={s.searchBar}>
              <Ionicons name="search" size={16} color={C.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Buscar..."
                placeholderTextColor={C.muted}
                value={exSearch}
                onChangeText={setExSearch}
              />
            </View>
            <View style={{ marginBottom: 12 }}>
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}
              >
              {cats.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.catChip, exCatFilter === c && s.catChipActive]}
                  onPress={() => setExCatFilter(c)}
                >
                  <Text style={[s.catChipTxt, exCatFilter === c && { color: C.primaryDim }]}>{c}</Text>
                </TouchableOpacity>
              ))}
              </ScrollView>
            </View>
            <FlatList
              data={filteredExForPicker}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 40, gap: 6 }}
              renderItem={({ item }) => {
                const isSelected = selectedExIds.includes(item.id);
                const cc = CAT_COLOR[item.category] ?? C.muted;
                return (
                  <TouchableOpacity
                    style={[s.pickerItem, isSelected && { borderColor: cc, backgroundColor: cc + '14' }]}
                    onPress={() => { toggleExInRoutine(item.id); }}
                    activeOpacity={0.8}
                  >
                    <View style={[s.pickerDot, { backgroundColor: cc }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.pickerName, isSelected && { color: cc }]}>{item.name}</Text>
                      <Text style={s.pickerSub}>{item.category}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={cc} />}
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── Active Session (fullscreen) ───────────────────── */}
      <Modal visible={sessionOpen} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={s.sessionContainer} edges={['top','left','right']}>
          {session && (() => {
            const exId = session.exerciseIds[session.currentIdx];
            const ex = getEx(exId);
            const cc = CAT_COLOR[ex?.category ?? ''] ?? C.muted;
            const live1rm = ex?.tracking_type === 'weight' ? RM.average(bodyW + addedW, repsVal) : 0;
            const pct = (session.currentIdx + 1) / session.exerciseIds.length;
            const setsCountToday = todaySets.length;

            return (
              <>
                {/* Session header */}
                <View style={s.sessHeader}>
                  <TouchableOpacity onPress={confirmEndSession} style={s.sessEndBtn}>
                    <Ionicons name="close" size={18} color={C.muted} />
                    <Text style={s.sessEndBtnTxt}>Terminar</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {restActive && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity onPress={() => setRestTarget(t => t === 60 ? 90 : t === 90 ? 120 : t === 120 ? 180 : 60)} style={s.restTargetBtn}>
                          <Text style={s.restTargetTxt}>{restTarget / 60}m</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setRestActive(false); setRestSecs(0); }} style={[s.restBadge, restSecs >= restTarget && { backgroundColor: C.success }]}>
                          <Ionicons name="timer-outline" size={12} color="#fff" />
                          <Text style={s.restTxt}>{fmtTimer(restSecs)}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <Text style={s.sessTimer}>{fmtTimer(sessionSecs)}</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={s.progressBarTrack}>
                  <View style={[s.progressBarFill, { width: `${pct * 100}%` }]} />
                </View>
                <View style={s.progressLabels}>
                  <Text style={s.progressLabelLeft}>
                    {session.currentIdx + 1}/{session.exerciseIds.length} ejercicios
                  </Text>
                  <Text style={s.progressLabelRight}>{setsCountToday} series</Text>
                </View>

                <ScrollView contentContainerStyle={s.sessScroll} keyboardShouldPersistTaps="handled">
                  {/* Current exercise — compact like log's exCard */}
                  <View style={s.sessExCard}>
                    <View style={[s.sessExBar, { backgroundColor: cc }]} />
                    <View style={{ flex: 1, paddingLeft: 10 }}>
                      <Text style={s.sessExLabel}>EJERCICIO ACTUAL</Text>
                      <Text style={s.sessExName} numberOfLines={1}>{ex?.name ?? '—'}</Text>
                      {ex && <Text style={[s.sessExCat, { color: cc }]}>{ex.category}</Text>}
                    </View>
                  </View>

                  {/* Form card — like log page */}
                  <View style={s.sessFormCard}>
                    <View style={s.formTop}>
                      <Text style={s.serieLabel}>SERIE {setsCountToday + 1}</Text>
                      {ex?.tracking_type === 'weight' && (
                        <View style={s.rmRow}>
                          <Text style={s.rmVal}>{live1rm > 0 ? `${RM.format(live1rm)} kg` : '—'}</Text>
                          <Text style={s.rmSub}>1RM</Text>
                        </View>
                      )}
                    </View>
                    {ex?.tracking_type === 'weight' && (
                      <>
                        <RowStepper label="Peso corporal" value={bodyW} onChange={setBodyW} step={0.5} min={0} decimals={1} />
                        <RowStepper label="Lastre (kg)" value={addedW} onChange={setAddedW} step={0.5} min={0} decimals={1} onPressCalc={() => setCalcOpen(true)} />
                        <RowStepper label="Repeticiones" value={repsVal} onChange={setRepsVal} step={1} min={1} />
                      </>
                    )}
                    {ex?.tracking_type === 'time' && (
                      <RowStepper label="Segundos" value={durVal} onChange={setDurVal} step={5} min={1} />
                    )}
                    {ex?.tracking_type === 'reps' && (
                      <RowStepper label="Repeticiones" value={repsVal} onChange={setRepsVal} step={1} min={1} />
                    )}

                    <TextInput
                      style={s.notesInput}
                      placeholder="Notas de la serie (ej. RIR 2, técnica ok)..."
                      placeholderTextColor={C.muted}
                      value={notes}
                      onChangeText={setNotes}
                    />

                    <TouchableOpacity onPress={sessionLogSet} disabled={saving} activeOpacity={0.8}>
                      <LinearGradient
                        colors={[C.primary, '#D91646']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={[s.sessSaveBtn, saving && { opacity: 0.6 }]}
                      >
                        {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                          <Text style={s.sessSaveBtnTxt}>+ ANOTAR SERIE</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* History card: today's sets + last session ref */}
                  {(todaySets.length > 0 || lastLog) && (
                    <View style={s.setsCard}>
                      <View style={s.setsHeader}>
                        <Text style={s.setsTitle}>{todaySets.length > 0 ? 'HOY' : 'ÚLTIMA SESIÓN'}</Text>
                        {todaySets.length > 0 && <Text style={s.setsCount}>{todaySets.length} series</Text>}
                      </View>
                      {todaySets.map((set, i) => {
                        const dataStr = ex?.tracking_type === 'weight'
                          ? `+${set.added_weight} kg × ${set.reps} reps`
                          : ex?.tracking_type === 'time' ? `${set.duration_sec}s` : `${set.reps} reps`;
                        return (
                          <View key={set.id ?? i} style={[s.setRow, set.is_pr && s.setRowPR]}>
                            {set.is_pr && <View style={s.prTag}><Text style={s.prTagTxt}>PR</Text></View>}
                            <Text style={s.setNum}>S{i+1}</Text>
                            <Text style={[s.setData, { flex: 1, color: set.is_pr ? C.primary : C.text }]}>{dataStr}</Text>
                            {set.estimated_1rm > 0 && <Text style={s.set1rm}>{Number(set.estimated_1rm).toFixed(1)} kg</Text>}
                          </View>
                        );
                      })}
                      {lastLog && ex && (
                        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 10 }}>
                          <TouchableOpacity style={s.copyRow} onPress={() => copyLastToSession(false)} activeOpacity={0.7}>
                            <Ionicons name="copy-outline" size={11} color={C.muted} />
                            <Text style={s.copyTxt}>Copiar {fmtShortDate(lastLog.date)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[s.copyRow, { borderColor: C.primary, backgroundColor: C.primaryDim }]} onPress={() => copyLastToSession(true)} activeOpacity={0.7}>
                            <Ionicons name="rocket-outline" size={11} color={C.primary} />
                            <Text style={[s.copyTxt, { color: C.primary, fontWeight: '800' }]}>Sobrecarga (+)</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Navigation */}
                  <View style={s.navRow}>
                    <TouchableOpacity
                      style={[s.navBtn, session.currentIdx === 0 && { opacity: 0.3 }]}
                      onPress={sessionPrev}
                      disabled={session.currentIdx === 0}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="arrow-back" size={15} color={C.text} />
                      <Text style={s.navBtnTxt}>Anterior</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.navBtnNext} onPress={sessionNext} activeOpacity={0.8}>
                      <Text style={s.navBtnNextTxt}>
                        {session.currentIdx >= session.exerciseIds.length - 1 ? 'Finalizar' : 'Siguiente'}
                      </Text>
                      <Ionicons
                        name={session.currentIdx >= session.exerciseIds.length - 1 ? 'checkmark' : 'arrow-forward'}
                        size={15} color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            );
          })()}
        </SafeAreaView>
      </Modal>

      <PlateCalculator 
        visible={calcOpen} 
        onClose={() => setCalcOpen(false)} 
        weight={addedW} 
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  logo: { fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  newBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  scroll: { padding: 14, paddingBottom: 100, gap: 12 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: -0.5, marginBottom: 2 },
  pageSub: { fontSize: 13, color: C.muted, marginBottom: 6 },

  empty: { paddingTop: 60, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.mutedLight },
  emptySub: { fontSize: 13, color: C.muted, textAlign: 'center', maxWidth: 260 },

  routineCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 14, gap: 0, elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  routineCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  routineName: { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  routineExCount: { fontSize: 12, color: C.mutedLight, marginTop: 4, fontWeight: '600' },
  delBtn: { padding: 4 },
  exPreviewList: { gap: 6, marginBottom: 16 },
  exPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exPreviewDot: { width: 6, height: 6, borderRadius: 3 },
  exPreviewName: { fontSize: 13, color: C.textSub, fontWeight: '700', flex: 1 },
  moreExTxt: { fontSize: 12, color: C.muted, paddingLeft: 16, fontWeight: '600' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 12 },
  startBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' },

  // Modal/sheet shared
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, maxHeight: '92%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: C.border },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  sheetScroll: { padding: 14, paddingBottom: 60 },
  fieldLabel: { fontSize: 10, color: C.mutedLight, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  field: { backgroundColor: C.bg, color: C.text, paddingHorizontal: 14, height: 44, borderRadius: 12, fontSize: 14, fontWeight: '700', borderWidth: 1, borderColor: C.border },
  selectedExRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  selectedExNum: { fontSize: 12, color: C.mutedLight, fontWeight: '800', width: 20 },
  selDot: { width: 8, height: 8, borderRadius: 4 },
  selectedExName: { flex: 1, fontSize: 14, fontWeight: '800', color: C.text },
  addExBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: C.borderLight, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, marginTop: 10, backgroundColor: C.surfaceHigh },
  addExBtnTxt: { fontSize: 13, color: C.mutedLight, fontWeight: '700' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 14, marginTop: 20 },
  saveBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, margin: 12, paddingHorizontal: 14, height: 40, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, color: C.text, fontSize: 14 },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border },
  catChipActive: { backgroundColor: C.primaryDim, borderColor: C.primary },
  catChipTxt: { color: C.textSub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  pickerDot: { width: 8, height: 8, borderRadius: 4 },
  pickerName: { fontSize: 14, fontWeight: '800', color: C.text },
  pickerSub: { fontSize: 10, color: C.muted, marginTop: 4 },

  // Session
  sessionContainer: { flex: 1, backgroundColor: C.bg },
  sessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  sessEndBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessEndBtnTxt: { color: C.mutedLight, fontSize: 12, fontWeight: '700' },
  sessRoutineName: { fontSize: 14, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  sessTimer: { fontSize: 13, fontWeight: '800', color: C.primary, fontVariant: ['tabular-nums'] },
  progressBarTrack: { height: 3, backgroundColor: C.surfaceHigh },
  progressBarFill: { height: 3, backgroundColor: C.primary },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 4 },
  progressLabelLeft: { fontSize: 10, color: C.mutedLight, fontWeight: '700' },
  progressLabelRight: { fontSize: 10, color: C.mutedLight, fontWeight: '700' },
  sessScroll: { padding: 14, paddingBottom: 60, gap: 10 },
  sessExCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden', minHeight: 60 },
  sessExBar: { width: 4, alignSelf: 'stretch' },
  sessExLabel: { fontSize: 8, color: C.muted, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  sessExName: { fontSize: 16, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  sessExCat: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  sessFormCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  formTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  serieLabel: { fontSize: 11, fontWeight: '900', color: C.textSub, letterSpacing: 2, textTransform: 'uppercase' },
  rmRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rmVal: { fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  rmSub: { fontSize: 10, color: C.muted, fontWeight: '700', marginTop: 2 },
  sessSaveBtn: { height: 42, alignItems: 'center', justifyContent: 'center' },
  sessSaveBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: C.border },
  inputCols: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border },
  colSep: { width: 1, backgroundColor: C.border, alignSelf: 'stretch' },
  setsCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden' },
  setsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  setsTitle: { fontSize: 10, fontWeight: '800', color: C.textSub, letterSpacing: 1.5, textTransform: 'uppercase' },
  setsCount: { fontSize: 11, color: C.primary, fontWeight: '800' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  setRowPR: { backgroundColor: C.primaryDim },
  setNum: { fontSize: 10, color: C.mutedLight, fontWeight: '800', width: 22 },
  setData: { fontSize: 14, fontWeight: '800', color: C.text },
  set1rm: { fontSize: 10, color: C.muted, marginTop: 2 },
  prTag: { backgroundColor: C.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  prTagTxt: { fontSize: 9, color: '#fff', fontWeight: '900', letterSpacing: 0.5 },
  copyRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 10, borderWidth: 1, borderColor: C.border, borderRadius: 10 },
  copyTxt: { fontSize: 11, color: C.muted, fontWeight: '600' },
  notesInput: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, color: C.text, fontSize: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 14, marginTop: 8, marginBottom: 12 },
  restBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.surfaceHigh, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  restTxt: { color: '#fff', fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  restTargetBtn: { backgroundColor: C.surfaceHigh, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  restTargetTxt: { fontSize: 10, color: C.mutedLight, fontWeight: '800' },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.borderLight, borderRadius: 12, paddingVertical: 12 },
  navBtnTxt: { color: C.text, fontWeight: '800', fontSize: 13 },
  navBtnNext: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12 },
  navBtnNextTxt: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
});
