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
import { C, CAT_COLOR } from '../constants/theme';

const W = Dimensions.get('window').width;

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtDate(d: string) {
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : d;
}

function fmtMonth(m: string) {
  const parts = m.split('-');
  if (parts.length < 2) return m;
  return MONTHS[parseInt(parts[1]) - 1] ?? m;
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
      const plan = plans.find((p: any) => p.exercise_id === exId);
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
  const catColor = CAT_COLOR[selected?.category ?? ''] ?? C.primary;

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

  const hasMonthlyData = monthlyBests.length >= 2;
  const monthlyChartData = hasMonthlyData ? {
    labels: monthlyBests.map(m => fmtMonth(m.month)),
    datasets: [{ data: monthlyBests.map(m => m.best1rm) }],
  } : null;

  const activeChartData = chartMode === 'sessions' ? sessionChartData : monthlyChartData;
  const yLabel = selected?.tracking_type === 'time' ? 's' : selected?.tracking_type === 'reps' ? '' : 'kg';
  const prs = logs.filter(l => l.is_pr).slice(0, 8);

  return (
    <SafeAreaView style={s.container} edges={['top','left','right']}>
      <View style={s.header}>
        <Text style={s.logo}>ALGO<Text style={{ color: C.primary }}>R</Text>LIFT</Text>
        <Text style={s.headerSub}>Progreso</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.pageTitle}>Progreso</Text>

        {/* Exercise Selector */}
        <TouchableOpacity style={[s.exCard, { borderLeftColor: catColor }]} onPress={() => setPickerOpen(true)}>
          <View style={{ flex: 1 }}>
            <Text style={s.exLabel}>EJERCICIO</Text>
            <Text style={s.exName}>{selected?.name ?? '—'}</Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={C.muted} />
        </TouchableOpacity>

        {loading && <ActivityIndicator color={C.primary} style={{ marginVertical: 30 }} />}

        {!loading && selected && (
          <>
            {/* Stats Row */}
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>MEJOR 1RM</Text>
                <Text style={[s.statVal, { color: catColor }]}>
                  {best1rm > 0 ? RM.format(best1rm) : '—'}
                </Text>
                <Text style={s.statUnit}>
                  {selected.tracking_type === 'weight' && best1rm > 0 ? 'kg' :
                   selected.tracking_type === 'time' && best1rm > 0 ? 'seg' : ''}
                </Text>
                {bestDate ? <Text style={s.statDate}>{fmtDate(bestDate)}</Text> : null}
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>SERIES</Text>
                <Text style={s.statVal}>{logs.length}</Text>
                <Text style={s.statUnit}>total</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>PRs</Text>
                <Text style={[s.statVal, { color: C.success }]}>{prs.length}</Text>
                <Text style={s.statUnit}>records</Text>
              </View>
            </View>

            {/* 1RM Percentages */}
            {selected.tracking_type === 'weight' && best1rm > 0 && (
              <View style={s.pctCard}>
                <Text style={s.pctTitle}>TABLA DE PORCENTAJES (1RM: {RM.format(best1rm)} kg)</Text>
                <View style={s.pctGrid}>
                  {[95, 90, 85, 80, 75, 70, 65, 60].map(pct => (
                    <View key={pct} style={s.pctCell}>
                      <Text style={s.pctLabel}>{pct}%</Text>
                      <Text style={[s.pctVal, { color: catColor }]}>{RM.format(best1rm * (pct / 100))} kg</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Year Goal */}
            {goalPct !== null && yearGoal && (
              <View style={s.goalCard}>
                <View style={s.goalHeaderRow}>
                  <Text style={s.goalLabel}>META 2026</Text>
                  <Text style={s.goalTarget}>{yearGoal} kg</Text>
                </View>
                <View style={s.goalBarBg}>
                  <View style={[s.goalBarFill, { width: `${goalPct}%` as any, backgroundColor: catColor }]} />
                </View>
                <View style={s.goalFooterRow}>
                  <Text style={s.goalCurrent}>{RM.format(best1rm)} kg actual</Text>
                  <Text style={[s.goalPct, { color: goalPct >= 100 ? C.success : catColor }]}>{goalPct}%</Text>
                </View>
              </View>
            )}

            {/* Chart Toggle */}
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

            {/* Chart */}
            <View style={s.chartCard}>
              <Text style={s.chartTitle}>
                {selected.tracking_type === 'weight' ? 'Evolución 1RM (kg)' :
                 selected.tracking_type === 'time' ? 'Evolución Hold (seg)' : 'Evolución Reps'}
              </Text>
              {activeChartData ? (
                <LineChart
                  data={activeChartData}
                  width={W - 60}
                  height={200}
                  yAxisSuffix={yLabel}
                  chartConfig={{
                    backgroundColor: C.surface,
                    backgroundGradientFrom: C.surface,
                    backgroundGradientTo: C.surface,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `${catColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
                    labelColor: () => C.muted,
                    propsForDots: { r: '5', strokeWidth: '2', stroke: C.bg, fill: catColor },
                    propsForBackgroundLines: { stroke: C.border },
                  }}
                  bezier
                  style={{ borderRadius: 10, marginTop: 10 }}
                  withInnerLines
                  withOuterLines={false}
                />
              ) : (
                <View style={s.noData}>
                  <MaterialCommunityIcons name="chart-line" size={40} color={C.border} />
                  <Text style={s.noDataTxt}>Faltan más registros para graficar</Text>
                </View>
              )}
            </View>

            {/* Monthly Bests Table */}
            {monthlyBests.length > 0 && (
              <View style={s.tableCard}>
                <Text style={s.tableTitle}>MEJOR POR MES</Text>
                {monthlyBests.slice(-12).reverse().map((mb, i) => {
                  const prevIdx = monthlyBests.length - i - 2;
                  const prev = prevIdx >= 0 ? monthlyBests[prevIdx] : null;
                  const up = prev && mb.best1rm > prev.best1rm;
                  const down = prev && mb.best1rm < prev.best1rm;
                  return (
                    <View key={mb.month} style={s.tableRow}>
                      <Text style={s.tableMonth}>{fmtMonth(mb.month)}</Text>
                      <Text style={s.tableVal}>
                        {RM.format(mb.best1rm)}
                        {selected.tracking_type !== 'reps' ? <Text style={s.tableUnit}> {yLabel}</Text> : null}
                      </Text>
                      {up
                        ? <Ionicons name="trending-up" size={14} color={C.success} style={{ marginLeft: 8 }} />
                        : down
                        ? <Ionicons name="trending-down" size={14} color={C.error} style={{ marginLeft: 8 }} />
                        : <View style={{ width: 22 }} />}
                    </View>
                  );
                })}
              </View>
            )}

            {/* PRs List */}
            {prs.length > 0 && (
              <View style={s.tableCard}>
                <Text style={s.tableTitle}>RECORDS PERSONALES</Text>
                {prs.map((pr, i) => (
                  <View key={pr.id ?? i} style={s.prRow}>
                    <View style={[s.prRank, i === 0 && s.prRankGold]}>
                      <Text style={[s.prRankTxt, i === 0 && { color: '#F59E0B' }]}>#{i + 1}</Text>
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

      {/* Exercise Picker */}
      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View style={s.overlay}>
          <SafeAreaView style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>ELEGIR EJERCICIO</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={26} color={C.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={exercises}
              keyExtractor={i => String(i.id)}
              contentContainerStyle={{ padding: 14, gap: 8 }}
              renderItem={({ item }) => {
                const col = CAT_COLOR[item.category] ?? C.muted;
                const isSel = selected?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[s.sheetItem, isSel && { borderColor: col, backgroundColor: col + '18' }]}
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
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  logo: { fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: C.muted, fontWeight: '600' },
  scroll: { padding: 14, paddingBottom: 100, gap: 14 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: -0.5, marginBottom: 2 },
  exCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, borderLeftWidth: 4 },
  exLabel: { fontSize: 9, color: C.muted, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 },
  exName: { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: '800', color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: -0.8 },
  goalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goalLabel: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
  goalTarget: { fontSize: 14, fontWeight: '900', color: C.text },
  goalBarBg: { height: 6, backgroundColor: C.surfaceHigh, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  goalBarFill: { height: 6, borderRadius: 3 },
  goalFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalCurrent: { fontSize: 11, color: C.muted, fontWeight: '600' },
  goalPct: { fontSize: 13, fontWeight: '900' },
  chartToggleRow: { flexDirection: 'row', gap: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 4 },
  chartToggleBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 9 },
  chartToggleTxt: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 1 },
  chartCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
  chartTitle: { fontSize: 11, fontWeight: '700', color: C.textSub, marginBottom: 4 },
  noData: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  noDataTxt: { fontSize: 12, color: C.muted, textAlign: 'center' },
  sheetItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },

  tableCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  tableTitle: { fontSize: 11, fontWeight: '900', color: C.mutedLight, letterSpacing: 1, marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  tableMonth: { width: 44, fontSize: 13, color: C.textSub, fontWeight: '800' },
  tableVal: { flex: 1, fontSize: 16, fontWeight: '900', color: C.text, textAlign: 'right' },
  tableUnit: { fontSize: 12, color: C.muted },

  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  prRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  prRankGold: { backgroundColor: '#F59E0B25' },
  prRankTxt: { fontSize: 12, fontWeight: '900', color: C.muted },
  prMain: { fontSize: 15, fontWeight: '800', color: C.text },
  pr1rm: { fontSize: 12, color: C.primary, fontWeight: '800', marginTop: 4 },
  prDate: { fontSize: 11, color: C.muted, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: C.border },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: C.text, letterSpacing: 1 },
  statUnit: { fontSize: 10, color: C.muted, fontWeight: '600' },
  statDate: { fontSize: 9, color: C.mutedLight, marginTop: 4 },
  pctCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 16 },
  pctTitle: { fontSize: 11, fontWeight: '800', color: C.textSub, marginBottom: 10, letterSpacing: 0.5 },
  pctGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  pctCell: { width: '22%', backgroundColor: C.surfaceHigh, borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  pctLabel: { fontSize: 12, fontWeight: '800', color: C.muted, marginBottom: 2 },
  pctVal: { fontSize: 12, fontWeight: '800' },
  goalCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 16 },
  sheetDot: { width: 4, height: 28, borderRadius: 2 },
  sheetItemName: { fontSize: 15, fontWeight: '800', color: C.textSub },
  sheetItemSub: { fontSize: 11, color: C.muted, marginTop: 4 },
});
