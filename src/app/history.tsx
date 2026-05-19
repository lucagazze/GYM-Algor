import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, SectionList, TouchableOpacity,
  ActivityIndicator, Modal, FlatList, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { workoutService, Exercise, WorkoutLog } from '../utils/workoutService';

const CAT_COLOR: Record<string, string> = {
  EMPUJE: '#E63946', TRACCION: '#3B82F6', PIERNA: '#10B981', SKILL: '#F59E0B',
};

interface Section {
  title: string;
  data: WorkoutLog[];
}

function fmtFullDate(d: string): string {
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const month = months[parseInt(parts[1]) - 1] ?? '';
  return `${parts[2]} ${month} ${parts[0]}`;
}

type SortMode = 'recientes' | 'mejores';

export default function HistoryScreen() {
  const [allLogs, setAllLogs] = useState<WorkoutLog[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filterEx, setFilterEx] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('recientes');
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  useFocusEffect(
    useCallback(() => { loadAll(); }, [])
  );

  useEffect(() => {
    workoutService.getExercises().then(setExercises);
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const logs = await workoutService.getAllRecentLogs(200);
    setAllLogs(logs);
    buildSections(logs, filterEx, sortMode);
    setLoading(false);
  };

  const buildSections = (logs: WorkoutLog[], exFilter: number | null, sort: SortMode) => {
    const filtered = exFilter ? logs.filter(l => l.exercise_id === exFilter) : logs;

    if (sort === 'mejores') {
      const sorted = [...filtered].sort((a, b) => {
        const va = Number(a.estimated_1rm) || Number(a.duration_sec) || Number(a.reps) || 0;
        const vb = Number(b.estimated_1rm) || Number(b.duration_sec) || Number(b.reps) || 0;
        return vb - va;
      });
      setSections(sorted.length > 0 ? [{ title: 'MEJORES LEVANTAMIENTOS', data: sorted }] : []);
      return;
    }

    const byDate: Record<string, WorkoutLog[]> = {};
    for (const log of filtered) {
      if (!byDate[log.date]) byDate[log.date] = [];
      byDate[log.date].push(log);
    }
    const secs: Section[] = Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({ title: date, data }));
    setSections(secs);
  };

  useEffect(() => {
    buildSections(allLogs, filterEx, sortMode);
  }, [filterEx, allLogs, sortMode]);

  const handleDelete = (log: WorkoutLog) => {
    const doDelete = async () => {
      if (!log.id) return;
      await workoutService.deleteLog(log.id);
      await loadAll();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Seguro que querés borrar esta serie?')) {
        doDelete();
      }
      return;
    }

    Alert.alert('Borrar registro', '¿Seguro que querés borrar esta serie?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: doDelete,
      },
    ]);
  };

  const filterExName = filterEx ? exercises.find(e => e.id === filterEx)?.name ?? 'Filtrado' : null;

  const renderItem = ({ item }: { item: WorkoutLog }) => {
    const ex = item.exercise as Exercise | undefined;
    const catColor = CAT_COLOR[ex?.category ?? ''] ?? '#555';
    return (
      <View style={s.logRow}>
        <View style={[s.logDot, { backgroundColor: catColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={[s.logExName, { color: catColor }]}>{ex?.name ?? `#${item.exercise_id}`}</Text>
          {ex?.tracking_type === 'weight' ? (
            <Text style={s.logData}>
              <Text style={s.logDataBold}>+{item.added_weight} kg  ×  {item.reps} reps</Text>
              <Text style={s.logData1rm}>   {Number(item.estimated_1rm).toFixed(1)} kg 1RM</Text>
            </Text>
          ) : ex?.tracking_type === 'time' ? (
            <Text style={s.logData}><Text style={s.logDataBold}>{item.duration_sec}s hold</Text></Text>
          ) : (
            <Text style={s.logData}><Text style={s.logDataBold}>{item.reps} reps</Text></Text>
          )}
          {item.notes ? <Text style={s.logNotes}>{item.notes}</Text> : null}
        </View>
        <View style={s.logRight}>
          {item.is_pr && <Text style={s.prBadge}>PR</Text>}
          <TouchableOpacity onPress={() => handleDelete(item)} style={s.delBtn}>
            <Ionicons name="trash-outline" size={16} color="#444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => {
    const isDateTitle = /^\d{4}-\d{2}-\d{2}$/.test(section.title);
    return (
      <View style={s.sectionHeader}>
        <Text style={s.sectionDate}>{isDateTitle ? fmtFullDate(section.title) : section.title}</Text>
        <Text style={s.sectionCount}>{section.data.length} series</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>HISTORIAL</Text>
        <TouchableOpacity style={[s.filterBtn, filterEx ? s.filterBtnActive : undefined]} onPress={() => setFilterOpen(true)}>
          <Ionicons name="filter" size={14} color={filterEx ? '#E63946' : '#555'} />
          <Text style={[s.filterTxt, filterEx ? { color: '#E63946' } : undefined]}>
            {filterEx ? filterExName : 'EJERCICIO'}
          </Text>
          {filterEx && (
            <TouchableOpacity onPress={() => setFilterEx(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={14} color="#E63946" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {/* Sort toggle */}
      <View style={s.sortRow}>
        {(['recientes', 'mejores'] as SortMode[]).map(mode => (
          <TouchableOpacity
            key={mode}
            style={[s.sortBtn, sortMode === mode && s.sortBtnActive]}
            onPress={() => setSortMode(mode)}
          >
            <Text style={[s.sortBtnTxt, sortMode === mode && s.sortBtnTxtActive]}>
              {mode === 'recientes' ? 'RECIENTES' : 'MEJORES'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#E63946" size="large" style={{ marginTop: 60 }} />
      ) : sections.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="calendar-outline" size={56} color="#222" />
          <Text style={s.emptyTxt}>No hay registros{filterEx ? ' para este ejercicio' : ''}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={s.list}
          stickySectionHeadersEnabled
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#111', marginLeft: 36 }} />}
        />
      )}

      {/* ── Filter Modal ─────────────────────────────── */}
      <Modal visible={filterOpen} animationType="slide" transparent>
        <View style={s.overlay}>
          <SafeAreaView style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>FILTRAR POR EJERCICIO</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Ionicons name="close" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[null, ...exercises]}
              keyExtractor={item => String(item?.id ?? 'all')}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              renderItem={({ item }) => {
                const col = item ? (CAT_COLOR[item.category] ?? '#888') : '#888';
                const isSel = item ? filterEx === item.id : filterEx === null;
                return (
                  <TouchableOpacity
                    style={[s.filterItem, isSel && { borderColor: col, backgroundColor: col + '15' }]}
                    onPress={() => { setFilterEx(item?.id ?? null); setFilterOpen(false); }}
                  >
                    {item && <View style={[s.filterDot, { backgroundColor: col }]} />}
                    <Text style={[s.filterItemTxt, isSel && { color: col }]}>
                      {item ? item.name : 'Todos los ejercicios'}
                    </Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#161616' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#141414', borderWidth: 1, borderColor: '#222', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  filterBtnActive: { borderColor: '#E63946', backgroundColor: '#1E0810' },
  filterTxt: { color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, maxWidth: 100 },

  list: { paddingBottom: 50 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0D0D0D', paddingHorizontal: 16, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#161616' },
  sectionDate: { fontSize: 12, fontWeight: '900', color: '#888', letterSpacing: 0.3 },
  sectionCount: { fontSize: 10, color: '#444', fontWeight: '700' },

  sortRow: { flexDirection: 'row', backgroundColor: '#0D0D0D', borderBottomWidth: 1, borderBottomColor: '#141414' },
  sortBtn: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  sortBtnActive: { borderBottomWidth: 2, borderBottomColor: '#E63946' },
  sortBtnTxt: { fontSize: 10, fontWeight: '700', color: '#3A3A3A', letterSpacing: 1 },
  sortBtnTxtActive: { color: '#E63946' },

  logRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0A0A0A' },
  logDot: { width: 3, height: 34, borderRadius: 2, marginRight: 12 },
  logExName: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  logData: { fontSize: 14, color: '#888', fontWeight: '600' },
  logDataBold: { fontSize: 14, color: '#DDD', fontWeight: '800' },
  logData1rm: { fontSize: 11, color: '#444', fontWeight: '600' },
  logRir: { fontSize: 10, color: '#444', fontWeight: '600', marginTop: 2 },
  logNotes: { fontSize: 10, color: '#555', fontStyle: 'italic', marginTop: 2 },
  logRight: { alignItems: 'flex-end', gap: 6 },
  prBadge: { fontSize: 9, color: '#22C55E', fontWeight: '800', letterSpacing: 0.5 },
  delBtn: { padding: 5 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTxt: { color: '#333', fontSize: 14, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111', maxHeight: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: '#222' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  sheetTitle: { fontSize: 15, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  filterItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1E1E1E', borderRadius: 10, padding: 10, gap: 10 },
  filterDot: { width: 3, height: 24, borderRadius: 2 },
  filterItemTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: '#CCC' },
});
