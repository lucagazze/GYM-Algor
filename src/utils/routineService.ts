import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Routine {
  id: string;
  name: string;
  exerciseIds: number[];
  createdAt: string;
}

export interface ActiveSession {
  routineId: string;
  routineName: string;
  exerciseIds: number[];
  currentIdx: number;
  startTime: number;
}

const KEY = '@gym_routines';

const store = {
  async get(): Promise<Routine[]> {
    try {
      if (Platform.OS === 'web') {
        const v = localStorage.getItem(KEY);
        return v ? JSON.parse(v) : [];
      }
      const v = await AsyncStorage.getItem(KEY);
      return v ? JSON.parse(v) : [];
    } catch { return []; }
  },
  async set(routines: Routine[]): Promise<void> {
    try {
      const v = JSON.stringify(routines);
      if (Platform.OS === 'web') localStorage.setItem(KEY, v);
      else await AsyncStorage.setItem(KEY, v);
    } catch {}
  },
};

export const routineService = {
  async getAll(): Promise<Routine[]> {
    return store.get();
  },

  async create(name: string, exerciseIds: number[]): Promise<Routine> {
    const routines = await store.get();
    const r: Routine = {
      id: 'r_' + Date.now(),
      name,
      exerciseIds,
      createdAt: new Date().toISOString(),
    };
    routines.push(r);
    await store.set(routines);
    return r;
  },

  async update(id: string, updates: Partial<Pick<Routine, 'name' | 'exerciseIds'>>): Promise<void> {
    const routines = await store.get();
    const idx = routines.findIndex(r => r.id === id);
    if (idx >= 0) {
      routines[idx] = { ...routines[idx], ...updates };
      await store.set(routines);
    }
  },

  async delete(id: string): Promise<void> {
    const routines = await store.get();
    await store.set(routines.filter(r => r.id !== id));
  },
};
