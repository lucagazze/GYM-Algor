import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Modal, FlatList, Share, Platform, Alert,
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

function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 2) return null;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function calcProjection(
  monthlyBests: { month: string; best1rm: number }[],
  goalKg: number,
): { monthsToGoal: number; targetLabel: string; ratePerMonth: number } | null {
  if (monthlyBests.length < 3) return null;
  const last = monthlyBests[monthlyBests.length - 1];
  if (last.best1rm >= goalKg) return null;

  // Use last 6 months max for trend
  const slice = monthlyBests.slice(-6);
  const [fy, fm] = slice[0].month.split('-').map(Number);
  const toNum = (m: string) => {
    const [y, mo] = m.split('-').map(Number);
    return (y - fy) * 12 + (mo - fm);
  };
  const points = slice.map(m => ({ x: toNum(m.month), y: m.best1rm }));
  const reg = linearRegression(points);
  if (!reg || reg.slope <= 0) return null;

  const lastX = points[points.length - 1].x;
  const monthsToGoal = Math.ceil((goalKg - (reg.intercept + reg.slope * lastX)) / reg.slope);
  if (monthsToGoal <= 0 || monthsToGoal > 36) return null;

  const target = new Date();
  target.setMonth(target.getMonth() + monthsToGoal);
  const targetLabel = `${MONTHS[target.getMonth()]} ${target.getFullYear()}`;

  return { monthsToGoal, targetLabel, ratePerMonth: Math.round(reg.slope * 10) / 10 };
}

async function sharePR(pr: WorkoutLog, exName: string, trackingType: string) {
  let msg = '';
  if (trackingType === 'weight') {
    msg = `Nuevo PR 🏆\n${exName}\n+${pr.added_weight}kg × ${pr.reps} reps\n1RM estimado: ${Number(pr.estimated_1rm).toFixed(1)}kg\n\n#AlgorLift`;
  } else if (trackingType === 'time') {
    msg = `Nuevo PR 🏆\n${exName}\n${pr.duration_sec} segundos\n\n#AlgorLift`;
  } else {
    msg = `Nuevo PR 🏆\n${exName}\n${pr.reps} reps\n\n#AlgorLift`;
  }
  if (Platform.OS === 'web') {
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ text: msg });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(msg);
        Alert.alert('Copiado', 'Texto del PR copiado al portapapeles');
      }
    } catch {}
    return;
  }
  try { await Share.share({ message: msg }); } catch {}
}

