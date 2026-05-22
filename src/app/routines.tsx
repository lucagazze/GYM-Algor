import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, FlatList, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { C, CAT_COLOR } from '../constants/theme';
import { routineService, Routine, ActiveSession } from '../utils/routineService';
import { workoutService, Exercise, WorkoutLog, RM } from '../utils/workoutService';

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

function RowStepper({ label, value, onChange, step = 1, min = 0, decimals = 0 }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; decimals?: number;
}) {
  const fmt = (v: number) => decimals > 0 ? v.toFixed(decimals) : String(v);
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100));
  const inc = () => onChange(Math.round((value + step) * 100) / 100);
  return (
    <View style={rs.row}>
      <Text style={rs.label}>{label}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  label: { fontSize: 13, color: C.textSub, fontWeight: '500', flex: 1, letterSpacing: -0.1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { width: 36, height: 36, backgroundColor: C.surfaceHigh, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: C.text, fontSize: 20, fontWeight: '300', lineHeight: 24, marginTop: -1 },
  valBox: { width: 70, height: 36, backgroundColor: C.bg, borderRadius: 8, justifyContent: 'center' },
  val: { color: C.text, fontSize: 17, fontWeight: '700', backgroundColor: 'transparent', textAlign: 'center' },
});

export default function RoutinesScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  // Create routine modal
  const [createOpen, setCreateOpen] = useState(false);
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
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

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
    setRoutineName('');
    setSelectedExIds([]);
    setCreateOpen(true);
  };

  const saveRoutine = async () => {
    if (!routineName.trim()) { Alert.alert('Falta el nombre'); return; }
    if (selectedExIds.length === 0) { Alert.alert('Agrega al menos un ejercicio'); return; }
    await routineService.create(routineName.trim(), selectedExIds);
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
    setAddedW(0); setRepsVal(5); setDurVal(10);
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
      notes: '',
      set_number: todaySets.length + 1,
    });
    setSaving(false);
    if (result.data) {
      setTodaySets(prev => [...prev, result.data!]);
      if (result.data.is_pr) Alert.alert('🏆 RÉCORD', `1RM: ${RM.format(live1rm)} kg`);
    }
  };

  const copyLastToSession = () => {
    if (!lastLog || !session) return;
    const ex = getEx(session.exerciseIds[session.currentIdx]);
    if (!ex) return;
    if (ex.tracking_type === 'weight') { setAddedW(lastLog.added_weight||0); setRepsVal(lastLog.reps||5); }
    else if (ex.tracking_type === 'time') setDurVal(lastLog.duration_sec||10);
    else setRepsVal(lastLog.reps||5);
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
                <TouchableOpacity onPress={() => deleteRoutine(r.id, r.name)} style={s.delBtn}>
                  <Ionicons name="trash-outline" size={18} color="#3a3a3a" />
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

              <TouchableOpacity style={s.startBtn} onPress={() => startSession(r)} activeOpacity={0.8}>
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={s.startBtnTxt}>EMPEZAR SESIÓN</Text>
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
              <Text style={s.sheetTitle}>Nueva Rutina</Text>
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
                    <TouchableOpacity onPress={() => toggleExInRoutine(id)}>
                      <Ionicons name="close-circle" size={20} color="#444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              <TouchableOpacity style={s.addExBtn} onPress={() => setExPickerOpen(true)} activeOpacity={0.8}>
                <Ionicons name="add" size={18} color={C.muted} />
                <Text style={s.addExBtnTxt}>Agregar ejercicio</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.saveBtn} onPress={saveRoutine} activeOpacity={0.8}>
                <Text style={s.saveBtnTxt}>CREAR RUTINA</Text>
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
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingBottom: 8 }}
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
                    <Ionicons name="close" size={16} color={C.muted} />
                    <Text style={s.sessEndBtnTxt}>Terminar</Text>
                  </TouchableOpacity>
                  <Text style={s.sessRoutineName}>{session.routineName}</Text>
                  <Text style={s.sessTimer}>{fmtTimer(sessionSecs)}</Text>
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
                        <RowStepper label="Lastre (kg)" value={addedW} onChange={setAddedW} step={2.5} min={0} decimals={1} />
                        <RowStepper label="Repeticiones" value={repsVal} onChange={setRepsVal} step={1} min={1} />
                      </>
                    )}
                    {ex?.tracking_type === 'time' && (
                      <RowStepper label="Segundos" value={durVal} onChange={setDurVal} step={5} min={1} />
                    )}
                    {ex?.tracking_type === 'reps' && (
                      <RowStepper label="Repeticiones" value={repsVal} onChange={setRepsVal} step={1} min={1} />
                    )}
                    <TouchableOpacity style={[s.sessSaveBtn, saving && { opacity: 0.6 }]} onPress={sessionLogSet} disabled={saving} activeOpacity={0.8}>
                      {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                        <Text style={s.sessSaveBtnTxt}>+ ANOTAR SERIE</Text>
                      )}
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
                        <TouchableOpacity style={s.lastRef} onPress={copyLastToSession} activeOpacity={0.7}>
                          <Ionicons name="copy-outline" size={11} color={C.muted} />
                          <Text style={s.lastRefLabel}>
                            {fmtShortDate(lastLog.date)} · {ex.tracking_type === 'weight'
                              ? `+${lastLog.added_weight} kg × ${lastLog.reps} reps`
                              : ex.tracking_type === 'time' ? `${lastLog.duration_sec}s` : `${lastLog.reps} reps`}
                            {lastLog.estimated_1rm > 0 ? `  →  ${Number(lastLog.estimated_1rm).toFixed(1)} kg` : ''}
                            {'  ·  Copiar'}
                          </Text>
                        </TouchableOpacity>
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  logo: { fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  scroll: { padding: 14, paddingBottom: 50, gap: 12 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: -0.8, marginBottom: 2 },
  pageSub: { fontSize: 13, color: C.muted, marginBottom: 8 },

  empty: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#444' },
  emptySub: { fontSize: 13, color: '#333', textAlign: 'center', maxWidth: 260 },

  routineCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, gap: 0 },
  routineCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  routineName: { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: -0.4 },
  routineExCount: { fontSize: 12, color: C.muted, marginTop: 2 },
  delBtn: { padding: 4 },
  exPreviewList: { gap: 6, marginBottom: 16 },
  exPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exPreviewDot: { width: 6, height: 6, borderRadius: 3 },
  exPreviewName: { fontSize: 13, color: C.textSub, fontWeight: '600', flex: 1 },
  moreExTxt: { fontSize: 12, color: C.muted, paddingLeft: 16 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, height: 50, borderRadius: 12, shadowColor: C.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10 },
  startBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' },

  // Modal/sheet shared
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1a1a1a', maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: C.border },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: C.text },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  sheetScroll: { padding: 16, paddingBottom: 40 },
  fieldLabel: { fontSize: 10, color: C.muted, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 },
  field: { backgroundColor: '#0a0a0a', color: C.text, paddingHorizontal: 14, height: 48, borderRadius: 12, fontSize: 15, fontWeight: '700', borderWidth: 1, borderColor: C.border },
  selectedExRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  selectedExNum: { fontSize: 12, color: C.muted, fontWeight: '700', width: 20 },
  selDot: { width: 8, height: 8, borderRadius: 4 },
  selectedExName: { flex: 1, fontSize: 14, fontWeight: '700', color: C.text },
  addExBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, marginTop: 10 },
  addExBtnTxt: { fontSize: 13, color: C.muted, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.primary, height: 52, borderRadius: 14, marginTop: 20, shadowColor: C.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10 },
  saveBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', margin: 14, paddingHorizontal: 14, height: 42, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, color: C.text, fontSize: 14 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.borderLight },
  catChipActive: { backgroundColor: C.primary + '18', borderColor: C.primary },
  catChipTxt: { color: C.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  pickerDot: { width: 8, height: 8, borderRadius: 4 },
  pickerName: { fontSize: 14, fontWeight: '800', color: C.text },
  pickerSub: { fontSize: 10, color: C.muted, marginTop: 2 },

  // Session
  sessionContainer: { flex: 1, backgroundColor: C.bg },
  sessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  sessEndBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessEndBtnTxt: { color: C.muted, fontSize: 12, fontWeight: '600' },
  sessRoutineName: { fontSize: 13, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  sessTimer: { fontSize: 12, fontWeight: '700', color: C.muted, fontVariant: ['tabular-nums'] },
  progressBarTrack: { height: 2, backgroundColor: C.border },
  progressBarFill: { height: 2, backgroundColor: C.primary },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 5, paddingBottom: 1 },
  progressLabelLeft: { fontSize: 10, color: C.muted, fontWeight: '600' },
  progressLabelRight: { fontSize: 10, color: C.muted, fontWeight: '600' },
  sessScroll: { padding: 12, paddingBottom: 50, gap: 8 },
  sessExCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: 'hidden', minHeight: 52 },
  sessExBar: { width: 3, alignSelf: 'stretch' },
  sessExLabel: { fontSize: 8, color: C.muted, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  sessExName: { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  sessExCat: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  sessFormCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden' },
  formTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  serieLabel: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 2, textTransform: 'uppercase' },
  rmRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rmVal: { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: -0.8 },
  rmSub: { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 2 },
  sessSaveBtn: { backgroundColor: C.primary, height: 44, alignItems: 'center', justifyContent: 'center' },
  sessSaveBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1.5 },
  divider: { height: 1, backgroundColor: C.border },
  inputCols: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border },
  colSep: { width: 1, backgroundColor: C.border, alignSelf: 'stretch' },
  setsCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: 'hidden' },
  setsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border },
  setsTitle: { fontSize: 9, fontWeight: '800', color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
  setsCount: { fontSize: 11, color: C.primary, fontWeight: '700' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  setRowPR: { backgroundColor: C.primary + '08' },
  setNum: { fontSize: 10, color: C.muted, fontWeight: '700', width: 20 },
  setData: { fontSize: 13, fontWeight: '700', color: C.text },
  set1rm: { fontSize: 10, color: C.muted },
  prTag: { backgroundColor: C.primary, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  prTagTxt: { fontSize: 8, color: '#fff', fontWeight: '900', letterSpacing: 0.5 },
  lastRef: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9 },
  lastRefLabel: { fontSize: 11, color: C.muted, fontWeight: '500', flex: 1 },
  navRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.borderLight, borderRadius: 10, paddingVertical: 10 },
  navBtnTxt: { color: C.text, fontWeight: '700', fontSize: 12 },
  navBtnNext: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.primary, borderRadius: 10, paddingVertical: 10 },
  navBtnNextTxt: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
});
