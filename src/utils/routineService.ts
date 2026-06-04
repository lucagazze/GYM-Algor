import { supabase } from './supabase';

export interface Folder {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface Routine {
  id: string;
  name: string;
  exerciseIds: number[];
  createdAt: string;
  folderId?: string | null;
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

// ── Folders ──────────────────────────────────────────────────
export const folderService = {
  async getAll(): Promise<Folder[]> {
    const userId = await uid();
    if (!userId) return [];
    const { data, error } = await supabase
      .from('routine_folders')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map(f => ({
      id: f.id,
      name: f.name,
      sortOrder: f.sort_order,
      createdAt: f.created_at,
    }));
  },

  async create(name: string): Promise<Folder | null> {
    const userId = await uid();
    if (!userId) return null;
    const { data, error } = await supabase
      .from('routine_folders')
      .insert([{ name, user_id: userId }])
      .select()
      .single();
    if (error || !data) return null;
    return { id: data.id, name: data.name, sortOrder: data.sort_order, createdAt: data.created_at };
  },

  async rename(id: string, name: string): Promise<void> {
    const userId = await uid();
    if (!userId) return;
    await supabase.from('routine_folders').update({ name }).eq('id', id).eq('user_id', userId);
  },

  async delete(id: string): Promise<void> {
    const userId = await uid();
    if (!userId) return;
    // Unassign routines in this folder first
    await supabase.from('routines').update({ folder_id: null }).eq('folder_id', id).eq('user_id', userId);
    await supabase.from('routine_folders').delete().eq('id', id).eq('user_id', userId);
  },
};

// ── Routines ─────────────────────────────────────────────────
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
        folderId: r.folder_id ?? null,
      }));
    } catch { return []; }
  },

  async create(name: string, exerciseIds: number[], folderId?: string | null): Promise<Routine> {
    const userId = await uid();
    if (!userId) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('routines')
      .insert([{ name, exercise_ids: exerciseIds, user_id: userId, folder_id: folderId ?? null }])
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Error al crear rutina');
    return { id: data.id, name: data.name, exerciseIds: data.exercise_ids ?? [], createdAt: data.created_at, folderId: data.folder_id };
  },

  async update(id: string, updates: Partial<Pick<Routine, 'name' | 'exerciseIds' | 'folderId'>>): Promise<void> {
    const userId = await uid();
    if (!userId) return;
    const patch: Record<string, any> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.exerciseIds !== undefined) patch.exercise_ids = updates.exerciseIds;
    if ('folderId' in updates) patch.folder_id = updates.folderId ?? null;
    await supabase.from('routines').update(patch).eq('id', id).eq('user_id', userId);
  },

  async delete(id: string): Promise<void> {
    const userId = await uid();
    if (!userId) return;
    await supabase.from('routines').delete().eq('id', id).eq('user_id', userId);
  },

  async moveToFolder(routineId: string, folderId: string | null): Promise<void> {
    const userId = await uid();
    if (!userId) return;
    await supabase.from('routines').update({ folder_id: folderId }).eq('id', routineId).eq('user_id', userId);
  },
};
