-- ══════════════════════════════════════════════════════════════
-- SEED: Ejercicios completos de gimnasio
-- Correr en: Supabase Dashboard → SQL Editor
-- IDs 1-14 ya existen (no se tocan)
-- ══════════════════════════════════════════════════════════════

INSERT INTO exercises (id, name, category, tracking_type, muscle_group, equipment) VALUES

-- ── EMPUJE — Barra ─────────────────────────────────────────────
(15,  'Press Plano (barra)',            'EMPUJE',   'weight', 'Pecho',        'Barra'),
(16,  'Press Declinado (barra)',        'EMPUJE',   'weight', 'Pecho',        'Barra'),
(17,  'Press Militar Sentado (barra)', 'EMPUJE',   'weight', 'Hombros',      'Barra'),
(18,  'Press Francés (barra EZ)',      'EMPUJE',   'weight', 'Tríceps',      'Barra EZ'),

-- ── EMPUJE — Mancuernas ───────────────────────────────────────
(19,  'Press Plano (mancuernas)',       'EMPUJE',   'weight', 'Pecho',        'Mancuernas'),
(20,  'Press Inclinado (mancuernas)',   'EMPUJE',   'weight', 'Pecho',        'Mancuernas'),
(21,  'Press Declinado (mancuernas)',   'EMPUJE',   'weight', 'Pecho',        'Mancuernas'),
(22,  'Aperturas Planas (mancuernas)', 'EMPUJE',   'weight', 'Pecho',        'Mancuernas'),
(23,  'Aperturas Inclinadas',          'EMPUJE',   'weight', 'Pecho',        'Mancuernas'),
(24,  'Press Hombro (mancuernas)',     'EMPUJE',   'weight', 'Hombros',      'Mancuernas'),
(25,  'Elevaciones Laterales',         'EMPUJE',   'weight', 'Hombros',      'Mancuernas'),
(26,  'Elevaciones Frontales',         'EMPUJE',   'weight', 'Hombros',      'Mancuernas'),
(27,  'Press Francés (mancuernas)',    'EMPUJE',   'weight', 'Tríceps',      'Mancuernas'),
(28,  'Extensión Trícep (mancuerna)', 'EMPUJE',   'weight', 'Tríceps',      'Mancuerna'),

-- ── EMPUJE — Máquinas ─────────────────────────────────────────
(29,  'Press Pecho (máquina)',         'EMPUJE',   'weight', 'Pecho',        'Máquina'),
(30,  'Peck Deck / Aperturas (máq.)', 'EMPUJE',   'weight', 'Pecho',        'Máquina'),
(31,  'Press Hombros (máquina)',       'EMPUJE',   'weight', 'Hombros',      'Máquina'),
(32,  'Elevaciones Laterales (máq.)', 'EMPUJE',   'weight', 'Hombros',      'Máquina'),
(33,  'Extensión Trícep (polea)',      'EMPUJE',   'weight', 'Tríceps',      'Polea'),
(34,  'Pushdown Cuerda (polea)',       'EMPUJE',   'weight', 'Tríceps',      'Polea'),
(35,  'Pushdown Barra (polea)',        'EMPUJE',   'weight', 'Tríceps',      'Polea'),
(36,  'Cruces Polea Alta',             'EMPUJE',   'weight', 'Pecho',        'Polea'),
(37,  'Cruces Polea Baja',             'EMPUJE',   'weight', 'Pecho',        'Polea'),
(38,  'Press de Hombros (Smith)',      'EMPUJE',   'weight', 'Hombros',      'Smith'),
(39,  'Fondos en Banco',               'EMPUJE',   'weight', 'Tríceps',      'Peso corporal'),

-- ── TRACCIÓN — Barra ──────────────────────────────────────────
(40,  'Remo con Barra (pronado)',       'TRACCION', 'weight', 'Espalda',      'Barra'),
(41,  'Remo con Barra (supino)',        'TRACCION', 'weight', 'Espalda',      'Barra'),
(42,  'Remo Pendlay',                  'TRACCION', 'weight', 'Espalda',      'Barra'),
(43,  'Curl Barra EZ',                 'TRACCION', 'weight', 'Bíceps',       'Barra EZ'),
(44,  'Curl Barra Recta',              'TRACCION', 'weight', 'Bíceps',       'Barra'),
(45,  'Encogimientos (barra)',         'TRACCION', 'weight', 'Trapecios',    'Barra'),