export default function ProgressScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [monthlyBests, setMonthlyBests] = useState<{ month: string; best1rm: number }[]>([]);
  const [best1rm, setBest1rm] = useState(0);
  const [bestDate, setBestDate] = useState('');
  const [yearGoal, setYearGoal] = useState<number | null>(null);
  const [weeklyVolume, setWeeklyVolume] = useState<{ category: string; sets: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chartMode, setChartMode] = useState<'sessions' | 'monthly'>('sessions');

  useEffect(() => {
    (async () => {
      const [list, vol] = await Promise.all([
        workoutService.getExercises(),
        workoutService.getWeeklyVolumeByCategory(),
      ]);
      setExercises(list);
      setWeeklyVolume(vol);
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
  const projection = yearGoal && monthlyBests.length >= 3
    ? calcProjection(monthlyBests, yearGoal) : null;

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

  const maxVolSets = Math.max(...weeklyVolume.map(v => v.sets), 1);

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <Text style={s.logo}>ALGO<Text style={{ color: C.primary }}>R</Text>LIFT</Text>
        <Text style={s.headerSub}>Progreso</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Weekly Volume */}
        {weeklyVolume.some(v => v.sets > 0) && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>VOLUMEN SEMANAL — ÚLTIMOS 7 DÍAS</Text>
            <View style={s.volGrid}>
              {weeklyVolume.map(v => {
                const cc = CAT_COLOR[v.category] ?? C.primary;
                const pct = (v.sets / maxVolSets) * 100;
                return (
                  <View key={v.category} style={s.volItem}>
                    <View style={s.volBarWrap}>
                      <View style={[s.volBarFill, { height: `${Math.max(4, pct)}%` as any, backgroundColor: cc }]} />
                    </View>
                    <Text style={[s.volVal, { color: v.sets > 0 ? cc : C.muted }]}>{v.sets}</Text>
                    <Text style={s.volLbl}>{v.category.slice(0, 3)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

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
              <View style={s.card}>
                <Text style={s.sectionLabel}>PORCENTAJES — 1RM: {RM.format(best1rm)} kg</Text>
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
              <View style={s.card}>
                <View style={s.goalHeaderRow}>
                  <Text style={s.sectionLabel}>META 2026</Text>
                  <Text style={s.goalTarget}>{yearGoal} kg</Text>
                </View>
                <View style={s.goalBarBg}>
                  <View style={[s.goalBarFill, { width: `${goalPct}%` as any, backgroundColor: catColor }]} />
                </View>
                <View style={s.goalFooterRow}>
                  <Text style={s.goalCurrent}>{RM.format(best1rm)} kg actual</Text>
                  <Text style={[s.goalPct, { color: goalPct >= 100 ? C.success : catColor }]}>{goalPct}%</Text>
                </View>

                {/* Projection */}
                {projection && (
                  <View style={s.projectionRow}>
                    <Ionicons name="trending-up" size={14} color={catColor} />
                    <Text style={s.projectionTxt}>
                      Al ritmo actual (+{projection.ratePerMonth} kg/mes) llegás en{' '}
                      <Text style={{ color: catColor, fontWeight: '900' }}>{projection.targetLabel}</Text>
                      {' '}({projection.monthsToGoal} {projection.monthsToGoal === 1 ? 'mes' : 'meses'})
                    </Text>
                  </View>
                )}
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
            <View style={s.card}>
              <Text style={s.sectionLabel}>
                {selected.tracking_type === 'weight' ? 'EVOLUCIÓN 1RM (kg)' :
                 selected.tracking_type === 'time' ? 'EVOLUCIÓN HOLD (seg)' : 'EVOLUCIÓN REPS'}
              </Text>
              {activeChartData ? (
                <LineChart
                  data={activeChartData}
                  width={W - 60}
                  height={180}
                  yAxisSuffix={yLabel}
                  chartConfig={{
                    backgroundColor: C.surface,
                    backgroundGradientFrom: C.surface,
                    backgroundGradientTo: C.surface,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `${catColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
                    labelColor: () => C.muted,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: C.bg, fill: catColor },
                    propsForBackgroundLines: { stroke: C.border },
                  }}
                  bezier
                  style={{ borderRadius: 10, marginTop: 8 }}
                  withInnerLines
                  withOuterLines={false}
                />
              ) : (
                <View style={s.noData}>
                  <MaterialCommunityIcons name="chart-line" size={36} color={C.border} />
                  <Text style={s.noDataTxt}>Faltan más registros para graficar</Text>
                </View>
              )}
            </View>

            {/* Monthly Bests Table */}
            {monthlyBests.length > 0 && (
              <View style={s.card}>
                <Text style={s.sectionLabel}>MEJOR POR MES</Text>
                {monthlyBests.slice(-12).reverse().map((mb, i, arr) => {
                  const prevIdx = arr.length - 1 - i - 1;
                  // Compare against previous month in the reversed array
                  const prevMb = arr[i + 1];
                  const up = prevMb && mb.best1rm > prevMb.best1rm;
                  const down = prevMb && mb.best1rm < prevMb.best1rm;
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
              <View style={s.card}>
                <Text style={s.sectionLabel}>RÉCORDS PERSONALES</Text>
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
                    <TouchableOpacity
                      onPress={() => sharePR(pr, selected.name, selected.tracking_type)}
                      style={s.shareBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="share-outline" size={16} color={C.muted} />
                    </TouchableOpacity>
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
                <Ionicons name="close" size={24} color={C.text} />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  logo: { fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: C.muted, fontWeight: '600' },
  scroll: { padding: 12, paddingBottom: 100, gap: 12 },
  sectionLabel: { fontSize: 9, fontWeight: '800', color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },

  // Weekly volume (bar chart vertical)
  volGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 70, gap: 8 },
  volItem: { flex: 1, alignItems: 'center', gap: 3 },
  volBarWrap: { flex: 1, width: '60%', justifyContent: 'flex-end', alignItems: 'center' },
  volBarFill: { width: '100%', borderRadius: 4, minHeight: 4 },
  volVal: { fontSize: 12, fontWeight: '900' },
  volLbl: { fontSize: 8, fontWeight: '700', color: C.muted, letterSpacing: 0.5 },

  exCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderLeftWidth: 4 },
  exLabel: { fontSize: 9, color: C.muted, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 },
  exName: { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: -0.3 },

  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, alignItems: 'center' },
  statLabel: { fontSize: 8, fontWeight: '800', color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  statVal: { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: -0.8 },
  statUnit: { fontSize: 10, color: C.muted, fontWeight: '600' },
  statDate: { fontSize: 9, color: C.mutedLight, marginTop: 4 },

  pctGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pctCell: { width: '22%', backgroundColor: C.surfaceHigh, borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  pctLabel: { fontSize: 11, fontWeight: '800', color: C.muted, marginBottom: 2 },
  pctVal: { fontSize: 11, fontWeight: '900' },

  goalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goalTarget: { fontSize: 14, fontWeight: '900', color: C.text },
  goalBarBg: { height: 6, backgroundColor: C.surfaceHigh, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  goalBarFill: { height: 6, borderRadius: 3 },
  goalFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalCurrent: { fontSize: 11, color: C.muted, fontWeight: '600' },
  goalPct: { fontSize: 13, fontWeight: '900' },
  projectionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  projectionTxt: { flex: 1, fontSize: 12, color: C.textSub, fontWeight: '600', lineHeight: 17 },

  chartToggleRow: { flexDirection: 'row', gap: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 4 },
  chartToggleBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 9 },
  chartToggleTxt: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 1 },
  noData: { paddingVertical: 30, alignItems: 'center', gap: 8 },
  noDataTxt: { fontSize: 12, color: C.muted, textAlign: 'center' },

  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  tableMonth: { width: 40, fontSize: 13, color: C.textSub, fontWeight: '800' },
  tableVal: { flex: 1, fontSize: 15, fontWeight: '900', color: C.text, textAlign: 'right' },
  tableUnit: { fontSize: 11, color: C.muted },

  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 0 },
  prRank: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  prRankGold: { backgroundColor: '#F59E0B25' },
  prRankTxt: { fontSize: 11, fontWeight: '900', color: C.muted },
  prMain: { fontSize: 14, fontWeight: '800', color: C.text },
  pr1rm: { fontSize: 11, color: C.primary, fontWeight: '800', marginTop: 2 },
  prDate: { fontSize: 10, color: C.muted, fontWeight: '700', marginRight: 8 },
  shareBtn: { padding: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: C.border },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetTitle: { fontSize: 14, fontWeight: '900', color: C.text, letterSpacing: 1 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  sheetDot: { width: 4, height: 28, borderRadius: 2 },
  sheetItemName: { fontSize: 14, fontWeight: '800', color: C.textSub },
  sheetItemSub: { fontSize: 11, color: C.muted, marginTop: 3 },
});
