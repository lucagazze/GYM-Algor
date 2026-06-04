import { Exercise } from '../utils/workoutService';

export const MUSCLE_ORDER = [
  'Pecho', 'Hombros', 'Tríceps', 'Bíceps',
  'Espalda', 'Trapecios',
  'Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Gemelos', 'Sóleo',
  'Core', 'Abdominales',
  'Otros',
];

export const MUSCLE_COLOR: Record<string, string> = {
  'Pecho':          '#FF2A5F',
  'Hombros':        '#FF6B35',
  'Tríceps':        '#FF2A5F',
  'Bíceps':         '#00E5FF',
  'Espalda':        '#00E5FF',
  'Trapecios':      '#0EA5E9',
  'Cuádriceps':     '#A855F7',
  'Isquiotibiales': '#9333EA',
  'Glúteos':        '#C084FC',
  'Gemelos':        '#A855F7',
  'Sóleo':          '#A855F7',
  'Core':           '#EAB308',
  'Abdominales':    '#EAB308',
  'Otros':          '#71717A',
};

export function getMuscle(ex: Exercise): string {
  return ex.muscle_group?.trim() || 'Otros';
}

export function muscleChips(exercises: Exercise[]): string[] {
  const available = MUSCLE_ORDER.filter(m => exercises.some(e => getMuscle(e) === m));
  return ['TODOS', ...available];
}

export function filterByMuscle(exercises: Exercise[], muscle: string): Exercise[] {
  if (muscle === 'TODOS') return exercises;
  return exercises.filter(e => getMuscle(e) === muscle);
}
