-- ══════════════════════════════════════════════════════════════
-- MIGRACIÓN: Aislamiento por usuario
-- Correr en: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Agregar user_id a workout_logs (nullable para no romper datos existentes)
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 2. Crear tabla routines en Supabase (reemplaza localStorage)
CREATE TABLE IF NOT EXISTS routines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  exercise_ids integer[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 3. Agregar user_id a progression_plans si no existe
ALTER TABLE progression_plans ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- ── RLS workout_logs ─────────────────────────────────────────
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_logs" ON workout_logs;
DROP POLICY IF EXISTS "users_insert_own_logs" ON workout_logs;
DROP POLICY IF EXISTS "users_update_own_logs" ON workout_logs;
DROP POLICY IF EXISTS "users_delete_own_logs" ON workout_logs;

CREATE POLICY "users_select_own_logs" ON workout_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_logs" ON workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_logs" ON workout_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_logs" ON workout_logs
  FOR DELETE USING (auth.uid() = user_id);

-- ── RLS routines ─────────────────────────────────────────────
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_routines" ON routines;
DROP POLICY IF EXISTS "users_insert_own_routines" ON routines;
DROP POLICY IF EXISTS "users_update_own_routines" ON routines;
DROP POLICY IF EXISTS "users_delete_own_routines" ON routines;

CREATE POLICY "users_select_own_routines" ON routines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_routines" ON routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_routines" ON routines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_routines" ON routines
  FOR DELETE USING (auth.uid() = user_id);

-- ── RLS exercises (global, todos leen, solo auth puede crear custom) ─
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "all_read_exercises" ON exercises;
DROP POLICY IF EXISTS "auth_insert_exercises" ON exercises;
DROP POLICY IF EXISTS "auth_update_exercises" ON exercises;
DROP POLICY IF EXISTS "auth_delete_exercises" ON exercises;

CREATE POLICY "all_read_exercises" ON exercises
  FOR SELECT USING (true);

CREATE POLICY "auth_insert_exercises" ON exercises
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth_update_exercises" ON exercises
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_delete_exercises" ON exercises
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── RLS progression_plans ─────────────────────────────────────
ALTER TABLE progression_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_plans" ON progression_plans;
DROP POLICY IF EXISTS "users_insert_own_plans" ON progression_plans;
DROP POLICY IF EXISTS "users_update_own_plans" ON progression_plans;
DROP POLICY IF EXISTS "users_delete_own_plans" ON progression_plans;

CREATE POLICY "users_select_own_plans" ON progression_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_plans" ON progression_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_plans" ON progression_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_plans" ON progression_plans
  FOR DELETE USING (auth.uid() = user_id);
