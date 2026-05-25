import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface Exercise {
  id: number;
  name: string;
  category: 'EMPUJE' | 'TRACCION' | 'PIERNA' | 'SKILL';
  tracking_type: 'weight' | 'time' | 'reps';
  notes?: string;
  muscle_group?: string;
  equipment?: string;
  is_custom?: boolean;
  is_favorite?: boolean;
}

export interface WorkoutLog {
  id?: string;
  created_at?: string;
  date: string;
  exercise_id: number;
  added_weight: number;
  body_weight: number;
  reps: number;
  duration_sec: number;
  estimated_1rm: number;
  rir: number;
  is_pr: boolean;
  notes?: string;
  set_number?: number;
  exercise?: Exercise;
}

export interface ProgressionPlan {
  id?: string;
  exercise_id: number;
  target_month: string;
  target_1rm: number;
  year_goal?: number;
  exercise?: Exercise;
}

export interface ExerciseRecord {
  exercise: Exercise;
  best1rm: number;
  bestDate: string;
  totalSets: number;
  yearGoal?: number;
}

// ── 1RM Formula Suite ─────────────────────────────────────────────
export const RM = {
  epley: (w: number, r: number): number => {
    if (r <= 0 || w <= 0) return 0;
    if (r === 1) return w;
    return w * (1 + r / 30);
  },
  brzycki: (w: number, r: number): number => {
    if (r <= 0 || w <= 0) return 0;
    if (r === 1) return w;
    if (r >= 37) return w;
    return w / (1.0278 - 0.0278 * r);
  },
  wathen: (w: number, r: number): number => {
    if (r <= 0 || w <= 0) return 0;
    if (r === 1) return w;
    return (100 * w) / (48.8 + 53.8 * Math.exp(-0.075 * r));
  },
  mayhew: (w: number, r: number): number => {
    if (r <= 0 || w <= 0) return 0;
    if (r === 1) return w;
    return (100 * w) / (52.2 + 41.9 * Math.exp(-0.055 * r));
  },
  average: (w: number, r: number): number => {
    const e = RM.epley(w, r);
    const b = RM.brzycki(w, r);
    const wt = RM.wathen(w, r);
    return (e + b + wt) / 3;
  },
  format: (val: number): string => (Math.round(val * 10) / 10).toFixed(1),
};

// ── Storage Helper (Web + Native) ────────────────────────────────
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    }
    try { return await AsyncStorage.getItem(key); } catch { return null; }
  },
  async set(key: string, val: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') localStorage.setItem(key, val);
      return;
    }
    try { await AsyncStorage.setItem(key, val); } catch {}
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') localStorage.removeItem(key);
      return;
    }
    try { await AsyncStorage.removeItem(key); } catch {}
  },
};

const KEYS = {
  exercises: '@gym_exercises',
  offlineLogs: '@gym_offline_logs',
  bodyWeight: '@gym_body_weight',
  favorites: '@gym_favorites',
};

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 1, name: 'Dips (fondos)', category: 'EMPUJE', tracking_type: 'weight' },
  { id: 2, name: 'Dominadas Prona', category: 'TRACCION', tracking_type: 'weight' },
  { id: 3, name: 'Sentadilla', category: 'PIERNA', tracking_type: 'weight' },
  { id: 4, name: 'Press Militar Parado (barra)', category: 'EMPUJE', tracking_type: 'weight' },
  { id: 5, name: 'Pecho Plano', category: 'EMPUJE', tracking_type: 'weight' },
  { id: 6, name: 'Dominada Supina', category: 'TRACCION', tracking_type: 'weight' },
  { id: 7, name: 'Front Lever Hold', category: 'SKILL', tracking_type: 'time' },
  { id: 8, name: 'L-Sit Hold', category: 'SKILL', tracking_type: 'time' },
  { id: 9, name: 'Muscle Up', category: 'SKILL', tracking_type: 'reps' },
  { id: 10, name: 'Peso Muerto', category: 'PIERNA', tracking_type: 'weight' },
  { id: 11, name: 'Bícep Barra', category: 'TRACCION', tracking_type: 'weight' },
  { id: 12, name: 'Bícep Mancuerna', category: 'TRACCION', tracking_type: 'weight' },
  { id: 13, name: 'Trícep Francés', category: 'EMPUJE', tracking_type: 'weight' },
  { id: 14, name: 'Press Inclinado', category: 'EMPUJE', tracking_type: 'weight' },
];

