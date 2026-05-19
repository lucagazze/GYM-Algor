-- ═══════════════════════════════════════════════════════════════
-- SQL MEJORAS — Streetlifting Beast DB
-- Correr en Supabase SQL Editor en orden
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Mejorar tabla exercises ───────────────────────────────
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS muscle_group text,
  ADD COLUMN IF NOT EXISTS equipment text DEFAULT 'bodyweight',
  ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS icon text DEFAULT '🏋️',
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- ── 2. Mejorar tabla workout_logs ────────────────────────────
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS set_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_warmup boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS workout_session_id uuid;

-- ── 3. Crear tabla workout_sessions ─────────────────────────
-- Agrupa series del mismo entrenamiento (mismo día, mismo gym)
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  notes text,
  duration_min integer,
  bodyweight_kg numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workout_sessions_pkey PRIMARY KEY (id)
);

-- FK opcional (no rompe nada si no se usa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workout_logs_session_id_fkey'
  ) THEN
    ALTER TABLE public.workout_logs
      ADD CONSTRAINT workout_logs_session_id_fkey
      FOREIGN KEY (workout_session_id)
      REFERENCES public.workout_sessions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ── 4. Crear tabla body_weight_log ───────────────────────────
CREATE TABLE IF NOT EXISTS public.body_weight_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  weight_kg numeric NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT body_weight_log_pkey PRIMARY KEY (id),
  CONSTRAINT body_weight_log_date_key UNIQUE (date)
);

-- ── 5. Mejorar tabla progression_plans ──────────────────────
ALTER TABLE public.progression_plans
  ADD COLUMN IF NOT EXISTS year_goal numeric,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Upsert constraint para que solo haya 1 plan por ejercicio
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'progression_plans_exercise_id_key'
  ) THEN
    ALTER TABLE public.progression_plans
      ADD CONSTRAINT progression_plans_exercise_id_key UNIQUE (exercise_id);
  END IF;
END $$;

-- ── 6. Índices de performance ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workout_logs_exercise_date
  ON public.workout_logs(exercise_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_workout_logs_date
  ON public.workout_logs(date DESC);

CREATE INDEX IF NOT EXISTS idx_workout_logs_pr
  ON public.workout_logs(is_pr) WHERE is_pr = true;

CREATE INDEX IF NOT EXISTS idx_workout_logs_session
  ON public.workout_logs(workout_session_id)
  WHERE workout_session_id IS NOT NULL;

-- ── 7. View: mejor 1RM por ejercicio (útil para dashboards) ──
CREATE OR REPLACE VIEW public.exercise_records AS
SELECT
  e.id AS exercise_id,
  e.name,
  e.category,
  e.tracking_type,
  MAX(w.estimated_1rm) AS best_1rm,
  MAX(w.duration_sec) AS best_duration_sec,
  MAX(w.reps) AS best_reps,
  (
    SELECT w2.date FROM public.workout_logs w2
    WHERE w2.exercise_id = e.id
    ORDER BY w2.estimated_1rm DESC NULLS LAST
    LIMIT 1
  ) AS best_date,
  COUNT(w.id) AS total_sets
FROM public.exercises e
LEFT JOIN public.workout_logs w ON w.exercise_id = e.id
GROUP BY e.id, e.name, e.category, e.tracking_type;

-- ── 8. View: progreso mensual por ejercicio ───────────────────
CREATE OR REPLACE VIEW public.monthly_progress AS
SELECT
  exercise_id,
  date_trunc('month', date::timestamp)::date AS month,
  MAX(estimated_1rm) AS best_1rm,
  MAX(duration_sec) AS best_duration,
  MAX(reps) AS best_reps,
  COUNT(*) AS total_sets,
  SUM(reps * (added_weight + COALESCE(body_weight, 0))) AS total_volume
FROM public.workout_logs
GROUP BY exercise_id, date_trunc('month', date::timestamp);

-- ── 9. Cargar ejercicios base (si la tabla está vacía) ────────
INSERT INTO public.exercises (name, category, tracking_type, muscle_group, equipment, is_custom)
VALUES
  ('Press Militar Parado (barra)', 'EMPUJE', 'weight', 'Hombros, Tríceps', 'barbell', false),
  ('Pecho Plano', 'EMPUJE', 'weight', 'Pecho, Tríceps', 'barbell', false),
  ('Dips (fondos)', 'EMPUJE', 'weight', 'Pecho, Tríceps', 'bodyweight', false),
  ('Dominadas Prona', 'TRACCION', 'weight', 'Dorsal, Bíceps', 'bodyweight', false),
  ('Dominada Supina', 'TRACCION', 'weight', 'Dorsal, Bíceps', 'bodyweight', false),
  ('Sentadilla', 'PIERNA', 'weight', 'Cuádriceps, Glúteos', 'barbell', false),
  ('Front Lever Hold', 'SKILL', 'time', 'Core, Dorsal', 'bodyweight', false),
  ('L-Sit Hold', 'SKILL', 'time', 'Core, Tríceps', 'bodyweight', false),
  ('Muscle Up', 'SKILL', 'reps', 'Dorsal, Tríceps', 'bodyweight', false)
ON CONFLICT DO NOTHING;

-- ── 10. RLS Policies (si Supabase RLS está activo) ───────────
-- Si tenés RLS habilitado y el app no usa auth, habilitar lectura pública:
-- ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read exercises" ON public.exercises FOR SELECT USING (true);
-- CREATE POLICY "Public all workout_logs" ON public.workout_logs FOR ALL USING (true);
-- (Ajustar según si usás auth o no)
