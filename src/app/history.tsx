import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { workoutService, WorkoutLog, Exercise } from '../utils/workoutService';
import { C, CAT_COLOR, F } from '../constants/theme';
import { MUSCLE_COLOR, getMuscle, muscleChips } from '../constants/muscles';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtFullDate(d: string) {
  const p = d.split('-');
  if (p.length !== 3) return d;
  const today = new Date().toISOString().split('T')[0];
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  if (d === today) return 'Hoy';
  if (d === yest.toISOString().split('T')[0]) return 'Ayer';
  const dow = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date(d + 'T12:00:00').getDay()];
  return `${dow} ${parseInt(p[2])} ${MONTHS[parseInt(p[1]) - 1]}`;
}

function fmtVol(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}t` : `${n.toFixed(0)}kg`;
}

interface EditState {
  log: WorkoutLog;
  ex: Exercise | undefined;
  weight: string;
  reps: string;
  duration: string;
}

export default function HistoryScreen() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [filterCat, setFilterCat] = useState<string>('TODOS');
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    setLoading(true);
    const [allLogs, exList, days] = await Promise.all([
      workoutService.getAllRecentLogs(300),
      workoutService.getExercises(),
      workoutService.getActiveDays(),
    ]);
    setLogs(allLogs);
    setExercises(exList);
    setActiveDays(new Set(days));
    setLoading(false);
  };

  const getEx = (id: number) => exercises.find(e => e.id === id);

  const openEdit = (log: WorkoutLog) => {
    const ex = log.exercise ?? getEx(log.exercise_id);
    setEditState({
      log,
      ex,
      weight: String(log.added_weight ?? 0),
      reps: String(log.reps ?? 0),
      duration: String(log.duration_sec ?? 0),
    });
  };

  const saveEdit = async () => {
    if (!editState?.log.id) return;
    setSaving(true);
    const ex = editState.ex;
    const updates: Partial<WorkoutLog> = {};
    if (ex?.tracking_type === 'weight') {
      updates.added_weight = parseFloat(editState.weight) || 0;
      updates.reps = parseInt(editState.reps) || 0;
    } else if (ex?.tracking_type === 'time') {
      updates.duration_sec = parseInt(editState.duration) || 0;
    } else {
      updates.reps = parseInt(editState.reps) || 0;
    }
    const { error } = await workoutService.updateLog(editState.log.id, updates);
    setSaving(false);
    if (error) { Alert.alert('Error', error); return; }
    setLogs(prev => prev.map(l => l.id === editState.log.id ? { ...l, ...updates } : l));
    setEditState(null);
  };

  const deleteLog = (id: string) => {
    const doDelete = async () => {
      await workoutService.deleteLog(id);
      setLogs(prev => prev.filter(l => l.id !== id));
    };
    if (Platform.OS === 'web') { if (window.confirm('¿Borrar esta serie?')) doDelete(); return; }
    Alert.alert('Borrar', '¿Borrar esta serie?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: doDelete },
    ]);
  };

  const deleteSession = (date: string, label: string) => {
    const doDelete = async () => {
      await workoutService.deleteLogsForDate(date);
      setLogs(prev => prev.filter(l => l.date !== date));
      setActiveDays(prev => { const next = new Set(prev); next.delete(date); return next; });
    };
    if (Platform.OS === 'web') { if (window.confirm(`¿Eliminar toda la sesión del ${label}?`)) doDelete(); return; }
    Alert.alert('Eliminar sesión', `¿Eliminar todos los registros del ${label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: doDelete },
    ]);
  };

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  const cats = muscleChips(exercises);

  const filtered = logs.filter(l => {
    const ex = l.exercise ?? getEx(l.exercise_id);
    const matchQ = !searchQ || ex?.name.toLowerCase().includes(searchQ.toLowerCase());
    const matchCat = filterCat === 'TODOS' || (ex ? getMuscle(ex) === filterCat : false);
    return matchQ && matchCat;
  });

  const byDate: Record<string, WorkoutLog[]> = {};
  for (const l of filtered) {
    if (!byDate[l.date]) byDate[l.date] = [];
    byDate[l.date].push(l);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const totalSessions = new Set(logs.map(l => l.date)).size;
  const totalPRs = logs.filter(l => l.is_pr).length;

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <Text style={s.logo}>ALGO<Text style={{ color: C.primary }}>R</Text>LIFT</Text>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <View style={s.statPill}>
            <Text style={s.statPillVal}>{totalSessions}</Text>
            <Text style={s.statPillLbl}>sesiones</Text>
          </View>
          <View style={s.statPill}>
            <Text style={[s.statPillVal, { color: C.primary }]}>{totalPRs}</Text>
            <Text style={s.statPillLbl}>PRs</Text>
          </View>
        </View>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={15} color={C.muted} style={{ marginRight: 8 }} />
        <TextInput style={s.searchInput} placeholder="Buscar ejercicio..." placeholderTextColor={C.muted} value={searchQ} onChangeText={setSearchQ} />
        {searchQ.length > 0 && <TouchableOpacity onPress={() => setSearchQ('')}><Ionicons name="close-circle" size={15} color={C.muted} /></TouchableOpacity>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.catBar}>
        {cats.map(c => {
          const active = filterCat === c;
          const col = c === 'TODOS' ? C.primary : (MUSCLE_COLOR[c] ?? C.primary);
          return (
            <TouchableOpacity key={c} style={[s.catChip, active && { borderColor: col, backgroundColor: col + '22' }]} onPress={() => setFilterCat(c)}>
              <Text style={[s.catChipTxt, active && { color: col }]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>

          {/* Heatmap */}
          <View style={s.heatCard}>
            <Text style={s.sectionLabel}>CONSISTENCIA — 35 DÍAS</Text>
            <View style={s.heatGrid}>
              {Array.from({ length: 35 }).map((_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (34 - i));
                const dStr = d.toISOString().split('T')[0];
                return <View key={dStr} style={[s.heatSquare, activeDays.has(dStr) && { backgroundColor: C.primary, opacity: 1 }]} />;
              })}
            </View>
          </View>

          {dates.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="calendar-outline" size={44} color="#222" />
              <Text style={s.emptyTxt}>Sin registros todavía</Text>
            </View>
          ) : (
            dates.map(date => {
              const dayLogs = byDate[date];
              const isExpanded = expandedDays.has(date);
              const hasPR = dayLogs.some(l => l.is_pr);
              const totalVol = dayLogs.reduce((s, l) => s + l.added_weight * l.reps, 0);
              const label = fmtFullDate(date);

              const byEx: Record<number, WorkoutLog[]> = {};
              for (const l of dayLogs) {
                if (!byEx[l.exercise_id]) byEx[l.exercise_id] = [];
                byEx[l.exercise_id].push(l);
              }
              const exIds = Object.keys(byEx).map(Number);

              return (
                <View key={date} style={s.dayCard}>
                  <TouchableOpacity style={s.dayHeader} onPress={() => toggleDay(date)} activeOpacity={0.8}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={s.dayTitle}>{label}</Text>
                        {hasPR && <View style={s.prBadge}><Text style={s.prBadgeTxt}>PR</Text></View>}
                      </View>
                      <Text style={s.dayExList} numberOfLines={2}>
                        {exIds.map(id => (byEx[id][0]?.exercise ?? getEx(id))?.name ?? `Ej. ${id}`).join('  ·  ')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <Text style={s.dayMeta}>{dayLogs.length} series</Text>
                      {totalVol > 0 && <Text style={s.dayVol}>{fmtVol(totalVol)}</Text>}
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={C.muted} />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={s.expandedBody}>
                      {exIds.map(exId => {
                        const exLogs = byEx[exId];
                        const ex = exLogs[0]?.exercise ?? getEx(exId);
                        const cc = MUSCLE_COLOR[ex?.muscle_group ?? ''] ?? CAT_COLOR[ex?.category ?? ''] ?? C.muted;
                        const best1rm = exLogs.reduce((b, l) => (l.estimated_1rm || 0) > b ? (l.estimated_1rm || 0) : b, 0);
                        const bestDur = exLogs.reduce((b, l) => (l.duration_sec || 0) > b ? (l.duration_sec || 0) : b, 0);
                        const bestReps = exLogs.reduce((b, l) => (l.reps || 0) > b ? (l.reps || 0) : b, 0);
                        let metaStr = '';
                        if (ex?.tracking_type === 'weight' && best1rm > 0) metaStr = `1RM: ${best1rm.toFixed(1)} kg`;
                        else if (ex?.tracking_type === 'time') metaStr = `Max: ${bestDur}s`;
                        else metaStr = `Max: ${bestReps}r`;

                        return (
                          <View key={exId} style={s.exGroup}>
                            <View style={[s.exGroupBar, { backgroundColor: cc }]} />
                            <View style={{ flex: 1, paddingLeft: 10 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                <Text style={s.exGroupName}>{ex?.name ?? `Ejercicio ${exId}`}</Text>
                                <Text style={s.exGroupMeta}>{metaStr}</Text>
                              </View>
                              <View style={s.setsList}>
                                {exLogs.map((l, i) => {
                                  const valStr = ex?.tracking_type === 'weight'
                                    ? `+${l.added_weight}kg × ${l.reps}r`
                                    : ex?.tracking_type === 'time' ? `${l.duration_sec}s` : `${l.reps}r`;
                                  return (
                                    <View key={l.id ?? i} style={s.setRow}>
                                      <Text style={s.setNum}>S{i + 1}</Text>
                                      <Text style={[s.setVal, l.is_pr && { color: C.primary }]}>{valStr}</Text>
                                      {l.estimated_1rm > 0 && <Text style={s.set1rm}>{Number(l.estimated_1rm).toFixed(1)}</Text>}
                                      {l.is_pr && <View style={s.prTag}><Text style={s.prTagTxt}>PR</Text></View>}
                                      <View style={{ flexDirection: 'row', gap: 6, marginLeft: 'auto' }}>
                                        <TouchableOpacity onPress={() => openEdit(l)} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                          <Ionicons name="pencil-outline" size={13} color={C.mutedLight} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => l.id && deleteLog(l.id)} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                          <Ionicons name="trash-outline" size={13} color={C.border} />
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  );
                                })}
                              </View>
                            </View>
                          </View>
                        );
                      })}

                      {/* Delete session button */}
                      <TouchableOpacity style={s.deleteSessionBtn} onPress={() => deleteSession(date, label)} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={13} color={C.error} />
                        <Text style={s.deleteSessionTxt}>Eliminar sesión completa</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Edit set modal */}
      <Modal visible={!!editState} animationType="slide" transparent>
        <View style={s.overlay}>
          <SafeAreaView style={[s.sheet, { maxHeight: '50%' }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>Editar serie</Text>
                {editState?.ex && <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{editState.ex.name}</Text>}
              </View>
              <TouchableOpacity onPress={() => setEditState(null)} style={s.closeBtn}>
                <Ionicons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            {editState && (
              <View style={{ padding: 16, gap: 12 }}>
                {editState.ex?.tracking_type === 'weight' && (
                  <>
                    <View style={s.editRow}>
                      <Text style={s.editLabel}>PESO (kg)</Text>
                      <TextInput style={s.editInput} value={editState.weight} onChangeText={v => setEditState(p => p ? { ...p, weight: v } : p)} keyboardType="decimal-pad" selectTextOnFocus />
                    </View>
                    <View style={s.editRow}>
                      <Text style={s.editLabel}>REPS</Text>
                      <TextInput style={s.editInput} value={editState.reps} onChangeText={v => setEditState(p => p ? { ...p, reps: v } : p)} keyboardType="number-pad" selectTextOnFocus />
                    </View>
                  </>
                )}
                {editState.ex?.tracking_type === 'time' && (
                  <View style={s.editRow}>
                    <Text style={s.editLabel}>SEGUNDOS</Text>
                    <TextInput style={s.editInput} value={editState.duration} onChangeText={v => setEditState(p => p ? { ...p, duration: v } : p)} keyboardType="number-pad" selectTextOnFocus />
                  </View>
                )}
                {editState.ex?.tracking_type === 'reps' && (
                  <View style={s.editRow}>
                    <Text style={s.editLabel}>REPS</Text>
                    <TextInput style={s.editInput} value={editState.reps} onChangeText={v => setEditState(p => p ? { ...p, reps: v } : p)} keyboardType="number-pad" selectTextOnFocus />
                  </View>
                )}
                <TouchableOpacity onPress={saveEdit} disabled={saving} activeOpacity={0.8}>
                  <LinearGradient colors={[C.primary, '#D91646']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.saveBtn}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>GUARDAR</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  logo: { fontSize: 20, fontWeight: '900', color: C.text, fontFamily: F.condensed, letterSpacing: 1 },
  statPill: { alignItems: 'center' },
  statPillVal: { fontSize: 15, fontWeight: '900', color: C.text, fontFamily: F.condensed },
  statPillLbl: { fontSize: 9, color: C.muted, fontWeight: '700', fontFamily: F.condensed, letterSpacing: 0.5 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, marginHorizontal: 12, marginTop: 10, marginBottom: 6, paddingHorizontal: 12, height: 38, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, color: C.text, fontSize: 13, fontFamily: F.body },

  catBar: { gap: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  catChip: { height: 32, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  catChipTxt: { color: C.textSub, fontSize: 11, fontWeight: '700', fontFamily: F.condensed, letterSpacing: 0.5, lineHeight: 14, includeFontPadding: false },

  scroll: { padding: 10, paddingBottom: 100, gap: 8 },

  heatCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 4 },
  sectionLabel: { fontSize: 9, fontWeight: '800', color: C.muted, fontFamily: F.condensed, letterSpacing: 1.2, marginBottom: 8 },
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  heatSquare: { width: 13, height: 13, borderRadius: 3, backgroundColor: C.surfaceHigh, opacity: 0.6 },

  empty: { paddingTop: 60, alignItems: 'center', gap: 10 },
  emptyTxt: { fontSize: 14, color: C.muted, textAlign: 'center' },

  dayCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  dayTitle: { fontSize: 14, fontWeight: '700', color: C.text, fontFamily: F.condensed },
  dayExList: { fontSize: 11, color: C.muted, fontFamily: F.body, lineHeight: 16 },
  dayMeta: { fontSize: 10, color: C.mutedLight, fontWeight: '700', fontFamily: F.condensed },
  dayVol: { fontSize: 10, color: C.primary, fontWeight: '800', fontFamily: F.condensed },
  prBadge: { backgroundColor: C.primary, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  prBadgeTxt: { fontSize: 8, color: '#fff', fontWeight: '900', letterSpacing: 0.8 },

  expandedBody: { borderTopWidth: 1, borderTopColor: C.border },
  exGroup: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  exGroupBar: { width: 3, borderRadius: 2, alignSelf: 'stretch' },
  exGroupName: { fontSize: 13, fontWeight: '700', color: C.text, fontFamily: F.condensed },
  exGroupMeta: { fontSize: 10, color: C.muted, fontFamily: F.condensed },
  setsList: { gap: 6 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setNum: { fontSize: 9, color: C.mutedLight, fontWeight: '700', fontFamily: F.condensed, width: 18 },
  setVal: { fontSize: 12, fontWeight: '700', color: C.text, fontFamily: F.condensed },
  set1rm: { fontSize: 10, color: C.muted, fontFamily: F.condensed },
  prTag: { backgroundColor: C.primaryDim, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  prTagTxt: { fontSize: 8, color: C.primary, fontWeight: '900', letterSpacing: 0.5 },
  actionBtn: { padding: 2 },
  deleteSessionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, margin: 10, borderRadius: 10, borderWidth: 1, borderColor: C.error + '44', backgroundColor: C.error + '11' },
  deleteSessionTxt: { fontSize: 12, color: C.error, fontWeight: '700', fontFamily: F.condensed, letterSpacing: 0.5 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: C.border },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: C.text, fontFamily: F.condensed },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  editLabel: { fontSize: 11, color: C.mutedLight, fontWeight: '800', fontFamily: F.condensed, letterSpacing: 1, width: 90 },
  editInput: { flex: 1, backgroundColor: C.bg, color: C.text, paddingHorizontal: 14, height: 44, borderRadius: 12, fontSize: 18, fontWeight: '700', fontFamily: F.condensed, borderWidth: 1, borderColor: C.border, textAlign: 'center' },
  saveBtn: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1, fontFamily: F.condensed },
});
