import { supabase } from './supabase';

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

async function uid(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export const routineService = {
  async getAll(): Promise<Routine[]> {
    const userId = await uid();
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error || !data) return [];
      return data.map(r => ({
        id: r.id,
        name: r.name,
        exerciseIds: r.exercise_ids ?? [],
        createdAt: r.created_at,
      }));
    } catch { return []; }
  },

  async create(name: string, exerciseIds: number[]): Promise<Routine> {
    const userId = await uid();
    if (!userId) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('routines')
      .insert([{ name, exercise_ids: exerciseIds, user_id: userId }])
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Error al crear rutina');
    return {
      id: data.id,
      name: data.name,
      exerciseIds: data.exercise_ids ?? [],
      createdAt: data.created_at,
    };
  },

  async update(id: string, updates: Partial<Pick<Routine, 'name' | 'exerciseIds'>>): Promise<void> {
    const userId = await uid();
    if (!userId) return;
    const patch: Record<string, any> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.exerciseIds !== undefined) patch.exercise_ids = updates.exerciseIds;
    await supabase
      .from('routines')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId);
  },

  async delete(id: string): Promise<void> {
    const userId = await uid();
    if (!userId) return;
    await supabase
      .from('routines')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
  },
};
