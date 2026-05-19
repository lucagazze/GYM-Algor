import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { workoutService, RM, ExerciseRecord } from '../utils/workoutService';

const CAT_COLOR: Record<string, string> = {
  EMPUJE: '#E63946', TRACCION: '#3B82F6', PIERNA: '#10B981', SKILL: '#F59E0B',
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function fmtRecordDate(d: string) {
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  return `${parseInt(parts[2], 10)} ${MONTHS[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

type Formula = 'epley' | 'brzycki' | 'wathen' | 'mayhew' | 'average';

const FORMULAS: { key: Formula; label: string; desc: string }[] = [
  { key: 'epley', label: 'Epley', desc: 'w × (1 + r/30)' },
  { key: 'brzycki', label: 'Brzycki', desc: 'w / (1.028 - 0.028r)' },
  { key: 'wathen', label: 'Wathen', desc: 'Mejor para 1-6 reps' },
  { key: 'mayhew', label: 'Mayhew', desc: 'Ideal para Bench Press' },
  { key: 'average', label: 'Promedio', desc: 'Epley + Brzycki + Wathen' },
];

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={rb.barBg}>
      <View style={[rb.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
    </View>
  );
}

const rb = StyleSheet.create({
  barBg: { height: 4, backgroundColor: '#1E1E1E', borderRadius: 2, overflow: 'hidden', flex: 1 },
  barFill: { height: 4, borderRadius: 2 },
});

export default function RecordsScreen() {
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculator state
  const [calcW, setCalcW] = useState('');
  const [calcBW, setCalcBW] = useState('');
  const [calcR, setCalcR] = useState('');
  const [formula, setFormula] = useState<Formula>('average');
  const [showFormulas, setShowFormulas] = useState(false);

  useFocusEffect(
    useCallback(() => { loadRecords(); }, [])
  );

  const loadRecords = async () => {
    setLoading(true);
    const recs = await workoutService.getAllRecords();
    setRecords(recs);
    setLoading(false);
  };

  const totalW = parseFloat(calcBW || '0') + parseFloat(calcW || '0');
  const rv = parseInt(calcR || '0');
  const calcResult = totalW > 0 && rv > 0 ? RM[formula](totalW, rv) : null;

  const cats = ['EMPUJE', 'TRACCION', 'PIERNA', 'SKILL'];

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <MaterialCommunityIcons name="trophy" size={22} color="#E63946" />
        <Text style={s.headerTitle}>RECORDS 1RM</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* ── 1RM Calculator ─────────────────────────── */}
        <View style={s.calcCard}>
          <Text style={s.calcTitle}>CALCULADORA 1RM</Text>

          <View style={s.calcRow}>
            <View style={s.calcInput}>
              <Text style={s.inputLabel}>PESO CORP. (kg)</Text>
              <TextInput
                style={s.input} keyboardType="decimal-pad"
                value={calcBW} onChangeText={setCalcBW}
                placeholder="86" placeholderTextColor="#333"
              />
            </View>
            <Text style={s.calcPlus}>+</Text>
            <View style={s.calcInput}>
              <Text style={s.inputLabel}>LASTRE (kg)</Text>
              <TextInput
                style={s.input} keyboardType="decimal-pad"
                value={calcW} onChangeText={setCalcW}
                placeholder="30" placeholderTextColor="#333"
              />
            </View>
            <View style={s.calcInput}>
              <Text style={s.inputLabel}>REPS</Text>
              <TextInput
                style={s.input} keyboardType="number-pad"
                value={calcR} onChangeText={setCalcR}
                placeholder="5" placeholderTextColor="#333"
              />
            </View>
          </View>

          {/* Formula selector */}
          <TouchableOpacity style={s.formulaSelector} onPress={() => setShowFormulas(!showFormulas)}>
            <Text style={s.formulaSelectorLabel}>FÓRMULA</Text>
            <View style={s.formulaSelectorRight}>
              <Text style={s.formulaSelectorVal}>{FORMULAS.find(f => f.key === formula)?.label}</Text>
              <Ionicons name={showFormulas ? 'chevron-up' : 'chevron-down'} size={16} color="#555" />
            </View>
          </TouchableOpacity>

          {showFormulas && (
            <View style={s.formulaList}>
              {FORMULAS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[s.formulaOption, formula === f.key && s.formulaOptionActive]}
                  onPress={() => { setFormula(f.key); setShowFormulas(false); }}
                >
                  <View>
                    <Text style={[s.formulaName, formula === f.key && { color: '#E63946' }]}>{f.label}</Text>
                    <Text style={s.formulaDesc}>{f.desc}</Text>
                  </View>
                  {formula === f.key && <Ionicons name="checkmark-circle" size={18} color="#E63946" />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {calcResult !== null && (
            <View style={s.calcResult}>
              <Text style={s.calcResultLabel}>1RM ESTIMADO</Text>
              <Text style={s.calcResultVal}>{RM.format(calcResult)} kg</Text>
              <View style={s.calcBreakdown}>
                {(['epley', 'brzycki', 'wathen', 'mayhew'] as Formula[]).map(f => (
                  <View key={f} style={s.breakdownItem}>
                    <Text style={s.breakdownLabel}>{FORMULAS.find(x => x.key === f)?.label}</Text>
                    <Text style={[s.breakdownVal, formula === f && { color: '#E63946' }]}>
                      {RM.format(RM[f](totalW, rv))}
                    </Text>
                  </View>
                ))}
              </View>
              {/* Rep conversion table */}
              <View style={s.repTable}>
                <Text style={s.repTableTitle}>TABLA DE CONVERSIÓN</Text>
                <View style={s.repTableGrid}>
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15].map(r => {
                    const w1rm = calcResult;
                    const perc = w1rm > 0 ? Math.round((RM[formula](totalW, r) / w1rm) * 100) : 0;
                    return (
                      <View key={r} style={s.repCell}>
                        <Text style={s.repCellNum}>×{r}</Text>
                        <Text style={s.repCellVal}>{RM.format(RM[formula](totalW, r))} kg</Text>
                        <Text style={s.repCellPct}>{perc}%</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Records by Category ─────────────────────── */}
        {loading ? (
          <ActivityIndicator color="#E63946" size="large" style={{ marginVertical: 30 }} />
        ) : (
          cats.map(cat => {
            const catRecs = records.filter(r => r.exercise.category === cat && r.best1rm > 0);
            if (catRecs.length === 0) return null;
            const catColor = CAT_COLOR[cat] ?? '#888';
            return (
              <View key={cat} style={s.catSection}>
                <View style={[s.catHeader, { borderLeftColor: catColor }]}>
                  <Text style={[s.catLabel, { color: catColor }]}>{cat}</Text>
                </View>
                {catRecs.map(rec => {
                  const goalPct = rec.yearGoal && rec.best1rm ? Math.min(100, (rec.best1rm / rec.yearGoal) * 100) : null;
                  return (
                    <View key={rec.exercise.id} style={s.recCard}>
                      <View style={s.recTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.recName}>{rec.exercise.name}</Text>
                          {rec.bestDate ? (
                            <Text style={s.recDate}>PR el {fmtRecordDate(rec.bestDate)}</Text>
                          ) : null}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[s.recVal, { color: catColor }]}>
                            {RM.format(rec.best1rm)}
                            {rec.exercise.tracking_type === 'weight' ? ' kg' : rec.exercise.tracking_type === 'time' ? ' seg' : ' reps'}
                          </Text>
                          {rec.totalSets > 0 && <Text style={s.recSets}>{rec.totalSets} series</Text>}
                        </View>
                      </View>
                      {goalPct !== null && rec.yearGoal && (
                        <View style={s.recGoalRow}>
                          <ProgressBar pct={goalPct} color={catColor} />
                          <Text style={[s.recGoalPct, { color: goalPct >= 100 ? '#22C55E' : '#666' }]}>
                            {Math.round(goalPct)}% de {rec.yearGoal}kg
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })
        )}

        {/* SKILL records (time/reps) */}
        {!loading && records.filter(r => r.exercise.category === 'SKILL' && r.best1rm === 0 && (r.exercise.tracking_type === 'time' || r.exercise.tracking_type === 'reps')).length > 0 && (
          <View style={s.catSection}>
            <View style={[s.catHeader, { borderLeftColor: '#F59E0B' }]}>
              <Text style={[s.catLabel, { color: '#F59E0B' }]}>SKILL</Text>
            </View>
            {records.filter(r => r.exercise.category === 'SKILL').map(rec => (
              <View key={rec.exercise.id} style={s.recCard}>
                <View style={s.recTop}>
                  <Text style={{ flex: 1, ...s.recName }}>{rec.exercise.name}</Text>
                  <Text style={[s.recVal, { color: '#F59E0B' }]}>
                    {rec.best1rm > 0 ? `${RM.format(rec.best1rm)} ${rec.exercise.tracking_type === 'time' ? 'seg' : 'reps'}` : 'Sin datos'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#161616' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  scroll: { padding: 12, paddingBottom: 50, gap: 10 },

  calcCard: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#222', borderRadius: 14, padding: 14 },
  calcTitle: { fontSize: 12, fontWeight: '900', color: '#E63946', letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
  calcRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 10 },
  calcInput: { flex: 1 },
  calcPlus: { fontSize: 18, color: '#555', fontWeight: '900', marginBottom: 12 },
  inputLabel: { fontSize: 9, color: '#555', fontWeight: '800', letterSpacing: 0.8, marginBottom: 5 },
  input: { backgroundColor: '#0A0A0A', color: '#FFF', paddingHorizontal: 8, height: 44, borderRadius: 10, fontSize: 16, fontWeight: '800', borderWidth: 1, borderColor: '#1E1E1E', textAlign: 'center' },

  formulaSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0D0D0D', borderRadius: 10, borderWidth: 1, borderColor: '#1E1E1E', padding: 10 },
  formulaSelectorLabel: { fontSize: 9, color: '#555', fontWeight: '800', letterSpacing: 0.8 },
  formulaSelectorRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  formulaSelectorVal: { fontSize: 13, fontWeight: '800', color: '#E63946' },
  formulaList: { backgroundColor: '#0D0D0D', borderRadius: 10, borderWidth: 1, borderColor: '#1E1E1E', marginTop: 6, overflow: 'hidden' },
  formulaOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 11, borderBottomWidth: 1, borderBottomColor: '#141414' },
  formulaOptionActive: { backgroundColor: '#1E0810' },
  formulaName: { fontSize: 13, fontWeight: '800', color: '#CCC' },
  formulaDesc: { fontSize: 10, color: '#555', marginTop: 2 },

  calcResult: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1E1E1E' },
  calcResultLabel: { fontSize: 10, color: '#888', fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  calcResultVal: { fontSize: 32, fontWeight: '900', color: '#E63946', textAlign: 'center', marginVertical: 4 },
  calcBreakdown: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  breakdownItem: { alignItems: 'center' },
  breakdownLabel: { fontSize: 9, color: '#555', fontWeight: '700' },
  breakdownVal: { fontSize: 13, fontWeight: '800', color: '#888', marginTop: 2 },

  repTable: { backgroundColor: '#0D0D0D', borderRadius: 10, padding: 10 },
  repTableTitle: { fontSize: 9, color: '#555', fontWeight: '800', letterSpacing: 1, marginBottom: 8, textAlign: 'center' },
  repTableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  repCell: { width: '18%', backgroundColor: '#141414', borderRadius: 7, padding: 6, alignItems: 'center', borderWidth: 1, borderColor: '#1E1E1E' },
  repCellNum: { fontSize: 10, color: '#666', fontWeight: '800' },
  repCellVal: { fontSize: 11, color: '#DDD', fontWeight: '900', marginTop: 2 },
  repCellPct: { fontSize: 9, color: '#555', marginTop: 1 },

  catSection: { gap: 6 },
  catHeader: { borderLeftWidth: 3, paddingLeft: 10 },
  catLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  recCard: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#1E1E1E', borderRadius: 12, padding: 12 },
  recTop: { flexDirection: 'row', alignItems: 'center' },
  recName: { fontSize: 14, fontWeight: '800', color: '#EEE' },
  recDate: { fontSize: 10, color: '#555', marginTop: 2, fontWeight: '600' },
  recVal: { fontSize: 20, fontWeight: '900' },
  recSets: { fontSize: 10, color: '#555', fontWeight: '600', marginTop: 2 },
  recGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  recGoalPct: { fontSize: 10, fontWeight: '800', minWidth: 72, textAlign: 'right' },
});
