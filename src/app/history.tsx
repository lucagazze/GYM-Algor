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

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtFullDate(d: string) {
  const p = d.split('-');
  if (p.length !== 3) return d;
  const today = new Date().toISOString().split('T')[0];
  const yest = new Date(); yest.setDate(yest.getDate()-1);
  if (d === today) return 'Hoy';
  if (d === yest.toISOString().split('T')[0]) return 'Ayer';
  return `${parseInt(p[2])} ${MONTHS[parseInt(p[1])-1]} ${p[0]}`;
}

export default function HistoryScreen() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());
  const [weeklyVolume, setWeeklyVolume] = useState<{category: string, sets: number}[]>([]);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    setLoading(true);
    const [allLogs, exList, days, vol] = await Promise.all([
      workoutService.getAllRecentLogs(200),
      workoutService.getExercises(),
      workoutService.getActiveDays(),
      workoutService.getWeeklyVolumeByCategory(),
    ]);
    setLogs(allLogs);
    setExercises(exList);
    setActiveDays(new Set(days));
    setWeeklyVolume(vol);
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

  const filtered = searchQ
    ? logs.filter(l => {
        const ex = l.exercise ?? getEx(l.exercise_id);
        return ex?.name.toLowerCase().includes(searchQ.toLowerCase());
      })
    : logs;

  const byDate: Record<string, WorkoutLog[]> = {};
  for (const l of filtered) {
    if (!byDate[l.date]) byDate[l.date] = [];
    byDate[l.date].push(l);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <SafeAreaView style={s.container} edges={['top','left','right']}>
      <View style={s.header}>
        <Text style={s.logo}>ALGO<Text style={{ color: C.primary }}>R</Text>LIFT</Text>
        <Text style={s.headerSub}>{logs.length} registros</Text>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={C.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar ejercicio..."
          placeholderTextColor={C.muted}
          value={searchQ}
          onChangeText={setSearchQ}
        />
        {searchQ.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQ('')}>
            <Ionicons name="close-circle" size={16} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          
          <View style={s.heatmapCard}>
            <Text style={s.heatmapTitle}>Consistencia (Últimos 35 días)</Text>
            <View style={s.heatmapGrid}>
              {Array.from({length: 35}).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (34 - i));
                const dStr = d.toISOString().split('T')[0];
                return (
                  <View key={dStr} style={[s.heatSquare, activeDays.has(dStr) ? { backgroundColor: C.primary } : { backgroundColor: C.surfaceHigh }]} />
                );
              })}
            </View>
          </View>

          {weeklyVolume.length > 0 && (
            <View style={s.volCard}>
              <Text style={s.volTitle}>Volumen Semanal (Últimos 7 días)</Text>
              <View style={s.volBars}>
                {weeklyVolume.map(v => (
                  <View key={v.category} style={s.volBarRow}>
                    <Text style={s.volLabel}>{v.category}</Text>
                    <View style={s.volBarBg}>
                      {/* max width logic, assuming max 30 sets is 100% */}
                      <View style={[s.volBarFill, { width: `${Math.min(100, (v.sets / 30) * 100)}%` as any, backgroundColor: CAT_COLOR[v.category] ?? C.primary }]} />
                    </View>
                    <Text style={s.volVal}>{v.sets} sets</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          <Text style={s.pageTitle}>Historial</Text>

          {dates.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="calendar-outline" size={52} color="#222" />
              <Text style={s.emptyTxt}>Sin registros todavía</Text>
            </View>
          ) : (
            dates.map(date => {
              const dayLogs = byDate[date];
              const byEx: Record<number, WorkoutLog[]> = {};
              for (const l of dayLogs) {
                if (!byEx[l.exercise_id]) byEx[l.exercise_id] = [];
                byEx[l.exercise_id].push(l);
              }
              const hasPR = dayLogs.some(l => l.is_pr);

              return (
                <View key={date} style={s.dayCard}>
                  <View style={s.dayHeader}>
                    <Text style={s.dayTitle}>{fmtFullDate(date)}</Text>
                    <View style={s.dayMeta}>
                      {hasPR && <View style={s.prDot}><Text style={s.prDotTxt}>PR</Text></View>}
                      <Text style={s.daySetCount}>{dayLogs.length} serie{dayLogs.length !== 1 ? 's' : ''}</Text>
                    </View>
                  </View>

                  {Object.entries(byEx).map(([exIdStr, exLogs]) => {
                    const exId = parseInt(exIdStr);
                    const ex = exLogs[0]?.exercise ?? getEx(exId);
                    const cc = CAT_COLOR[ex?.category ?? ''] ?? C.muted;
                    const best1rm = exLogs.reduce((b, l) => (l.estimated_1rm||0) > b ? (l.estimated_1rm||0) : b, 0);
                    const bestDur = exLogs.reduce((b, l) => (l.duration_sec||0) > b ? (l.duration_sec||0) : b, 0);
                    const bestReps = exLogs.reduce((b, l) => (l.reps||0) > b ? (l.reps||0) : b, 0);
                    let metaStr = '';
                    if (ex?.tracking_type === 'weight' && best1rm > 0)
                      metaStr = `${exLogs.length} series · Best 1RM: ${best1rm.toFixed(1)} kg`;
                    else if (ex?.tracking_type === 'time')
                      metaStr = `${exLogs.length} series · Max: ${bestDur}s`;
                    else
                      metaStr = `${exLogs.length} series · Max: ${bestReps} reps`;

                    return (
                      <View key={exId} style={s.exGroupRow}>
                        <View style={[s.exGroupBar, { backgroundColor: cc }]} />
                        <View style={{ flex: 1, paddingLeft: 12 }}>
                          <Text style={s.exGroupName}>{ex?.name ?? `Ejercicio ${exId}`}</Text>
                          <Text style={s.exGroupMeta}>{metaStr}</Text>
                          <View style={s.setsList}>
                            {exLogs.map((l, i) => {
                              let valStr = ex?.tracking_type === 'weight'
                                ? `+${l.added_weight}kg × ${l.reps}r`
                                : ex?.tracking_type === 'time' ? `${l.duration_sec}s`
                                : `${l.reps}r`;
                              return (
                                <View key={l.id ?? i} style={s.miniSetRow}>
                                  <Text style={s.miniSetNum}>S{i+1}</Text>
                                  <Text style={s.miniSetVal}>{valStr}</Text>
                                  {l.estimated_1rm > 0 && (
                                    <Text style={s.miniSet1rm}>{Number(l.estimated_1rm).toFixed(1)}kg 1RM</Text>
                                  )}
                                  {l.is_pr && <View style={s.prTag}><Text style={s.prTagTxt}>PR</Text></View>}
                                  <TouchableOpacity onPress={() => l.id && deleteLog(l.id)} style={s.delBtn}>
                                    <Ionicons name="trash-outline" size={16} color={C.borderLight} />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  logo: { fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: C.primary, fontWeight: '700' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, margin: 12, paddingHorizontal: 14, height: 40, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, color: C.text, fontSize: 14 },
  scroll: { padding: 12, paddingBottom: 100, gap: 12 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: -0.5, marginBottom: 4 },
  empty: { paddingTop: 60, alignItems: 'center', gap: 10 },
  emptyTxt: { fontSize: 16, color: C.muted, marginTop: 40, textAlign: 'center' },
  heatmapCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 16 },
  heatmapTitle: { fontSize: 11, fontWeight: '800', color: C.textSub, marginBottom: 10, letterSpacing: 0.5 },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  heatSquare: { width: 14, height: 14, borderRadius: 3 },
  volCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 24 },
  volTitle: { fontSize: 11, fontWeight: '800', color: C.textSub, marginBottom: 14, letterSpacing: 0.5 },
  volBars: { gap: 10 },
  volBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  volLabel: { fontSize: 10, fontWeight: '700', color: C.textSub, width: 60 },
  volBarBg: { flex: 1, height: 8, backgroundColor: C.surfaceHigh, borderRadius: 4, overflow: 'hidden' },
  volBarFill: { height: '100%', borderRadius: 4 },
  volVal: { fontSize: 10, fontWeight: '700', color: C.text, width: 42, textAlign: 'right' },
  dayCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  dayTitle: { fontSize: 14, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  dayMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prDot: { backgroundColor: C.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, shadowColor: C.primary, shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  prDotTxt: { fontSize: 9, color: '#fff', fontWeight: '900', letterSpacing: 1 },
  daySetCount: { fontSize: 11, color: C.mutedLight, fontWeight: '700' },
  exGroupRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  exGroupBar: { width: 4, borderRadius: 2, alignSelf: 'stretch' },
  exGroupName: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 2 },
  exGroupMeta: { fontSize: 11, color: C.muted, fontWeight: '700', marginBottom: 8 },
  setsList: { gap: 6 },
  miniSetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniSetNum: { fontSize: 10, color: C.mutedLight, fontWeight: '800', width: 20 },
  miniSetVal: { fontSize: 13, fontWeight: '800', color: C.text },
  miniSet1rm: { fontSize: 11, color: C.muted, flex: 1 },
  prTag: { backgroundColor: C.primaryDim, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  prTagTxt: { fontSize: 9, color: C.primary, fontWeight: '900', letterSpacing: 0.5 },
  delBtn: { padding: 4 },
});
