-- =====================================================
-- SQL CON DATOS DEL EXCEL progreso_gym_2026
-- Generado automaticamente
-- =====================================================

-- EJERCICIOS (insertar en orden para que los IDs sean correctos)
TRUNCATE TABLE public.exercises RESTART IDENTITY CASCADE;

INSERT INTO public.exercises (id, name, category, tracking_type, muscle_group, equipment, is_custom) VALUES
  (1, 'Press Militar Parado (barra)', 'EMPUJE', 'weight', 'Hombros, Triceps', 'barbell', false),
  (2, 'Pecho Plano', 'EMPUJE', 'weight', 'Pecho, Triceps', 'barbell', false),
  (3, 'Dips (fondos)', 'EMPUJE', 'weight', 'Pecho, Triceps', 'bodyweight', false),
  (4, 'Dominadas Prona', 'TRACCION', 'weight', 'Dorsal, Biceps', 'bodyweight', false),
  (5, 'Dominada Supina', 'TRACCION', 'weight', 'Dorsal, Biceps', 'bodyweight', false),
  (6, 'Sentadilla', 'PIERNA', 'weight', 'Cuadriceps, Gluteos', 'barbell', false),
  (7, 'Front Lever Hold', 'SKILL', 'time', 'Core, Dorsal', 'bodyweight', false),
  (8, 'L-Sit Hold', 'SKILL', 'time', 'Core, Triceps', 'bodyweight', false),
  (9, 'Muscle Up', 'SKILL', 'reps', 'Dorsal, Triceps', 'bodyweight', false);

SELECT setval('exercises_id_seq', 9);

-- WORKOUT LOGS
TRUNCATE TABLE public.workout_logs;

INSERT INTO public.workout_logs (date, exercise_id, added_weight, body_weight, reps, duration_sec, estimated_1rm, rir, is_pr, notes) VALUES
  ('2026-04-06', 1, 75.0, 86.0, 6, 0, 87.1, 0, true, NULL),
  ('2026-04-06', 2, 105.0, 86.0, 7, 0, 126.0, 0, true, NULL),
  ('2026-04-06', 3, 100.0, 86.0, 1, 0, 186.0, 0, true, NULL),
  ('2026-04-06', 4, 55.0, 86.0, 5, 0, 158.6, 0, true, NULL),
  ('2026-04-06', 6, 120.0, 86.0, 8, 0, 149.0, 0, true, NULL),
  ('2026-04-06', 7, 0.0, 86.0, 0, 3, 0.0, 0, true, NULL),
  ('2026-04-06', 9, 0.0, 86.0, 5, 0, 0.0, 0, true, NULL),
  ('2026-04-08', 6, 115.0, 86.0, 6, 0, 133.6, 0, false, NULL),
  ('2026-04-08', 6, 120.0, 86.0, 0, 0, 0.0, 0, false, NULL),
  ('2026-04-08', 3, 80.0, 86.5, 3, 0, 176.3, 0, false, NULL),
  ('2026-04-08', 3, 70.0, 86.5, 5, 0, 176.1, 0, false, NULL),
  ('2026-04-08', 5, 30.0, 86.5, 6, 0, 135.3, 0, true, NULL),
  ('2026-04-08', 5, 20.0, 86.5, 8, 0, 132.2, 0, false, NULL),
  ('2026-04-08', 1, 75.0, 86.0, 5, 0, 84.4, 0, false, NULL),
  ('2026-04-08', 1, 60.0, 86.0, 10, 0, 80.0, 0, false, NULL),
  ('2026-04-08', 5, 35.0, 86.0, 6, 0, 140.5, 0, true, NULL),
  ('2026-04-08', 6, 100.0, 87.0, 11, 0, 138.5, 0, false, NULL),
  ('2026-04-08', 3, 70.0, 86.0, 6, 0, 81.3, 0, false, NULL),
  ('2026-04-08', 1, 73.0, 87.0, 7, 0, 87.6, 0, true, NULL),
  ('2026-04-08', 5, 37.5, 87.0, 7, 0, 152.5, 0, true, NULL),
  ('2026-04-08', 5, 27.5, 86.0, 9, 0, 147.5, 0, false, NULL),
  ('2026-04-08', 6, 121.0, 87.0, 5, 0, 136.1, 0, false, NULL),
  ('2026-04-08', 6, 106.0, 87.0, 10, 0, 141.4, 0, false, NULL),
  ('2026-04-08', 3, 75.0, 87.0, 6, 0, 188.2, 0, true, NULL),
  ('2026-04-08', 3, 65.0, 87.0, 6, 0, 176.5, 0, false, NULL),
  ('2026-04-08', 1, 76.0, 87.5, 5, 0, 85.5, 0, false, NULL),
  ('2026-04-08', 5, 40.0, 87.5, 6, 0, 148.1, 0, false, NULL),
  ('2026-04-08', 5, 30.0, 87.5, 7, 0, 141.0, 0, false, NULL),
  ('2026-04-08', 6, 120.0, 87.5, 0, 0, 0.0, 0, false, NULL),
  ('2026-04-08', 3, 77.5, 87.5, 4, 0, 184.4, 0, false, NULL);

-- Total: 30 registros
-- PRs: 12 personal records