-- ── TRACCIÓN — Mancuernas ─────────────────────────────────────
(46,  'Remo Mancuerna (1 brazo)',      'TRACCION', 'weight', 'Espalda',      'Mancuerna'),
(47,  'Curl Mancuerna Alterno',        'TRACCION', 'weight', 'Bíceps',       'Mancuernas'),
(48,  'Curl Martillo',                 'TRACCION', 'weight', 'Bíceps',       'Mancuernas'),
(49,  'Curl Concentrado',              'TRACCION', 'weight', 'Bíceps',       'Mancuerna'),
(50,  'Curl Inclinado (mancuernas)',   'TRACCION', 'weight', 'Bíceps',       'Mancuernas'),
(51,  'Encogimientos (mancuernas)',    'TRACCION', 'weight', 'Trapecios',    'Mancuernas'),
(52,  'Pullover (mancuerna)',          'TRACCION', 'weight', 'Espalda',      'Mancuerna'),

-- ── TRACCIÓN — Máquinas ───────────────────────────────────────
(53,  'Jalón al Pecho Pronado',        'TRACCION', 'weight', 'Espalda',      'Polea'),
(54,  'Jalón al Pecho Supino',         'TRACCION', 'weight', 'Espalda',      'Polea'),
(55,  'Jalón con Cuerda (polea)',      'TRACCION', 'weight', 'Espalda',      'Polea'),
(56,  'Remo Polea Baja',               'TRACCION', 'weight', 'Espalda',      'Polea'),
(57,  'Remo Máquina (seated)',         'TRACCION', 'weight', 'Espalda',      'Máquina'),
(58,  'Pullover Máquina',              'TRACCION', 'weight', 'Espalda',      'Máquina'),
(59,  'Face Pull (polea)',             'TRACCION', 'weight', 'Hombros post.','Polea'),
(60,  'Curl Bícep (máquina)',          'TRACCION', 'weight', 'Bíceps',       'Máquina'),
(61,  'Remo Australiano',              'TRACCION', 'weight', 'Espalda',      'Peso corporal'),
(62,  'Jalón Polea al Pecho (Smith)', 'TRACCION', 'weight', 'Espalda',      'Smith'),

-- ── PIERNA — Barra ────────────────────────────────────────────
(63,  'Sentadilla Frontal (barra)',    'PIERNA',   'weight', 'Cuádriceps',   'Barra'),
(64,  'Sentadilla Hack (barra)',       'PIERNA',   'weight', 'Cuádriceps',   'Barra'),
(65,  'Peso Muerto Rumano (barra)',    'PIERNA',   'weight', 'Isquiotibiales','Barra'),
(66,  'Peso Muerto Sumo (barra)',      'PIERNA',   'weight', 'Isquiotibiales','Barra'),
(67,  'Buenos Días (barra)',           'PIERNA',   'weight', 'Isquiotibiales','Barra'),
(68,  'Hip Thrust (barra)',            'PIERNA',   'weight', 'Glúteos',      'Barra'),
(69,  'Estocadas (barra)',             'PIERNA',   'weight', 'Cuádriceps',   'Barra'),

-- ── PIERNA — Mancuernas ───────────────────────────────────────
(70,  'Sentadilla Goblet',             'PIERNA',   'weight', 'Cuádriceps',   'Mancuerna'),
(71,  'Estocadas (mancuernas)',        'PIERNA',   'weight', 'Cuádriceps',   'Mancuernas'),
(72,  'Estocadas Búlgaras',            'PIERNA',   'weight', 'Cuádriceps',   'Mancuernas'),
(73,  'Hip Thrust (mancuerna)',        'PIERNA',   'weight', 'Glúteos',      'Mancuerna'),
(74,  'Peso Muerto (mancuernas)',      'PIERNA',   'weight', 'Isquiotibiales','Mancuernas'),
(75,  'Elevación de Pantorrillas (mancuernas)', 'PIERNA', 'weight', 'Gemelos', 'Mancuernas'),

