export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type Exercise = {
  id: string;
  name: string;
  category: string | null;
  equipment: string | null;
  level: string | null;
  mechanic: string | null;
  force: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  instructions: string[];
  images: string[];
};

export type Routine = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type RoutineExercise = {
  id: string;
  routine_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  reps: number;
  weight_kg: number | null;
  rest_seconds: number | null;
  notes: string | null;
  exercise?: Exercise;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  requester?: Profile;
  addressee?: Profile;
};

export type RoutineShare = {
  routine_id: string;
  shared_with: string;
  shared_by: string;
  created_at: string;
};

/** Las imágenes del catálogo viven en el repo de free-exercise-db. */
export function exerciseImageUrl(relativePath: string): string {
  return `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${relativePath}`;
}

export const MUSCLE_GROUPS = [
  'abdominals',
  'biceps',
  'calves',
  'chest',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'lower back',
  'middle back',
  'neck',
  'quadriceps',
  'shoulders',
  'traps',
  'triceps',
] as const;

export const MUSCLE_LABELS_ES: Record<string, string> = {
  abdominals: 'Abdominales',
  biceps: 'Bíceps',
  calves: 'Pantorrillas',
  chest: 'Pecho',
  forearms: 'Antebrazos',
  glutes: 'Glúteos',
  hamstrings: 'Femorales',
  lats: 'Dorsales',
  'lower back': 'Lumbares',
  'middle back': 'Espalda media',
  neck: 'Cuello',
  quadriceps: 'Cuádriceps',
  shoulders: 'Hombros',
  traps: 'Trapecios',
  triceps: 'Tríceps',
};
