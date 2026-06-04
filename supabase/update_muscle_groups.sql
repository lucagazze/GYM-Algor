-- Asignar muscle_group a los ejercicios originales (IDs 1-14)
UPDATE exercises SET muscle_group = 'Pecho'           WHERE id = 1;  -- Dips
UPDATE exercises SET muscle_group = 'Espalda'         WHERE id = 2;  -- Dominadas Prona
UPDATE exercises SET muscle_group = 'Cuádriceps'      WHERE id = 3;  -- Sentadilla
UPDATE exercises SET muscle_group = 'Hombros'         WHERE id = 4;  -- Press Militar
UPDATE exercises SET muscle_group = 'Pecho'           WHERE id = 5;  -- Pecho Plano
UPDATE exercises SET muscle_group = 'Espalda'         WHERE id = 6;  -- Dominada Supina
UPDATE exercises SET muscle_group = 'Core'            WHERE id = 7;  -- Front Lever
UPDATE exercises SET muscle_group = 'Core'            WHERE id = 8;  -- L-Sit
UPDATE exercises SET muscle_group = 'Espalda'         WHERE id = 9;  -- Muscle Up
UPDATE exercises SET muscle_group = 'Isquiotibiales'  WHERE id = 10; -- Peso Muerto
UPDATE exercises SET muscle_group = 'Bíceps'          WHERE id = 11; -- Bícep Barra
UPDATE exercises SET muscle_group = 'Bíceps'          WHERE id = 12; -- Bícep Mancuerna
UPDATE exercises SET muscle_group = 'Tríceps'         WHERE id = 13; -- Trícep Francés
UPDATE exercises SET muscle_group = 'Pecho'           WHERE id = 14; -- Press Inclinado