-- ── PIERNA — Máquinas ─────────────────────────────────────────
(76,  'Prensa de Pierna',              'PIERNA',   'weight', 'Cuádriceps',   'Máquina'),
(77,  'Extensión de Cuádriceps',       'PIERNA',   'weight', 'Cuádriceps',   'Máquina'),
(78,  'Curl Femoral Sentado',          'PIERNA',   'weight', 'Isquiotibiales','Máquina'),
(79,  'Curl Femoral Acostado',         'PIERNA',   'weight', 'Isquiotibiales','Máquina'),
(80,  'Hack Squat (máquina)',          'PIERNA',   'weight', 'Cuádriceps',   'Máquina'),
(81,  'Abductor (máquina)',            'PIERNA',   'weight', 'Abductores',   'Máquina'),
(82,  'Aductor (máquina)',             'PIERNA',   'weight', 'Aductores',    'Máquina'),
(83,  'Glute Kickback (máquina)',      'PIERNA',   'weight', 'Glúteos',      'Máquina'),
(84,  'Elevación de Pantorrillas (máq. de pie)',   'PIERNA', 'weight', 'Gemelos',  'Máquina'),
(85,  'Elevación de Pantorrillas (máq. sentado)',  'PIERNA', 'weight', 'Sóleo',    'Máquina'),
(86,  'Prensa de Pantorrillas',        'PIERNA',   'weight', 'Gemelos',      'Máquina'),
(87,  'Hip Thrust (máquina)',          'PIERNA',   'weight', 'Glúteos',      'Máquina'),

-- ── PIERNA — Peso corporal ────────────────────────────────────
(88,  'Estocadas Búlgaras (peso corp.)', 'PIERNA', 'reps',  'Cuádriceps',   'Peso corporal'),
(89,  'Pistol Squat',                  'PIERNA',   'reps',  'Cuádriceps',   'Peso corporal'),
(90,  'Box Jump',                      'PIERNA',   'reps',  'Cuádriceps',   'Peso corporal'),
(91,  'Step Up (peso corp.)',          'PIERNA',   'reps',  'Glúteos',      'Peso corporal'),
(92,  'Elevación de Pantorrillas (pie)', 'PIERNA', 'reps',  'Gemelos',      'Peso corporal'),

-- ── SKILL / Core ──────────────────────────────────────────────
(93,  'Back Lever Hold',               'SKILL',    'time',  'Espalda',      'Anillas / Barra'),
(94,  'Planche Hold',                  'SKILL',    'time',  'Hombros',      'Suelo / Anillas'),
(95,  'Human Flag Hold',               'SKILL',    'time',  'Core lateral', 'Barra'),
(96,  'Dragon Flag',                   'SKILL',    'reps',  'Core',         'Banco'),
(97,  'Ab Wheel',                      'SKILL',    'reps',  'Core',         'Rueda'),
(98,  'Handstand Push Up',             'SKILL',    'reps',  'Hombros',      'Pared'),
(99,  'Ring Dip',                      'SKILL',    'reps',  'Pecho / Tríceps', 'Anillas'),
(100, 'Ring Pull Up',                  'SKILL',    'reps',  'Espalda',      'Anillas'),
(101, 'Plancha (isométrico)',          'SKILL',    'time',  'Core',         'Peso corporal'),
(102, 'Hollow Body Hold',              'SKILL',    'time',  'Core',         'Peso corporal'),
(103, 'Arch Body Hold',                'SKILL',    'time',  'Extensores',   'Peso corporal'),
(104, 'Toes to Bar',                   'SKILL',    'reps',  'Core',         'Barra'),
(105, 'Knees to Elbows',               'SKILL',    'reps',  'Core',         'Barra'),
(106, 'Pallof Press (polea)',          'SKILL',    'weight','Core',         'Polea')

ON CONFLICT (id) DO NOTHING;
