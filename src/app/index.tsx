import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList,
  Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { workoutService, RM, Exercise, WorkoutLog } from '../utils/workoutService';

const W = Dimensions.get('window').width;

const CAT_COLOR: Record<string, string> = {
  EMPUJE: '#E63946', TRACCION: '#3B82F6', PIERNA: '#10B981', SKILL: '#F59E0B',
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function fmtDate(d: string) {
  const parts = d.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
}

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function fmtDisplayDate(d: string) {
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  return `${parseInt(parts[2])} ${MONTHS[parseInt(parts[1]) - 1]} ${parts[0]}`;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function LogScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [lastLog, setLastLog] = useState<WorkoutLog | null>(null);
  const [todaySets, setTodaySets] = useState<WorkoutLog[]>([]);
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [bestEver, setBestEver] = useState(0);
  const [loadingEx, setLoadingEx] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  const [bodyW, setBodyW] = useState('86');
  const [addedW, setAddedW] = useState('');
  const [repsVal, setRepsVal] = useState('');
  const [durationVal, setDurationVal] = useState('');

  // Date
  const [logDate, setLogDate] = useState(todayStr);
  const isToday = logDate === todayStr();

  const [restSecs, setRestSecs] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [chronoSecs, setChronoSecs] = useState(0);
  const [chronoRunning, setChronoRunning] = useState(false);
  const restRef = useRef<any>(null);
  const chronoRef = useRef<any>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [filterCat, setFilterCat] = useState('TODOS');
  const [isOffline, setIsOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  const bw = parseFloat(bodyW || '0');
  const aw = parseFloat(addedW || '0');
  const rv = parseInt(repsVal || '0');
  const live1rm = selected?.tracking_type === 'weight' && rv > 0 && aw > 0
    ? RM.average(aw, rv) : 0;
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
      setBodyW(bw);
      setLoadingEx(false);
      const count = await workoutService.getOfflineCount();
      setOfflineCount(count);
    })();

    const unsub = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
      if (state.isConnected) handleSync();
    });
    return () => unsub();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (selected) loadExerciseData(selected.id, logDate);
    }, [selected?.id, logDate])
  );

  useEffect(() => {
    if (restActive) {
      restRef.current = setInterval(() => setRestSecs(s => s + 1), 1000);
    } else {
      clearInterval(restRef.current);
    }
    return () => clearInterval(restRef.current);
  }, [restActive]);

  useEffect(() => {
    if (chronoRunning) {
      chronoRef.current = setInterval(() => {
        setChronoSecs(s => {
          const next = s + 1;
          setDurationVal(String(next));
          return next;
        });
      }, 1000);
    } else {
      clearInterval(chronoRef.current);
    }
    return () => clearInterval(chronoRef.current);
  }, [chronoRunning]);

  const loadExerciseData = async (exId: number, date?: string) => {
    const targetDate = date ?? logDate;
    setLoadingData(true);
    try {
      const [last, today, recent, best] = await Promise.all([
        workoutService.getLastLog(exId),
        workoutService.getTodayLogs(exId, targetDate),
        workoutService.getLogsForExercise(exId, 10),
        workoutService.getBest1RM(exId),
      ]);
      setLastLog(last);
      setTodaySets(today);
      setRecentLogs(recent.filter(l => l.date !== targetDate));
      setBestEver(best.best1rm || best.bestDuration || best.bestReps);
    } finally {
      setLoadingData(false);
    }
  };

  const selectExercise = (ex: Exercise) => {
    setSelected(ex);
    setPickerOpen(false);
    setAddedW(''); setRepsVal('');
    setDurationVal(''); setChronoRunning(false); setChronoSecs(0);
    loadExerciseData(ex.id, logDate);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const n = await workoutService.syncOfflineLogs();
      if (n > 0) {
        Alert.alert('Sincronizado', `${n} series subidas a la nube.`);
        setOfflineCount(0);
        if (selected) loadExerciseData(selected.id, logDate);
      }
    } finally {
      setSyncing(false);
      const count = await workoutService.getOfflineCount();
      setOfflineCount(count);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    if (selected.tracking_type === 'weight') {
      if (rv <= 0 || aw <= 0) {
        Alert.alert('Faltan datos', 'Ingresá peso externo y repeticiones.');
        return;
      }
    }
    if (selected.tracking_type === 'time' && parseInt(durationVal || '0') <= 0) {
      Alert.alert('Faltan datos', 'Ingresá la duración en segundos.');
      return;
    }

    setSaving(true);
    await workoutService.saveBodyWeight(bodyW);

    const log = {
      date: logDate,
      exercise_id: selected.id,
      added_weight: aw,
      body_weight: bw,
      reps: rv,
      duration_sec: parseInt(durationVal || '0'),
      estimated_1rm: live1rm,
      rir: 0,
      notes: '',
      set_number: todaySets.length + 1,
    };

    const result = await workoutService.saveLog(log);
    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }

    const newSet = result.data!;
    const wasPR = newSet.is_pr;

    setTodaySets(prev => [...prev, newSet]);
    setBestEver(prev => Math.max(prev, live1rm || parseInt(durationVal || '0') || rv));

    setAddedW(''); setRepsVal('');
    setDurationVal(''); setChronoRunning(false); setChronoSecs(0);
    setRestSecs(0);
    setRestActive(true);

    if (wasPR) Alert.alert('NUEVO RÉCORD', `1RM estimado: ${RM.format(live1rm)} kg`);
  };

  const deleteSet = (id: string) => {
    const doDelete = async () => {
      await workoutService.deleteLog(id);
      setTodaySets(prev => prev.filter(s => s.id !== id));
      if (selected) loadExerciseData(selected.id, logDate);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Seguro que querés borrar este registro?')) {
        doDelete();
      }
      return;
    }

    Alert.alert('Borrar serie', '¿Seguro que querés borrar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar', style: 'destructive',
        onPress: doDelete,
      },
    ]);
  };

  const filteredExercises = exercises
    .filter(ex => {
      const matchCat = filterCat === 'TODOS' || ex.category === filterCat;
      const matchSearch = ex.name.toLowerCase().includes(searchQ.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0));

  const cats = ['TODOS', 'EMPUJE', 'TRACCION', 'PIERNA', 'SKILL'];

  if (loadingEx) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.logoSmall}>ALGOR<Text style={{ color: '#E63946' }}>LIFT</Text></Text>
        </View>
        <View style={s.headerRight}>
          {syncing && <ActivityIndicator size="small" color="#E63946" style={{ marginRight: 8 }} />}
          {offlineCount > 0 && !syncing && (
            <TouchableOpacity style={s.syncBadge} onPress={handleSync}>
              <MaterialCommunityIcons name="cloud-sync" size={13} color="#F59E0B" />
              <Text style={s.syncBadgeText}>{offlineCount}</Text>
            </TouchableOpacity>
          )}
          {isOffline && (
            <View style={[s.syncBadge, { borderColor: '#333', backgroundColor: '#111' }]}>
              <MaterialCommunityIcons name="cloud-off-outline" size={13} color="#555" />
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Date picker bar */}
          <View style={s.dateBar}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={s.dateArrow}>
              <Ionicons name="chevron-back" size={18} color="#555" />
            </TouchableOpacity>
            <View style={s.dateCenter}>
              <Text style={[s.dateText, !isToday && { color: '#AAA' }]}>{fmtDisplayDate(logDate)}</Text>
              {isToday && <View style={s.dateTodayDot} />}
            </View>
            <TouchableOpacity
              onPress={() => changeDate(1)}
              style={[s.dateArrow, isToday && { opacity: 0.2 }]}
              disabled={isToday}
            >
              <Ionicons name="chevron-forward" size={18} color="#555" />
            </TouchableOpacity>
            {!isToday && (
              <TouchableOpacity onPress={() => setLogDate(todayStr())} style={s.dateHoyBtn}>
                <Text style={s.dateHoyTxt}>HOY</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Exercise Selector */}
          <TouchableOpacity style={s.exCard} onPress={() => setPickerOpen(true)} activeOpacity={0.85}>
            <View style={[s.exCatDot, { backgroundColor: CAT_COLOR[selected?.category ?? ''] ?? '#333' }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.exCardLabel}>EJERCICIO</Text>
              <Text style={s.exCardName}>{selected?.name ?? 'Seleccionar...'}</Text>
            </View>
            <View style={s.exChangeBtn}>
              <Ionicons name="swap-vertical" size={15} color="#E63946" />
              <Text style={s.exChangeTxt}>CAMBIAR</Text>
            </View>
          </TouchableOpacity>

          {/* Last Session Reference */}
          {lastLog && selected?.tracking_type === 'weight' && (
            <View style={s.lastSessionCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.lastSessionLabel}>ÚLTIMA SESIÓN · {fmtDate(lastLog.date)}</Text>
                <Text style={s.lastSessionData}>
                  <Text style={s.lastSessionKg}>+{lastLog.added_weight} kg</Text>
                  {'  ×  '}
                  <Text style={s.lastSessionKg}>{lastLog.reps} reps</Text>
                  <Text style={s.lastSession1rm}>   →  1RM {Number(lastLog.estimated_1rm).toFixed(1)} kg</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={s.copyBtn}
                onPress={() => {
                  setAddedW(String(lastLog.added_weight));
                  setRepsVal(String(lastLog.reps));
                }}
              >
                <Ionicons name="copy-outline" size={13} color="#666" />
                <Text style={s.copyBtnTxt}>COPIAR</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <View style={s.formCard}>
            <Text style={s.formSerieLabel}>SERIE {todaySets.length + 1}</Text>

            {selected?.tracking_type === 'weight' && (
              <View style={s.rmSection}>
                <Text style={s.rmSectionLabel}>1RM ESTIMADO</Text>
                <Text style={[s.rmSectionVal, isLivePR && { color: '#22C55E' }]}>
                  {live1rm > 0 ? RM.format(live1rm) : '—'}
                  {live1rm > 0 && <Text style={s.rmSectionUnit}> kg</Text>}
                </Text>
                {isLivePR && live1rm > 0 && (
                  <View style={s.rmPRBadge}>
                    <Text style={s.rmPRBadgeTxt}>NUEVO RÉCORD</Text>
                  </View>
                )}
                {!isLivePR && live1rm > 0 && (
                  <Text style={s.rmFormulas}>
                    E:{RM.format(RM.epley(aw, rv))}  ·  B:{RM.format(RM.brzycki(aw, rv))}  ·  W:{RM.format(RM.wathen(aw, rv))}
                  </Text>
                )}
              </View>
            )}

            <View style={s.formDivider} />

            {selected?.tracking_type === 'weight' && (
              <>
                <Text style={s.inputLabel}>PESO CORPORAL (kg)</Text>
                <TextInput
                  style={[s.input, s.inputSm, s.inputFull]}
                  keyboardType="decimal-pad"
                  value={bodyW} onChangeText={setBodyW}
                  placeholder="86" placeholderTextColor="#2A2A2A"
                />
                <Text style={[s.inputLabel, { marginTop: 10 }]}>KG EXTERNOS</Text>
                <TextInput
                  style={[s.input, s.inputFull]}
                  keyboardType="decimal-pad"
                  value={addedW} onChangeText={setAddedW}
                  placeholder="30" placeholderTextColor="#2A2A2A"
                />
                <Text style={[s.inputLabel, { marginTop: 10 }]}>REPETICIONES</Text>
                <TextInput
                  style={[s.input, s.inputLg, s.inputFull]}
                  keyboardType="number-pad"
                  value={repsVal} onChangeText={setRepsVal}
                  placeholder="5" placeholderTextColor="#2A2A2A"
                />
              </>
            )}

            {selected?.tracking_type === 'time' && (
              <>
                <Text style={s.inputLabel}>DURACIÓN (segundos)</Text>
                <View style={s.chronoRow}>
                  <Text style={s.chronoDisplay}>{fmtTime(chronoSecs)}</Text>
                  <TouchableOpacity
                    style={[s.chronoBtn, chronoRunning && s.chronoBtnActive]}
                    onPress={() => {
                      if (chronoRunning) {
                        setChronoRunning(false);
                      } else {
                        setChronoSecs(0); setDurationVal('0');
                        setChronoRunning(true);
                      }
                    }}
                  >
                    <Ionicons name={chronoRunning ? 'stop' : 'play'} size={18} color="#FFF" />
                    <Text style={s.chronoBtnTxt}>{chronoRunning ? 'STOP' : 'INICIAR'}</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[s.input, { marginTop: 6 }]} keyboardType="number-pad"
                  value={durationVal} onChangeText={setDurationVal}
                  placeholder="O ingresá segundos manual" placeholderTextColor="#2A2A2A"
                />
              </>
            )}

            {selected?.tracking_type === 'reps' && (
              <View style={s.inputWrap}>
                <Text style={s.inputLabel}>REPETICIONES</Text>
                <TextInput
                  style={[s.input, s.inputLg]}
                  keyboardType="number-pad"
                  value={repsVal} onChangeText={setRepsVal}
                  placeholder="10" placeholderTextColor="#2A2A2A"
                />
              </View>
            )}

            <TouchableOpacity style={[s.btnSave, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#FFF" />
                : <>
                    <MaterialCommunityIcons name="arm-flex" size={18} color="#FFF" />
                    <Text style={s.btnSaveTxt}>ANOTAR SERIE</Text>
                  </>
              }
            </TouchableOpacity>
          </View>

          {/* Rest Timer */}
          {restActive && (
            <View style={s.restBar}>
              <Ionicons name="timer-outline" size={13} color="#4B7BCC" />
              <Text style={s.restBarTime}>{fmtTime(restSecs)}</Text>
              <Text style={s.restBarLabel}>DESCANSO</Text>
              <TouchableOpacity onPress={() => { setRestActive(false); setRestSecs(0); }} style={s.restBarClose}>
                <Ionicons name="close" size={15} color="#444" />
              </TouchableOpacity>
            </View>
          )}

          {/* Today's Sets */}
          {todaySets.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {isToday ? 'SERIES DE HOY' : `SERIES — ${fmtDisplayDate(logDate)}`}
              </Text>
              {todaySets.map((set, i) => (
                <View key={set.id ?? i} style={[s.setRow, set.is_pr && s.setRowPR]}>
                  <Text style={s.setNum}>S{i + 1}</Text>
                  <View style={s.setInfo}>
                    {selected?.tracking_type === 'weight' ? (
                      <>
                        <Text style={s.setKgReps}>+{set.added_weight} kg  ×  {set.reps} reps</Text>
                        <Text style={s.set1rm}>{Number(set.estimated_1rm).toFixed(1)} kg 1RM</Text>
                      </>
                    ) : selected?.tracking_type === 'time' ? (
                      <Text style={s.setKgReps}>{set.duration_sec}s hold</Text>
                    ) : (
                      <Text style={s.setKgReps}>{set.reps} reps</Text>
                    )}
                  </View>
                  {set.is_pr && <Text style={s.prTag}>PR</Text>}
                  <TouchableOpacity onPress={() => set.id && deleteSet(set.id)} style={s.delBtn}>
                    <Ionicons name="trash-outline" size={16} color="#555" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Recent History */}
          {!loadingData && recentLogs.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>HISTORIAL RECIENTE</Text>
              {recentLogs.map((log, i) => (
                <View key={log.id ?? i} style={s.histRow}>
                  <Text style={s.histDate}>{fmtDate(log.date)}</Text>
                  <View style={s.setInfo}>
                    {selected?.tracking_type === 'weight' ? (
                      <>
                        <Text style={s.histKgReps}>+{log.added_weight} kg  ×  {log.reps} reps</Text>
                        <Text style={s.hist1rm}>{Number(log.estimated_1rm).toFixed(1)} kg 1RM</Text>
                      </>
                    ) : selected?.tracking_type === 'time' ? (
                      <Text style={s.histKgReps}>{log.duration_sec}s</Text>
                    ) : (
                      <Text style={s.histKgReps}>{log.reps}r</Text>
                    )}
                  </View>
                  {log.is_pr && <Text style={[s.prTag, { fontSize: 9 }]}>PR</Text>}
                  <TouchableOpacity onPress={() => log.id && deleteSet(log.id)} style={s.delBtn}>
                    <Ionicons name="trash-outline" size={14} color="#444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {loadingData && <ActivityIndicator color="#E63946" style={{ marginVertical: 16 }} />}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Exercise Picker Modal */}
      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <SafeAreaView style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>ELEGIR EJERCICIO</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={s.searchBar}>
              <Ionicons name="search" size={15} color="#555" style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput} placeholder="Buscar..." placeholderTextColor="#444"
                value={searchQ} onChangeText={setSearchQ}
              />
              {searchQ.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQ('')}>
                  <Ionicons name="close-circle" size={15} color="#555" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={{ gap: 6, paddingHorizontal: 14 }}>
              {cats.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.catChip, filterCat === c && { backgroundColor: c === 'TODOS' ? '#2A2A2A' : (CAT_COLOR[c] ?? '#2A2A2A'), borderColor: 'transparent' }]}
                  onPress={() => setFilterCat(c)}
                >
                  <Text style={[s.catChipTxt, filterCat === c && { color: '#FFF' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <FlatList
              data={filteredExercises}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 40, gap: 4 }}
              renderItem={({ item }) => {
                const isSel = selected?.id === item.id;
                const catCol = CAT_COLOR[item.category] ?? '#888';
                return (
                  <TouchableOpacity
                    style={[s.exItem, isSel && { borderColor: catCol, backgroundColor: catCol + '12' }]}
                    onPress={() => selectExercise(item)}
                  >
                    <View style={[s.exItemDot, { backgroundColor: catCol }]} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text style={[s.exItemName, isSel && { color: catCol }]}>{item.name}</Text>
                        {item.is_favorite && <Ionicons name="star" size={10} color="#F59E0B" />}
                      </View>
                      <Text style={s.exItemSub}>{item.category} · {item.tracking_type}</Text>
                    </View>
                    {isSel && <Ionicons name="checkmark-circle" size={18} color={catCol} />}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#141414' },
  logoSmall: { fontSize: 15, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  logoSub: { fontSize: 9, fontWeight: '900', color: '#2A2A2A', letterSpacing: 4, marginTop: -2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#1A1500' },
  syncBadgeText: { color: '#F59E0B', fontSize: 10, fontWeight: '800' },
  scroll: { padding: 10, paddingBottom: 50, gap: 8 },

  // Date bar
  dateBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 4 },
  dateArrow: { padding: 8 },
  dateCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  dateText: { fontSize: 13, fontWeight: '700', color: '#555' },
  dateTodayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E63946' },
  dateHoyBtn: { paddingHorizontal: 9, paddingVertical: 5, backgroundColor: '#1A0808', borderRadius: 7, borderWidth: 1, borderColor: '#E6394630', marginRight: 4 },
  dateHoyTxt: { fontSize: 9, color: '#E63946', fontWeight: '800', letterSpacing: 1 },

  // Exercise card
  exCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 12, padding: 12, gap: 10 },
  exCatDot: { width: 3, height: 32, borderRadius: 2 },
  exCardLabel: { fontSize: 9, color: '#3A3A3A', fontWeight: '700', letterSpacing: 1.5 },
  exCardName: { fontSize: 18, fontWeight: '900', color: '#FFF', marginTop: 1 },
  exChangeBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#180808', borderWidth: 1, borderColor: '#E6394640', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  exChangeTxt: { color: '#E63946', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // Last session
  lastSessionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#181818', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  lastSessionLabel: { fontSize: 9, color: '#3A3A3A', fontWeight: '700', letterSpacing: 1.2, marginBottom: 3 },
  lastSessionData: { fontSize: 13, color: '#666', fontWeight: '600' },
  lastSessionKg: { color: '#CCC', fontWeight: '800' },
  lastSession1rm: { color: '#555', fontWeight: '600', fontSize: 12 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#161616', borderWidth: 1, borderColor: '#222', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  copyBtnTxt: { color: '#666', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // Form card
  formCard: { backgroundColor: '#111', borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 14, padding: 16 },
  formSerieLabel: { fontSize: 9, fontWeight: '700', color: '#3A3A3A', letterSpacing: 2, textAlign: 'center', marginBottom: 12 },
  rmSection: { alignItems: 'center', paddingBottom: 4 },
  rmSectionLabel: { fontSize: 9, color: '#3A3A3A', fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  rmSectionVal: { fontSize: 42, fontWeight: '900', color: '#E63946', letterSpacing: -1, lineHeight: 48 },
  rmSectionUnit: { fontSize: 20, fontWeight: '500', color: '#883030' },
  rmPRBadge: { marginTop: 6, backgroundColor: '#0A1A0A', borderWidth: 1, borderColor: '#22C55E33', borderRadius: 5, paddingHorizontal: 10, paddingVertical: 3 },
  rmPRBadgeTxt: { fontSize: 9, color: '#22C55E', fontWeight: '800', letterSpacing: 1.5 },
  rmFormulas: { fontSize: 9, color: '#2A2A2A', marginTop: 4, fontWeight: '600', letterSpacing: 0.3 },
  formDivider: { height: 1, backgroundColor: '#181818', marginVertical: 14 },
  inputLabel: { fontSize: 9, color: '#3A3A3A', fontWeight: '700', letterSpacing: 1.5, marginBottom: 5, textAlign: 'center' },
  input: { backgroundColor: '#0D0D0D', color: '#FFF', paddingHorizontal: 12, height: 44, borderRadius: 10, fontSize: 20, fontWeight: '700', borderWidth: 1, borderColor: '#1E1E1E', textAlign: 'center' },
  inputFull: { width: '100%', marginBottom: 0 },
  inputSm: { height: 38, fontSize: 15, color: '#555' },
  inputLg: { height: 52, fontSize: 30 },
  chronoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
  chronoDisplay: { flex: 1, fontSize: 36, fontWeight: '900', color: '#E63946', textAlign: 'center' },
  chronoBtn: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chronoBtnActive: { backgroundColor: '#E63946', borderColor: '#E63946' },
  chronoBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  inputWrap: { flex: 1 },
  btnSave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E63946', height: 48, borderRadius: 10, marginTop: 14, gap: 8 },
  btnSaveTxt: { color: '#FFF', fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },

  // Rest timer
  restBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A1020', borderWidth: 1, borderColor: '#1D3557', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  restBarTime: { fontSize: 20, fontWeight: '900', color: '#5B9BD5' },
  restBarLabel: { fontSize: 9, color: '#2A4A7A', fontWeight: '700', letterSpacing: 1, flex: 1 },
  restBarClose: { padding: 4 },

  // Sets section
  section: { backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#181818', borderRadius: 12, padding: 12 },
  sectionTitle: { fontSize: 9, fontWeight: '700', color: '#3A3A3A', letterSpacing: 1.5, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#181818' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8, marginBottom: 3, gap: 10 },
  setRowPR: { backgroundColor: '#0A1208' },
  setNum: { color: '#3A3A3A', fontWeight: '900', fontSize: 10, width: 20 },
  setInfo: { flex: 1 },
  setKgReps: { color: '#DDD', fontWeight: '800', fontSize: 14 },
  set1rm: { color: '#555', fontSize: 10, fontWeight: '600', marginTop: 1 },
  set1rmOld: { color: '#E63946', fontSize: 11, fontWeight: '700' },
  setRir: { color: '#444', fontSize: 10, fontWeight: '600' },
  prTag: { color: '#22C55E', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  delBtn: { padding: 6 },

  // Hist rows
  histRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#141414', gap: 10 },
  histDate: { width: 40, fontSize: 10, color: '#3A3A3A', fontWeight: '700' },
  histKgReps: { color: '#888', fontWeight: '700', fontSize: 13 },
  hist1rm: { color: '#3A3A3A', fontSize: 10, fontWeight: '600', marginTop: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0D0D0D', height: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: '#1E1E1E' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  modalTitle: { fontSize: 14, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0A', marginHorizontal: 14, marginVertical: 8, paddingHorizontal: 12, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#1E1E1E' },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13 },
  catScroll: { marginBottom: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#1E1E1E' },
  catChipTxt: { color: '#555', fontSize: 11, fontWeight: '700' },
  exItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#161616', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, gap: 10 },
  exItemDot: { width: 3, height: 22, borderRadius: 1 },
  exItemName: { fontSize: 14, fontWeight: '800', color: '#DDD' },
  exItemSub: { fontSize: 9, color: '#3A3A3A', marginTop: 1, fontWeight: '600', letterSpacing: 0.5 },
});
