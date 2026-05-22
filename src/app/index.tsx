import React, { useState, useEffect, useRef, useCallback, createElement } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList, Alert, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { workoutService, RM, Exercise, WorkoutLog } from '../utils/workoutService';
import { C, CAT_COLOR } from '../constants/theme';
import PlateCalculator from '../components/PlateCalculator';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDisplayDate(d: string) {
  if (d === todayStr()) return 'Hoy';
  const yest = new Date(); yest.setDate(yest.getDate()-1);
  if (d === yest.toISOString().split('T')[0]) return 'Ayer';
  const p = d.split('-');
  return p.length === 3 ? `${parseInt(p[2])} ${MONTHS[parseInt(p[1])-1]}` : d;
}
function fmtShortDate(d: string) {
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : d;
}
function fmtTimer(s: number) {
  const m = Math.floor(s/60).toString().padStart(2,'0');
  return `${m}:${(s%60).toString().padStart(2,'0')}`;
}

function Stepper({
  label, value, onChange, step = 1, min = 0, decimals = 0, onPressCalc
}: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; decimals?: number; onPressCalc?: () => void;
}) {
  const fmt = (v: number) => decimals > 0 ? v.toFixed(decimals) : String(v);
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100));
  const inc = () => onChange(Math.round((value + step) * 100) / 100);
  return (
    <View style={st.row}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={st.label}>{label}</Text>
        {onPressCalc && (
          <TouchableOpacity onPress={onPressCalc} style={st.calcBtn}>
            <Ionicons name="calculator" size={14} color={C.primary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={st.controls}>
        <TouchableOpacity onPress={dec} style={st.btn} activeOpacity={0.5}>
          <Text style={st.btnTxt}>−</Text>
        </TouchableOpacity>
        <View style={st.valBox}>
          <TextInput
            style={st.val}
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
        <TouchableOpacity onPress={inc} style={st.btn} activeOpacity={0.5}>
          <Text style={st.btnTxt}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  label: { fontSize: 13, color: C.textSub, fontWeight: '500', letterSpacing: -0.1 },
  calcBtn: { backgroundColor: C.primaryDim, padding: 4, borderRadius: 6 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { width: 34, height: 34, backgroundColor: C.surfaceHigh, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: C.text, fontSize: 20, fontWeight: '400', lineHeight: 22, marginTop: -1 },
  valBox: { width: 70, height: 36, backgroundColor: C.bg, borderRadius: 10, justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  val: { color: C.text, fontSize: 16, fontWeight: '700', backgroundColor: 'transparent', textAlign: 'center' },
});

export default function LogScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [lastLog, setLastLog] = useState<WorkoutLog | null>(null);
  const [todaySets, setTodaySets] = useState<WorkoutLog[]>([]);
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [bestEver, setBestEver] = useState(0);
  const [prLog, setPrLog] = useState<WorkoutLog | null>(null);
  const [loadingEx, setLoadingEx] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logDate, setLogDate] = useState(todayStr);

  const [bodyW, setBodyW] = useState(86);
  const [addedW, setAddedW] = useState(0);
  const [repsVal, setRepsVal] = useState(5);
  const [durationVal, setDurationVal] = useState(10);
  const [notes, setNotes] = useState('');

  const [restSecs, setRestSecs] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [restTarget, setRestTarget] = useState(90);
  const restRef = useRef<NodeJS.Timeout | null>(null);

  const [calcOpen, setCalcOpen] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [filterCat, setFilterCat] = useState('TODOS');

  const isToday = logDate === todayStr();
  const live1rm = selected?.tracking_type === 'weight' && repsVal > 0 && (addedW > 0 || bodyW > 0)
    ? RM.average(bodyW + addedW, repsVal) : 0;
  const isLivePR = live1rm > bestEver && live1rm > 0;

  const changeDate = (days: number) => {
    const d = new Date(logDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const next = d.toISOString().split('T')[0];
    if (next <= todayStr()) setLogDate(next);
  };

  useEffect(() => {
    (async () => {
      setLoadingEx(true);
      const list = await workoutService.getExercises();
      setExercises(list);
      if (list.length > 0) setSelected(list[0]);
      const bw = await workoutService.getSavedBodyWeight();
      setBodyW(parseFloat(bw) || 86);
      setLoadingEx(false);
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    if (selected) loadExerciseData(selected.id, logDate);
  }, [selected?.id, logDate]));

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
    } else if (restRef.current) {
      clearInterval(restRef.current);
    }
    return () => { if (restRef.current) clearInterval(restRef.current); };
  }, [restActive, restTarget]);

  const loadExerciseData = async (exId: number, date?: string) => {
    const targetDate = date ?? logDate;
    setLoadingData(true);
    try {
      const [last, today, best, recent, pr] = await Promise.all([
        workoutService.getLastLog(exId),
        workoutService.getTodayLogs(exId, targetDate),
        workoutService.getBest1RM(exId),
        workoutService.getLogsForExercise(exId, 8),
        workoutService.getPRLog(exId),
      ]);
      setLastLog(last?.date !== targetDate ? last : null);
      setTodaySets(today);
      setBestEver(best.best1rm || best.bestDuration || best.bestReps);
      setPrLog(pr);
      const pastLogs = (recent || []).filter((l: WorkoutLog) => l.date !== targetDate);
      setRecentLogs(pastLogs.slice(0, 5));
    } finally { setLoadingData(false); }
  };

  const selectExercise = (ex: Exercise) => {
    setSelected(ex);
    setPickerOpen(false);
    setAddedW(0); setRepsVal(5); setDurationVal(10); setNotes('');
    setPrLog(null);
    loadExerciseData(ex.id, logDate);
  };

  const handleSave = async () => {
    if (!selected) return;
    if (selected.tracking_type === 'weight' && repsVal <= 0) {
      Alert.alert('Faltan repeticiones', 'Ingresá al menos 1 rep.'); return;
    }
    if (selected.tracking_type === 'time' && durationVal <= 0) {
      Alert.alert('Faltan segundos', 'Ingresá la duración.'); return;
    }
    setSaving(true);
    await workoutService.saveBodyWeight(String(bodyW));
    const result = await workoutService.saveLog({
      date: logDate,
      exercise_id: selected.id,
      added_weight: addedW,
      body_weight: bodyW,
      reps: repsVal,
      duration_sec: selected.tracking_type === 'time' ? durationVal : 0,
      estimated_1rm: live1rm,
      rir: 0, notes: notes,
      set_number: todaySets.length + 1,
    });
    setSaving(false);
    if (result.error) { Alert.alert('Error', result.error); return; }
    const newSet = result.data!;
    setTodaySets(prev => [...prev, newSet]);
    setBestEver(prev => Math.max(prev, live1rm || durationVal || repsVal));
    setAddedW(0); setRepsVal(5); setNotes('');
    setRestSecs(0); setRestActive(true);
    
    if (newSet.is_pr) {
      Vibration.vibrate([0, 100, 50, 100]);
      Alert.alert('NUEVO RÉCORD', `1RM estimado: ${RM.format(live1rm)} kg`);
    } else {
      Vibration.vibrate(50);
    }
  };

  const deleteSet = (id: string) => {
    const doDelete = async () => {
      await workoutService.deleteLog(id);
      setTodaySets(prev => prev.filter(s => s.id !== id));
      if (selected) loadExerciseData(selected.id, logDate);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('¿Borrar esta serie?')) doDelete();
      return;
    }
    Alert.alert('Borrar', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: doDelete },
    ]);
  };

  const copyLast = (overload = false) => {
    if (!lastLog || !selected) return;
    if (selected.tracking_type === 'weight') {
      setAddedW((lastLog.added_weight || 0) + (overload ? 1.25 : 0));
      setRepsVal(lastLog.reps || 5);
    } else if (selected.tracking_type === 'time') {
      setDurationVal((lastLog.duration_sec || 10) + (overload ? 5 : 0));
    } else {
      setRepsVal((lastLog.reps || 5) + (overload ? 1 : 0));
    }
    Vibration.vibrate(30);
  };

  const cats = ['TODOS', 'EMPUJE', 'TRACCION', 'PIERNA', 'SKILL'];
  const filteredExercises = exercises
    .filter(ex => {
      const matchCat = filterCat === 'TODOS' || ex.category === filterCat;
      return matchCat && ex.name.toLowerCase().includes(searchQ.toLowerCase());
    })
    .sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0));

  if (loadingEx) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  const catColor = CAT_COLOR[selected?.category ?? ''] ?? C.muted;
  const totalVol = todaySets.reduce((sum, l) => sum + (l.body_weight + l.added_weight) * l.reps, 0);

  return (
    <SafeAreaView style={s.container} edges={['top','left','right']}>
      <View style={s.header}>
        <Text style={s.logo}>ALGO<Text style={{ color: C.primary }}>R</Text>LIFT</Text>
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
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.dateBar}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={s.dateArrow}>
              <Ionicons name="chevron-back" size={18} color={C.muted} />
            </TouchableOpacity>
            <View style={[s.dateCenter, { position: 'relative' }]}>
              <Text style={s.dateText}>{fmtDisplayDate(logDate)}</Text>
              {isToday && <View style={s.todayDot} />}
              {Platform.OS === 'web' && createElement('input', {
                type: 'date',
                style: { opacity: 0, position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, cursor: 'pointer' },
                value: logDate,
                onChange: (e: any) => e.target.value && setLogDate(e.target.value)
              })}
            </View>
            <TouchableOpacity onPress={() => changeDate(1)} style={[s.dateArrow, isToday && { opacity: 0.2 }]} disabled={isToday}>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </TouchableOpacity>
            {!isToday && (
              <TouchableOpacity onPress={() => setLogDate(todayStr())} style={s.todayBtn}>
                <Text style={s.todayBtnTxt}>HOY</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={s.exCard} onPress={() => setPickerOpen(true)} activeOpacity={0.85}>
            <View style={[s.exBar, { backgroundColor: catColor }]} />
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={s.exLabel}>EJERCICIO</Text>
              <Text style={s.exName} numberOfLines={1}>{selected?.name ?? 'Seleccionar...'}</Text>
              {selected && <Text style={[s.exCat, { color: catColor }]}>{selected.category}</Text>}
            </View>
            <View style={s.exChangeBtn}>
              <Ionicons name="swap-vertical" size={14} color={C.primary} />
              <Text style={s.exChangeTxt}>CAMBIAR</Text>
            </View>
          </TouchableOpacity>

          <View style={s.formCard}>
            <View style={s.formTop}>
              <Text style={s.serieLabel}>SERIE {todaySets.length + 1}</Text>
              {selected?.tracking_type === 'weight' && (
                <View style={s.rmRow}>
                  {isLivePR && live1rm > 0 && (
                    <View style={s.prChip}><Text style={s.prChipTxt}>PR</Text></View>
                  )}
                  <Text style={[s.rmVal, isLivePR && { color: C.primary }]}>
                    {live1rm > 0 ? `${RM.format(live1rm)} kg` : '—'}
                  </Text>
                  <Text style={s.rmSub}>1RM</Text>
                </View>
              )}
            </View>

            {selected?.tracking_type === 'weight' && (
              <>
                <Stepper label="Peso corporal" value={bodyW} onChange={setBodyW} step={0.5} min={0} decimals={1} />
                <Stepper label="Lastre (kg)" value={addedW} onChange={setAddedW} step={0.5} min={0} decimals={1} onPressCalc={() => setCalcOpen(true)} />
                <Stepper label="Repeticiones" value={repsVal} onChange={setRepsVal} step={1} min={1} />
              </>
            )}
            {selected?.tracking_type === 'time' && (
              <Stepper label="Segundos" value={durationVal} onChange={setDurationVal} step={5} min={1} />
            )}
            {selected?.tracking_type === 'reps' && (
              <Stepper label="Repeticiones" value={repsVal} onChange={setRepsVal} step={1} min={1} />
            )}
            
            <TextInput
              style={s.notesInput}
              placeholder="Notas de la serie (ej. RIR 2, técnica ok)..."
              placeholderTextColor={C.muted}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[C.primary, '#D91646']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveBtnTxt}>+ ANOTAR SERIE</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {todaySets.length > 0 && (
            <View style={s.infoCard}>
              <View style={s.infoHeader}>
                <Text style={s.infoTitle}>HOY</Text>
                {totalVol > 0 && <Text style={s.infoSub}>Vol {totalVol.toFixed(0)} kg</Text>}
              </View>
              {todaySets.map((set, i) => {
                const val = selected?.tracking_type === 'weight'
                  ? `+${set.added_weight} kg × ${set.reps}`
                  : selected?.tracking_type === 'time' ? `${set.duration_sec}s`
                  : `${set.reps} reps`;
                return (
                  <View key={set.id ?? i} style={[s.logRow, set.is_pr && s.logRowPR]}>
                    <Text style={s.logIdx}>S{i+1}</Text>
                    <Text style={[s.logVal, { flex: 1 }]}>{val}</Text>
                    {set.estimated_1rm > 0 && (
                      <Text style={s.log1rm}>{Number(set.estimated_1rm).toFixed(1)} kg</Text>
                    )}
                    {set.is_pr && <Text style={s.prText}>PR</Text>}
                    <TouchableOpacity onPress={() => set.id && deleteSet(set.id)} style={{ padding: 6 }}>
                      <Ionicons name="trash-outline" size={14} color={C.muted} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {selected && (recentLogs.length > 0 || lastLog) && (
            <View style={s.infoCard}>
              <View style={s.infoHeader}>
                <Text style={s.infoTitle}>MEJOR Y ÚLTIMAS SESIONES</Text>
                {bestEver > 0 && (
                  <Text style={s.infoSub}>
                    PR {selected.tracking_type === 'weight'
                      ? `${RM.format(bestEver)} kg`
                      : selected.tracking_type === 'time' ? `${bestEver}s`
                      : `${bestEver} reps`}
                  </Text>
                )}
              </View>
              {prLog && (
                <View style={[s.logRow, s.logRowPR]}>
                  <View style={s.prChip}><Text style={s.prChipTxt}>PR</Text></View>
                  <Text style={s.logDate}>{fmtShortDate(prLog.date)}</Text>
                  <Text style={[s.logVal, { flex: 1, color: C.primary }]}>
                    {selected.tracking_type === 'weight'
                      ? `+${prLog.added_weight} kg × ${prLog.reps} reps`
                      : selected.tracking_type === 'time' ? `${prLog.duration_sec}s`
                      : `${prLog.reps} reps`}
                  </Text>
                  {selected.tracking_type === 'weight' && prLog.estimated_1rm > 0 && (
                    <Text style={[s.log1rm, { color: C.primary }]}>{Number(prLog.estimated_1rm).toFixed(1)} kg</Text>
                  )}
                </View>
              )}
              {recentLogs
                .slice(0, 10)
                .map((log, i) => {
                  const val = selected.tracking_type === 'weight'
                    ? `+${log.added_weight} kg × ${log.reps} reps`
                    : selected.tracking_type === 'time' ? `${log.duration_sec}s`
                    : `${log.reps} reps`;
                  return (
                    <View key={log.id ?? i} style={s.logRow}>
                      <Text style={s.logDate}>{fmtShortDate(log.date)}</Text>
                      <Text style={[s.logVal, { flex: 1, color: C.text }]}>{val}</Text>
                      {selected.tracking_type === 'weight' && log.estimated_1rm > 0 && (
                        <Text style={s.log1rm}>{Number(log.estimated_1rm).toFixed(1)} kg</Text>
                      )}
                    </View>
                  );
                })}
              {lastLog && (
                <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 10 }}>
                  <TouchableOpacity style={s.copyRow} onPress={() => copyLast(false)}>
                    <Ionicons name="copy-outline" size={12} color={C.muted} />
                    <Text style={s.copyTxt}>Copiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.copyRow, { borderColor: C.primary, backgroundColor: C.primaryDim }]} onPress={() => copyLast(true)}>
                    <Ionicons name="rocket-outline" size={12} color={C.primary} />
                    <Text style={[s.copyTxt, { color: C.primary, fontWeight: '800' }]}>Sobrecarga (+)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {loadingData && <ActivityIndicator color={C.primary} style={{ marginVertical: 12 }} />}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View style={s.overlay}>
          <SafeAreaView style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeaderRow}>
              <Text style={s.sheetTitle}>Elegir ejercicio</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)} style={s.closeBtn}>
                <Ionicons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={s.searchBar}>
              <Ionicons name="search" size={14} color={C.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Buscar ejercicio..."
                placeholderTextColor={C.muted}
                value={searchQ}
                onChangeText={setSearchQ}
              />
              {searchQ.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQ('')}>
                  <Ionicons name="close-circle" size={14} color={C.muted} />
                </TouchableOpacity>
              )}
            </View>
            <View style={{ marginBottom: 12 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}>
              {cats.map(c => (
                <TouchableOpacity key={c}
                  style={[s.catChip, filterCat === c && s.catChipActive]}
                  onPress={() => setFilterCat(c)}>
                  <Text style={[s.catChipTxt, filterCat === c && { color: C.primary }]}>{c}</Text>
                </TouchableOpacity>
              ))}
              </ScrollView>
            </View>
            <FlatList
              data={filteredExercises}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 40, gap: 6 }}
              renderItem={({ item }) => {
                const isSel = selected?.id === item.id;
                const cc = CAT_COLOR[item.category] ?? C.muted;
                return (
                  <TouchableOpacity
                    style={[s.pickerItem, isSel && { borderColor: cc, backgroundColor: cc + '12' }]}
                    onPress={() => selectExercise(item)}
                    activeOpacity={0.8}>
                    <View style={[s.pickerDot, { backgroundColor: cc }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.pickerName, isSel && { color: cc }]}>{item.name}</Text>
                      <Text style={s.pickerSub}>
                        {item.category} · {item.tracking_type === 'weight' ? 'Peso+Reps' : item.tracking_type === 'time' ? 'Tiempo' : 'Reps'}
                      </Text>
                    </View>
                    {item.is_favorite && <Ionicons name="star" size={12} color="#F59E0B" />}
                    {isSel && <Ionicons name="checkmark" size={16} color={cc} />}
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  logo: { fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  restBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.borderLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  restTxt: { color: C.traccion, fontSize: 11, fontWeight: '800' },
  restTargetBtn: { backgroundColor: C.surfaceHigh, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  restTargetTxt: { fontSize: 10, color: C.mutedLight, fontWeight: '800' },
  scroll: { padding: 12, paddingBottom: 100, gap: 10 },

  dateBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 6, borderWidth: 1, borderColor: C.border },
  dateArrow: { padding: 8 },
  dateCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dateText: { fontSize: 13, fontWeight: '800', color: C.text, letterSpacing: 0.2 },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
  todayBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.primaryDim, borderRadius: 8, marginRight: 4 },
  todayBtnTxt: { fontSize: 9, color: C.primary, fontWeight: '900', letterSpacing: 1 },

  exCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden', minHeight: 64 },
  exBar: { width: 4, alignSelf: 'stretch' },
  exLabel: { fontSize: 8, color: C.muted, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  exName: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  exCat: { fontSize: 10, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  exChangeBtn: { alignItems: 'center', backgroundColor: C.surfaceHigh, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 2, marginRight: 10 },
  exChangeTxt: { color: C.textSub, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },

  formCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  formTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  serieLabel: { fontSize: 11, fontWeight: '900', color: C.textSub, letterSpacing: 2 },
  rmRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rmVal: { fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  rmSub: { fontSize: 10, color: C.muted, fontWeight: '700', marginTop: 2 },
  prChip: { backgroundColor: C.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, marginRight: 8 },
  prChipTxt: { fontSize: 9, color: '#fff', fontWeight: '900', letterSpacing: 1 },
  saveBtn: { height: 42, alignItems: 'center', justifyContent: 'center' },
  saveBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  notesInput: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, color: C.text, fontSize: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 14, marginTop: 8, marginBottom: 12 },

  infoCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden' },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  infoTitle: { fontSize: 10, fontWeight: '800', color: C.textSub, letterSpacing: 1 },
  infoSub: { fontSize: 11, color: C.primary, fontWeight: '800' },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  logRowPR: { backgroundColor: C.primaryDim },
  logIdx: { fontSize: 10, color: C.mutedLight, fontWeight: '800', width: 22 },
  logDate: { fontSize: 11, color: C.mutedLight, fontWeight: '700', width: 40 },
  logVal: { fontSize: 14, fontWeight: '800', color: C.text },
  log1rm: { fontSize: 10, color: C.muted },
  prText: { fontSize: 9, color: C.primary, fontWeight: '900', letterSpacing: 0.5 },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  copyTxt: { fontSize: 11, color: C.mutedLight, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, height: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: C.border },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, margin: 12, paddingHorizontal: 12, height: 40, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontSize: 14 },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border },
  catChipActive: { borderColor: C.primary, backgroundColor: C.primaryDim },
  catChipTxt: { color: C.textSub, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  pickerDot: { width: 8, height: 8, borderRadius: 4 },
  pickerName: { fontSize: 14, fontWeight: '800', color: C.text },
  pickerSub: { fontSize: 10, color: C.muted, marginTop: 4, fontWeight: '600' },
});