const CATEGORY_ORDER: Record<string, number> = { EMPUJE: 0, TRACCION: 1, PIERNA: 2, SKILL: 3 };

export const workoutService = {
  // ── Exercises ──────────────────────────────────────────────────
  async getFavoriteIds(): Promise<Set<number>> {
    const str = await storage.get(KEYS.favorites);
    const arr: number[] = str ? JSON.parse(str) : [1, 2, 3];
    return new Set(arr);
  },

  async toggleFavorite(id: number): Promise<boolean> {
    const str = await storage.get(KEYS.favorites);
    const arr: number[] = str ? JSON.parse(str) : [1, 2, 3];
    const idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(id);
    await storage.set(KEYS.favorites, JSON.stringify(arr));
    return idx < 0;
  },

  async getExercises(): Promise<Exercise[]> {
    const favs = await this.getFavoriteIds();
    const merge = (list: Exercise[]) => list.map(ex => ({ ...ex, is_favorite: favs.has(ex.id) }));
    try {
      const { data, error } = await supabase.from('exercises').select('*').order('id');
      if (error || !data || data.length === 0) {
        const cached = await storage.get(KEYS.exercises);
        return merge(cached ? JSON.parse(cached) : DEFAULT_EXERCISES);
      }
      const sorted = [...data].sort(
        (a, b) => (CATEGORY_ORDER[a.category] ?? 9) - (CATEGORY_ORDER[b.category] ?? 9)
      );
      await storage.set(KEYS.exercises, JSON.stringify(sorted));
      return merge(sorted);
    } catch {
      const cached = await storage.get(KEYS.exercises);
      return merge(cached ? JSON.parse(cached) : DEFAULT_EXERCISES);
    }
  },

  async createExercise(ex: Omit<Exercise, 'id'>): Promise<{ data?: Exercise; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .insert([{ ...ex, is_custom: true }])
        .select()
        .single();
      if (error) return { error: error.message };
      return { data };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  async updateExercise(id: number, updates: Partial<Exercise>): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.from('exercises').update(updates).eq('id', id);
      if (error) return { error: error.message };
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  },

  async deleteExercise(id: number): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.from('exercises').delete().eq('id', id);
      if (error) return { error: error.message };
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  },

  // ── Workout Logs ──────────────────────────────────────────────
  async getLogsForExercise(exerciseId: number, limit = 30): Promise<WorkoutLog[]> {
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('exercise_id', exerciseId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      return !error && data ? data : [];
    } catch { return []; }
  },

  async getPRLog(exerciseId: number): Promise<WorkoutLog | null> {
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('exercise_id', exerciseId)
        .eq('is_pr', true)
        .order('estimated_1rm', { ascending: false })
        .limit(1)
        .single();
      return !error && data ? data : null;
    } catch { return null; }
  },

  async getLastLog(exerciseId: number): Promise<WorkoutLog | null> {
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('exercise_id', exerciseId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return !error && data ? data : null;
    } catch { return null; }
  },

  async getTodayLogs(exerciseId: number, date?: string): Promise<WorkoutLog[]> {
    const targetDate = date ?? new Date().toISOString().split('T')[0];
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('exercise_id', exerciseId)
        .eq('date', targetDate)
        .order('created_at', { ascending: true });
      return !error && data ? data : [];
    } catch { return []; }
  },

  async getAllRecentLogs(limit = 100): Promise<WorkoutLog[]> {
    try {
      const [logsRes, exRes] = await Promise.all([
        supabase
          .from('workout_logs')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase.from('exercises').select('*'),
      ]);
      if (logsRes.error || !logsRes.data) return [];
      const exMap: Record<number, Exercise> = {};
      for (const ex of (exRes.data ?? [])) exMap[ex.id] = ex;
      return logsRes.data.map(l => ({ ...l, exercise: exMap[l.exercise_id] }));
    } catch { return []; }
  },

  async saveLog(log: Omit<WorkoutLog, 'id' | 'is_pr'>): Promise<{ data?: WorkoutLog; offline?: boolean; error?: string }> {
    const best = await this.getBest1RM(log.exercise_id);
    const isPR =
      (log.estimated_1rm > 0 && log.estimated_1rm > best.best1rm) ||
      (log.duration_sec > 0 && log.estimated_1rm === 0 && log.duration_sec > best.bestDuration) ||
      (log.reps > 0 && log.estimated_1rm === 0 && log.duration_sec === 0 && log.reps > best.bestReps);

    const logToSave = { ...log, is_pr: isPR };

    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .insert([logToSave])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { data };
    } catch {
      const offlineStr = await storage.get(KEYS.offlineLogs);
      const offlineList: WorkoutLog[] = offlineStr ? JSON.parse(offlineStr) : [];
      const offlineLog = { ...logToSave, id: 'offline-' + Date.now(), created_at: new Date().toISOString() };
      offlineList.push(offlineLog);
      await storage.set(KEYS.offlineLogs, JSON.stringify(offlineList));
      return { data: offlineLog as WorkoutLog, offline: true };
    }
  },

  async deleteLog(id: string): Promise<boolean> {
    if (id.startsWith('offline-')) {
      const str = await storage.get(KEYS.offlineLogs);
      const list: WorkoutLog[] = str ? JSON.parse(str) : [];
      await storage.set(KEYS.offlineLogs, JSON.stringify(list.filter(l => l.id !== id)));
      return true;
    }
    try {
      const { error } = await supabase.from('workout_logs').delete().eq('id', id);
      return !error;
    } catch { return false; }
  },

  async syncOfflineLogs(): Promise<number> {
    const str = await storage.get(KEYS.offlineLogs);
    if (!str) return 0;
    const logs: WorkoutLog[] = JSON.parse(str);
    if (logs.length === 0) return 0;

    let synced = 0;
    const remaining: WorkoutLog[] = [];
    for (const log of logs) {
      const { id, created_at, exercise, ...clean } = log;
      try {
        const { error } = await supabase.from('workout_logs').insert([clean]);
        if (!error) synced++;
        else remaining.push(log);
      } catch { remaining.push(log); }
    }
    if (remaining.length === 0) await storage.remove(KEYS.offlineLogs);
    else await storage.set(KEYS.offlineLogs, JSON.stringify(remaining));
    return synced;
  },

  async getOfflineCount(): Promise<number> {
    const str = await storage.get(KEYS.offlineLogs);
    return str ? JSON.parse(str).length : 0;
  },

  // ── Records & Stats ───────────────────────────────────────────
  async getBest1RM(exerciseId: number): Promise<{ best1rm: number; bestDuration: number; bestReps: number; bestDate: string }> {
    try {
      const { data } = await supabase
        .from('workout_logs')
        .select('estimated_1rm, duration_sec, reps, date')
        .eq('exercise_id', exerciseId);
      if (!data || data.length === 0) return { best1rm: 0, bestDuration: 0, bestReps: 0, bestDate: '' };
      let best1rm = 0, bestDuration = 0, bestReps = 0, bestDate = '';
      for (const row of data) {
        if ((row.estimated_1rm || 0) > best1rm) { best1rm = row.estimated_1rm; bestDate = row.date; }
        if ((row.duration_sec || 0) > bestDuration) bestDuration = row.duration_sec;
        if ((row.reps || 0) > bestReps) bestReps = row.reps;
      }
      return { best1rm, bestDuration, bestReps, bestDate };
    } catch { return { best1rm: 0, bestDuration: 0, bestReps: 0, bestDate: '' }; }
  },

  async getAllRecords(): Promise<ExerciseRecord[]> {
    try {
      const exercises = await this.getExercises();
      const { data: plans } = await supabase
        .from('progression_plans')
        .select('exercise_id, target_1rm, year_goal');

      const records: ExerciseRecord[] = [];
      for (const ex of exercises) {
        const best = await this.getBest1RM(ex.id);
        const plan = plans?.find(p => p.exercise_id === ex.id);
        const { data: countData } = await supabase
          .from('workout_logs')
          .select('id', { count: 'exact', head: true })
          .eq('exercise_id', ex.id);

        records.push({
          exercise: ex,
          best1rm: best.best1rm,
          bestDate: best.bestDate,
          totalSets: (countData as any)?.count ?? 0,
          yearGoal: plan?.year_goal ?? plan?.target_1rm,
        });
      }
      return records;
    } catch { return []; }
  },

  async getMonthlyBests(exerciseId: number): Promise<{ month: string; best1rm: number }[]> {
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('date, estimated_1rm, duration_sec, reps')
        .eq('exercise_id', exerciseId)
        .order('date', { ascending: true });
      if (error || !data) return [];

      const monthMap: Record<string, number> = {};
      for (const row of data) {
        const month = row.date.substring(0, 7);
        const val = Number(row.estimated_1rm) || Number(row.duration_sec) || Number(row.reps) || 0;
        if (!monthMap[month] || val > monthMap[month]) monthMap[month] = val;
      }
      return Object.entries(monthMap).map(([month, best1rm]) => ({ month, best1rm }));
    } catch { return []; }
  },

  // ── Progression Plans ─────────────────────────────────────────
  async getActiveDays(): Promise<string[]> {
    try {
      const { data } = await supabase.from('workout_logs').select('date').order('date', { ascending: false });
      if (!data) return [];
      const set = new Set<string>();
      for (const row of data) set.add(row.date);
      return Array.from(set);
    } catch { return []; }
  },

  async getWeeklyVolumeByCategory(): Promise<{ category: string; sets: number }[]> {
    try {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const sevenDaysAgo = d.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*, exercise:exercises(*)')
        .gte('date', sevenDaysAgo);
        
      if (error || !data) return [];
      
      const counts: Record<string, number> = { EMPUJE: 0, TRACCION: 0, PIERNA: 0, SKILL: 0 };
      for (const row of data) {
        if (row.exercise && row.exercise.category) {
          counts[row.exercise.category] = (counts[row.exercise.category] || 0) + 1;
        }
      }
      return Object.entries(counts).map(([category, sets]) => ({ category, sets }));
    } catch { return []; }
  },

  async getProgressionPlans(): Promise<ProgressionPlan[]> {
    try {
      const { data, error } = await supabase
        .from('progression_plans')
        .select('*, exercise:exercises(*)')
        .order('target_month');
      return !error && data ? data : [];
    } catch { return []; }
  },

  async upsertPlan(plan: ProgressionPlan): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('progression_plans')
        .upsert([plan], { onConflict: 'exercise_id,user_id' });
      if (error) return { error: error.message };
      return {};
    } catch (e: any) { return { error: e.message }; }
  },

  // ── Body Weight ───────────────────────────────────────────────
  async getSavedBodyWeight(): Promise<string> {
    return (await storage.get(KEYS.bodyWeight)) ?? '86';
  },

  async saveBodyWeight(w: string): Promise<void> {
    await storage.set(KEYS.bodyWeight, w);
  },
};
