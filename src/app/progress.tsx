import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { workoutService, RM, Exercise, WorkoutLog } from '../utils/workoutService';

const W = Dimensions.get('window').width;

const CAT_COLOR: Record<string, string> = {
  EMPUJE: '#E63946', TRACCION: '#3B82F6', PIERNA: '#10B981', SKILL: '#F59E0B',
};

function fmtDate(d: string) {
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : d;
}

function fmtMonth(m: string) {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const parts = m.split('-');
  if (parts.length < 2) return m;
  return months[parseInt(parts[1]) - 1] ?? m;
}

export default function ProgressScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [monthlyBests, setMonthlyBests] = useState<{ month: string; best1rm: number }[]>([]);
  const [best1rm, setBest1rm] = useState(0);
  const [bestDate, setBestDate] = useState('');
  const [yearGoal, setYearGoal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chartMode, setChartMode] = useState<'sessions' | 'monthly'>('sessions');

  useEffect(() => {
    (async () => {
      const list = await workoutService.getExercises();
      setExercises(list);
      if (list.length > 0) setSelected(list[0]);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (selected) loadData(selected.id);
    }, [selected?.id])
  );

  const loadData = async (exId: number) => {
    setLoading(true);
    try {
      const [allLogs, monthly, best, plans] = await Promise.all([
        workoutService.getLogsForExercise(exId, 60),
        workoutService.getMonthlyBests(exId),
        workoutService.getBest1RM(exId),
        workoutService.getProgressionPlans(),
      ]);
      setLogs(allLogs);
      setMonthlyBests(monthly);
      setBest1rm(best.best1rm || best.bestDuration || best.bestReps);
      setBestDate(best.bestDate);
      const plan = plans.find(p => p.exercise_id === exId);
      setYearGoal(plan?.year_goal ?? plan?.target_1rm ?? null);
    } finally {
      setLoading(false);
    }
  };

  const selectEx = (ex: Exercise) => {
    setSelected(ex);
    setPickerOpen(false);
    loadData(ex.id);
  };

  const goalPct = yearGoal && best1rm ? Math.min(100, Math.round((best1rm / yearGoal) * 100)) : null;
  const catColor = CAT_COLOR[selected?.category ?? ''] ?? '#E63946';

  // Chart data — sessions
  const sessionsForChart = [...logs].reverse().slice(-20);
  const hasSessionData = sessionsForChart.length >= 2;
  const sessionChartData = hasSessionData ? {
    labels: sessionsForChart.map(l => fmtDate(l.date)),
    datasets: [{
      data: sessionsForChart.map(l =>
        selected?.tracking_type === 'time' ? (l.duration_sec || 0)
        : selected?.tracking_type === 'reps' ? (l.reps || 0)
        : Number(l.estimated_1rm) || 0
      ),
    }],
  } : null;

  // Chart data — monthly
  const hasMonthlyData = monthlyBests.length >= 2;
  const monthlyChartData = hasMonthlyData ? {
    labels: monthlyBests.map(m => fmtMonth(m.month)),
    datasets: [{ data: monthlyBests.map(m => m.best1rm) }],
  } : null;

  const activeChartData = chartMode === 'sessions' ? sessionChartData : monthlyChartData;
  const yLabel = selected?.tracking_type === 'time' ? 's' : selected?.tracking_type === 'reps' ? '' : 'kg';

  // PRs list
  const prs = logs.filter(l => l.is_pr).slice(0, 8);

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>PROGRESO</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* ── Exercise Selector ──────────────────────── */}
        <TouchableOpacity style={[s.exCard, { borderLeftColor: catColor }]} onPress={() => setPickerOpen(true)}>
          <View style={{ flex: 1 }}>
            <Text style={s.exLabel}>EJERCICIO</Text>
            <Text style={s.exName}>{selected?.name ?? '—'}</Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#555" />
        </TouchableOpacity>

        {loading && <ActivityIndicator color="#E63946" style={{ marginVertical: 30 }} />}

        {!loading && selected && (
          <>
            {/* ── Top Stats ─────────────────────────────── */}
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>MEJOR 1RM</Text>
                <Text style={[s.statVal, { color: catColor }]}>
                  {best1rm > 0 ? `${RM.format(best1rm)}` : '—'}
                  {selected.tracking_type === 'weight' && best1rm > 0 && <Text style={s.statUnit}> kg</Text>}
                  {selected.tracking_type === 'time' && best1rm > 0 && <Text style={s.statUnit}> seg</Text>}
                </Text>
                {bestDate ? <Text style={s.statDate}>{fmtDate(bestDate)}</Text> : null}
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>TOTAL SERIES</Text>
                <Text style={s.statVal}>{logs.length}</Text>
                <Text style={s.statDate}>registradas</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>PRs</Text>
                <Text style={[s.statVal, { color: '#22C55E' }]}>{prs.length}</Text>
                <Text style={s.statDate}>personales</Text>
              </View>
            </View>

            {/* ── Year Goal Progress ─────────────────────── */}
            {goalPct !== null && yearGoal && (
              <View style={s.goalCard}>
                <View style={s.goalHeaderRow}>
                  <Text style={s.goalLabel}>META 2026</Text>
                  <Text style={s.goalTarget}>{yearGoal} kg</Text>
                </View>
                <View style={s.goalBarBg}>
                  <View style={[s.goalBarFill, { width: `${goalPct}%`, backgroundColor: catColor }]} />
                </View>
                <View style={s.goalFooterRow}>
                  <Text style={s.goalCurrent}>{RM.format(best1rm)} kg actual</Text>
                  <Text style={[s.goalPct, { color: goalPct >= 100 ? '#22C55E' : catColor }]}>{goalPct}%</Text>
                </View>
              </View>
            )}

            {/* ── Chart Mode Toggle ─────────────────────── */}
            <View style={s.chartToggleRow}>
              <TouchableOpacity
                style={[s.chartToggleBtn, chartMode === 'sessions' && { backgroundColor: catColor }]}
                onPress={() => setChartMode('sessions')}
              >
                <Text style={[s.chartToggleTxt, chartMode === 'sessions' && { color: '#FFF' }]}>SESIONES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.chartToggleBtn, chartMode === 'monthly' && { backgroundColor: catColor }]}
                onPress={() => setChartMode('monthly')}
              >
                <Text style={[s.chartToggleTxt, chartMode === 'monthly' && { color: '#FFF' }]}>POR MES</Text>
              </TouchableOpacity>
            </View>

            {/* ── Chart ────────────────────────────────── */}
            <View style={s.chartCard}>
              <Text style={s.chartTitle}>
                {selected.tracking_type === 'weight' ? 'Evolución 1RM (kg)' :
                  selected.tracking_type === 'time' ? 'Evolución Hold (seg)' : 'Evolución Reps'}
              </Text>
              {activeChartData ? (
                <LineChart
                  data={activeChartData}
                  width={W - 64}
                  height={220}
                  yAxisSuffix={yLabel}
                  chartConfig={{
                    backgroundColor: '#141414',
                    backgroundGradientFrom: '#141414',
                    backgroundGradientTo: '#141414',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `${catColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
                    labelColor: () => '#444',
                    propsForDots: { r: '5', strokeWidth: '2', stroke: '#0A0A0A', fill: catColor },
                    propsForBackgroundLines: { stroke: '#1A1A1A' },
                  }}
                  bezier
                  style={{ borderRadius: 12, marginTop: 10 }}
                  withInnerLines
                  withOuterLines={false}
                />
              ) : (
                <View style={s.noData}>
                  <MaterialCommunityIcons name="chart-line" size={40} color="#2A2A2A" />
                  <Text style={s.noDataTxt}>Faltan más registros para graficar</Text>
                </View>
              )}
            </View>

            {/* ── Monthly Best Table ─────────────────────── */}
            {monthlyBests.length > 0 && (
              <View style={s.tableCard}>
                <Text style={s.tableTitle}>MEJOR POR MES</Text>
                {monthlyBests.slice(-12).reverse().map((mb, i) => {
                  const prev = monthlyBests[monthlyBests.length - i - 2];
                  const up = prev && mb.best1rm > prev.best1rm;
                  const down = prev && mb.best1rm < prev.best1rm;
                  return (
                    <View key={mb.month} style={s.tableRow}>
                      <Text style={s.tableMonth}>{fmtMonth(mb.month)}</Text>
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={s.tableVal}>
                          {RM.format(mb.best1rm)}
                          {selected.tracking_type !== 'reps' && <Text style={s.tableUnit}> {yLabel}</Text>}
                        </Text>
                      </View>
                      {up && <Ionicons name="trending-up" size={16} color="#22C55E" style={{ marginLeft: 8 }} />}
                      {down && <Ionicons name="trending-down" size={16} color="#E63946" style={{ marginLeft: 8 }} />}
                      {!up && !down && <View style={{ width: 24 }} />}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── PRs List ─────────────────────────────── */}
            {prs.length > 0 && (
              <View style={s.tableCard}>
                <Text style={s.tableTitle}>RECORDS PERSONALES ⭐</Text>
                {prs.map((pr, i) => (
                  <View key={pr.id ?? i} style={s.prRow}>
                    <View style={[s.prRank, { backgroundColor: i === 0 ? '#F59E0B20' : '#1A1A1A' }]}>
                      <Text style={[s.prRankTxt, { color: i === 0 ? '#F59E0B' : '#555' }]}>#{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      {selected.tracking_type === 'weight' ? (
                        <>
                          <Text style={s.prMain}>+{pr.added_weight} kg × {pr.reps} reps</Text>
                          <Text style={s.pr1rm}>1RM: {Number(pr.estimated_1rm).toFixed(1)} kg</Text>
                        </>
                      ) : selected.tracking_type === 'time' ? (
                        <Text style={s.prMain}>{pr.duration_sec} seg</Text>
                      ) : (
                        <Text style={s.prMain}>{pr.reps} reps</Text>
                      )}
                    </View>
                    <Text style={s.prDate}>{fmtDate(pr.date)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Exercise Picker Modal ─────────────────────── */}
      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View style={s.overlay}>
          <SafeAreaView style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>ELEGIR EJERCICIO</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={exercises}
              keyExtractor={i => String(i.id)}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              renderItem={({ item }) => {
                const col = CAT_COLOR[item.category] ?? '#888';
                const isSel = selected?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[s.sheetItem, isSel && { borderColor: col, backgroundColor: col + '15' }]}
                    onPress={() => selectEx(item)}
                  >
                    <View style={[s.sheetDot, { backgroundColor: col }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.sheetItemName, isSel && { color: col }]}>{item.name}</Text>
                      <Text style={s.sheetItemSub}>{item.category}</Text>
                    </View>
                    {isSel && <Ionicons name="checkmark-circle" size={20} color={col} />}
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#161616' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  scroll: { padding: 12, paddingBottom: 50, gap: 8 },

  exCard: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#222', borderLeftWidth: 4, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' },
  exLabel: { fontSize: 9, color: '#555', fontWeight: '800', letterSpacing: 1 },
  exName: { fontSize: 17, fontWeight: '900', color: '#FFF', marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: '#141414', borderWidth: 1, borderColor: '#1E1E1E', borderRadius: 12, padding: 10, alignItems: 'center' },
  statLabel: { fontSize: 9, color: '#555', fontWeight: '800', letterSpacing: 0.8, textAlign: 'center' },
  statVal: { fontSize: 22, fontWeight: '900', color: '#FFF', marginTop: 3 },
  statUnit: { fontSize: 12, fontWeight: '600', color: '#888' },
  statDate: { fontSize: 9, color: '#555', marginTop: 2 },

  goalCard: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 12 },
  goalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalLabel: { fontSize: 10, color: '#555', fontWeight: '800', letterSpacing: 0.8 },
  goalTarget: { fontSize: 12, color: '#888', fontWeight: '700' },
  goalBarBg: { height: 6, backgroundColor: '#1E1E1E', borderRadius: 3, overflow: 'hidden' },
  goalBarFill: { height: 6, borderRadius: 3 },
  goalFooterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  goalCurrent: { fontSize: 11, color: '#666', fontWeight: '700' },
  goalPct: { fontSize: 13, fontWeight: '900' },

  chartToggleRow: { flexDirection: 'row', gap: 6, backgroundColor: '#111', borderRadius: 10, padding: 3 },
  chartToggleBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  chartToggleTxt: { fontSize: 11, fontWeight: '800', color: '#444', letterSpacing: 0.5 },

  chartCard: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#1E1E1E', borderRadius: 14, padding: 12, alignItems: 'center' },
  chartTitle: { fontSize: 12, fontWeight: '900', color: '#888', letterSpacing: 0.5, alignSelf: 'flex-start' },
  noData: { paddingVertical: 30, alignItems: 'center' },
  noDataTxt: { color: '#333', fontSize: 12, marginTop: 8, fontWeight: '600' },

  tableCard: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#1E1E1E', borderRadius: 14, padding: 12 },
  tableTitle: { fontSize: 11, fontWeight: '900', color: '#555', letterSpacing: 1, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#141414' },
  tableMonth: { width: 40, fontSize: 12, color: '#888', fontWeight: '700' },
  tableVal: { fontSize: 14, fontWeight: '900', color: '#FFF' },
  tableUnit: { fontSize: 11, color: '#666' },

  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#141414' },
  prRank: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  prRankTxt: { fontSize: 11, fontWeight: '900' },
  prMain: { fontSize: 13, fontWeight: '800', color: '#EEE' },
  pr1rm: { fontSize: 10, color: '#E63946', fontWeight: '700', marginTop: 2 },
  prDate: { fontSize: 10, color: '#555', fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111', height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: '#222' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  sheetTitle: { fontSize: 15, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1E1E1E', borderRadius: 10, padding: 10, gap: 10 },
  sheetDot: { width: 3, height: 26, borderRadius: 2 },
  sheetItemName: { fontSize: 13, fontWeight: '800', color: '#DDD' },
  sheetItemSub: { fontSize: 10, color: '#555', marginTop: 2 },
});
