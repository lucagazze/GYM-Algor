import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { workoutService, WorkoutLog, Exercise } from '../utils/workoutService';
import { C, CAT_COLOR } from '../constants/theme';
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

export default function HistoryScreen() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [filterCat, setFilterCat] = useState<string>('TODOS');
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

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

  const deleteLog = (id: string) => {
    const doDelete = async () => {
      await workoutService.deleteLog(id);
      setLogs(prev => prev.filter(l => l.id !== id));
    };
    if (Platform.OS === 'web') {
      if (window.confirm('¿Borrar este registro?')) doDelete();
      return;
    }
    Alert.alert('Borrar', '¿Borrar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: doDelete },
    ]);
  };

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
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

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={15} color={C.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar ejercicio..."
          placeholderTextColor={C.muted}
          value={searchQ}
          onChangeText={setSearchQ}
        />
        {searchQ.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQ('')}>
            <Ionicons name="close-circle" size={15} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={s.catBar}
      >
        {cats.map(c => {
          const active = filterCat === c;
          const col = c === 'TODOS' ? C.primary : (MUSCLE_COLOR[c] ?? C.primary);
          return (
            <TouchableOpacity
              key={c}
              style={[s.catChip, active && { borderColor: col, backgroundColor: col + '22' }]}
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

          {/* Heatmap */}
          <View style={s.heatCard}>
            <Text style={s.sectionLabel}>CONSISTENCIA — 35 DÍAS</Text>
            <View style={s.heatGrid}>
              {Array.from({ length: 35 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (34 - i));
                const dStr = d.toISOString().split('T')[0];
                return (
                  <View
                    key={dStr}
                    style={[s.heatSquare, activeDays.has(dStr) && { backgroundColor: C.primary, opacity: 1 }]}
                  />
                );
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
              const totalVol = dayLogs.reduce((s, l) => s + (l.body_weight + l.added_weight) * l.reps, 0);

              // Group by exercise
              const byEx: Record<number, WorkoutLog[]> = {};
              for (const l of dayLogs) {
                if (!byEx[l.exercise_id]) byEx[l.exercise_id] = [];
                byEx[l.exercise_id].push(l);
              }
              const exIds = Object.keys(byEx).map(Number);

              return (
                <View key={date} style={s.dayCard}>
                  {/* Day header — always visible */}
                  <TouchableOpacity style={s.dayHeader} onPress={() => toggleDay(date)} activeOpacity={0.8}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <Text style={s.dayTitle}>{fmtFullDate(date)}</Text>
                        {hasPR && <View style={s.prBadge}><Text style={s.prBadgeTxt}>PR</Text></View>}
                      </View>
                      {/* Exercise name list */}
                      <Text style={s.dayExList} numberOfLines={2}>
                        {exIds.map(id => {
                          const ex = byEx[id][0]?.exercise ?? getEx(id);
                          return ex?.name ?? `Ej. ${id}`;
                        }).join('  ·  ')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={s.dayMeta}>{dayLogs.length} series</Text>
                      {totalVol > 0 && <Text style={s.dayVol}>{fmtVol(totalVol)}</Text>}
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={C.muted} />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <View style={s.expandedBody}>
                      {exIds.map(exId => {
                        const exLogs = byEx[exId];
                        const ex = exLogs[0]?.exercise ?? getEx(exId);
                        const cc = CAT_COLOR[ex?.category ?? ''] ?? C.muted;
                        const best1rm = exLogs.reduce((b, l) => (l.estimated_1rm || 0) > b ? (l.estimated_1rm || 0) : b, 0);
                        const bestDur = exLogs.reduce((b, l) => (l.duration_sec || 0) > b ? (l.duration_sec || 0) : b, 0);
                        const bestReps = exLogs.reduce((b, l) => (l.reps || 0) > b ? (l.reps || 0) : b, 0);

                        let metaStr = '';
                        if (ex?.tracking_type === 'weight' && best1rm > 0) metaStr = `Best 1RM: ${best1rm.toFixed(1)} kg`;
                        else if (ex?.tracking_type === 'time') metaStr = `Max: ${bestDur}s`;
                        else metaStr = `Max: ${bestReps} reps`;

                        return (
                          <View key={exId} style={s.exGroup}>
                            <View style={[s.exGroupBar, { backgroundColor: cc }]} />
                            <View style={{ flex: 1, paddingLeft: 10 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <Text style={s.exGroupName}>{ex?.name ?? `Ejercicio ${exId}`}</Text>
                                <Text style={s.exGroupMeta}>{metaStr}</Text>
                              </View>
                              <View style={s.setsList}>
                                {exLogs.map((l, i) => {
                                  const valStr = ex?.tracking_type === 'weight'
                                    ? `+${l.added_weight}kg × ${l.reps}r`
                                    : ex?.tracking_type === 'time' ? `${l.duration_sec}s`
                                    : `${l.reps}r`;
                                  return (
                                    <View key={l.id ?? i} style={s.setRow}>
                                      <Text style={s.setNum}>S{i + 1}</Text>
                                      <Text style={s.setVal}>{valStr}</Text>
                                      {l.estimated_1rm > 0 && (
                                        <Text style={s.set1rm}>{Number(l.estimated_1rm).toFixed(1)} kg</Text>
                                      )}
                                      {l.is_pr && <View style={s.prTag}><Text style={s.prTagTxt}>PR</Text></View>}
                                      <TouchableOpacity onPress={() => l.id && deleteLog(l.id)} style={s.delBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Ionicons name="trash-outline" size={13} color={C.border} />
                                      </TouchableOpacity>
                                    </View>
                                  );
                                })}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  logo: { fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  statPill: { alignItems: 'center' },
  statPillVal: { fontSize: 15, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  statPillLbl: { fontSize: 9, color: C.muted, fontWeight: '700', letterSpacing: 0.3 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, marginHorizontal: 12, marginTop: 10, marginBottom: 6, paddingHorizontal: 12, height: 38, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, color: C.text, fontSize: 13 },

  catBar: { gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border },
  catChipActive: { borderColor: C.primary, backgroundColor: C.primaryDim },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catChipTxt: { color: C.textSub, fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },

  scroll: { padding: 10, paddingBottom: 100, gap: 8 },

  heatCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 4 },
  sectionLabel: { fontSize: 9, fontWeight: '800', color: C.muted, letterSpacing: 1.2, marginBottom: 8 },
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  heatSquare: { width: 13, height: 13, borderRadius: 3, backgroundColor: C.surfaceHigh, opacity: 0.6 },

  empty: { paddingTop: 60, alignItems: 'center', gap: 10 },
  emptyTxt: { fontSize: 14, color: C.muted, textAlign: 'center' },

  dayCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  dayTitle: { fontSize: 13, fontWeight: '900', color: C.text, letterSpacing: -0.3 },
  dayExList: { fontSize: 11, color: C.muted, fontWeight: '600', lineHeight: 16 },
  dayMeta: { fontSize: 10, color: C.mutedLight, fontWeight: '700' },
  dayVol: { fontSize: 10, color: C.primary, fontWeight: '800' },
  prBadge: { backgroundColor: C.primary, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  prBadgeTxt: { fontSize: 8, color: '#fff', fontWeight: '900', letterSpacing: 0.8 },

  expandedBody: { borderTopWidth: 1, borderTopColor: C.border },
  exGroup: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  exGroupBar: { width: 3, borderRadius: 2, alignSelf: 'stretch' },
  exGroupName: { fontSize: 13, fontWeight: '800', color: C.text },
  exGroupMeta: { fontSize: 10, color: C.muted, fontWeight: '600' },
  setsList: { gap: 5 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setNum: { fontSize: 9, color: C.mutedLight, fontWeight: '800', width: 18 },
  setVal: { fontSize: 12, fontWeight: '800', color: C.text },
  set1rm: { fontSize: 10, color: C.muted, flex: 1 },
  prTag: { backgroundColor: C.primaryDim, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  prTagTxt: { fontSize: 8, color: C.primary, fontWeight: '900', letterSpacing: 0.5 },
  delBtn: { padding: 2 },
});
