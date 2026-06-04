-- Resetear la secuencia de exercises al ID mas alto existente
-- Esto soluciona el error "duplicate key value violates unique constraint exercises_pkey"
-- al crear ejercicios nuevos.

SELECT setval(
  pg_get_serial_sequence('exercises', 'id'),
  (SELECT MAX(id) FROM exercises)
);

-- Verificar que quedó bien:
SELECT last_value FROM exercises_id_seq;
