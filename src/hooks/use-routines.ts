import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Routine, RoutineExercise } from '@/lib/types';

export type RoutineWithExercises = Routine & {
  routine_exercises: RoutineExercise[];
};

export type SharedRoutineRow = {
  created_at: string;
  routine: Routine;
  shared_by_profile: { username: string } | null;
};

export function useMyRoutines() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['routines', 'mine'],
    enabled: !!session,
    queryFn: async (): Promise<Routine[]> => {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('owner_id', session!.user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSharedRoutines() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['routines', 'shared'],
    enabled: !!session,
    queryFn: async (): Promise<SharedRoutineRow[]> => {
      const { data, error } = await supabase
        .from('routine_shares')
        .select(
          'created_at, routine:routines(*), shared_by_profile:profiles!routine_shares_shared_by_fkey(username)'
        )
        .eq('shared_with', session!.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as SharedRoutineRow[];
    },
  });
}

export function useRoutine(id: string) {
  return useQuery({
    queryKey: ['routine', id],
    queryFn: async (): Promise<RoutineWithExercises> => {
      const { data, error } = await supabase
        .from('routines')
        .select('*, routine_exercises(*, exercise:exercises(*))')
        .eq('id', id)
        .order('position', { referencedTable: 'routine_exercises' })
        .single();
      if (error) throw error;
      return data as unknown as RoutineWithExercises;
    },
  });
}

function useInvalidateRoutines() {
  const queryClient = useQueryClient();
  return (routineId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['routines'] });
    if (routineId) {
      queryClient.invalidateQueries({ queryKey: ['routine', routineId] });
    }
  };
}

export function useCreateRoutine() {
  const { session } = useAuth();
  const invalidate = useInvalidateRoutines();
  return useMutation({
    mutationFn: async (name: string): Promise<Routine> => {
      const { data, error } = await supabase
        .from('routines')
        .insert({ name, owner_id: session!.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(),
  });
}

export function useUpdateRoutine(routineId: string) {
  const invalidate = useInvalidateRoutines();
  return useMutation({
    mutationFn: async (changes: Partial<Pick<Routine, 'name' | 'description' | 'is_public'>>) => {
      const { error } = await supabase.from('routines').update(changes).eq('id', routineId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(routineId),
  });
}

export function useDeleteRoutine() {
  const invalidate = useInvalidateRoutines();
  return useMutation({
    mutationFn: async (routineId: string) => {
      const { error } = await supabase.from('routines').delete().eq('id', routineId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

export function useAddExerciseToRoutine(routineId: string) {
  const invalidate = useInvalidateRoutines();
  return useMutation({
    mutationFn: async ({ exerciseId, position }: { exerciseId: string; position: number }) => {
      const { error } = await supabase
        .from('routine_exercises')
        .insert({ routine_id: routineId, exercise_id: exerciseId, position });
      if (error) throw error;
    },
    onSuccess: () => invalidate(routineId),
  });
}

export function useUpdateRoutineExercise(routineId: string) {
  const invalidate = useInvalidateRoutines();
  return useMutation({
    mutationFn: async ({
      id,
      changes,
    }: {
      id: string;
      changes: Partial<Pick<RoutineExercise, 'sets' | 'reps' | 'weight_kg' | 'rest_seconds'>>;
    }) => {
      const { error } = await supabase.from('routine_exercises').update(changes).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(routineId),
  });
}

export function useRemoveRoutineExercise(routineId: string) {
  const invalidate = useInvalidateRoutines();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('routine_exercises').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(routineId),
  });
}

/** IDs de usuarios con los que ya está compartida una rutina mía. */
export function useRoutineShares(routineId: string) {
  return useQuery({
    queryKey: ['routine-shares', routineId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('routine_shares')
        .select('shared_with')
        .eq('routine_id', routineId);
      if (error) throw error;
      return data.map((row) => row.shared_with);
    },
  });
}

export function useShareRoutine(routineId: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendId: string) => {
      const { error } = await supabase.from('routine_shares').insert({
        routine_id: routineId,
        shared_with: friendId,
        shared_by: session!.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['routine-shares', routineId] }),
  });
}

/** Guarda una copia propia de una rutina pública o compartida contigo. */
export function useCopyRoutine() {
  const { session } = useAuth();
  const invalidate = useInvalidateRoutines();
  return useMutation({
    mutationFn: async (source: RoutineWithExercises): Promise<Routine> => {
      const { data: copy, error } = await supabase
        .from('routines')
        .insert({
          name: `${source.name} (copia)`,
          description: source.description,
          owner_id: session!.user.id,
        })
        .select()
        .single();
      if (error) throw error;

      if (source.routine_exercises.length > 0) {
        const { error: exError } = await supabase.from('routine_exercises').insert(
          source.routine_exercises.map((re) => ({
            routine_id: copy.id,
            exercise_id: re.exercise_id,
            position: re.position,
            sets: re.sets,
            reps: re.reps,
            weight_kg: re.weight_kg,
            rest_seconds: re.rest_seconds,
            notes: re.notes,
          }))
        );
        if (exError) throw exError;
      }
      return copy;
    },
    onSuccess: () => invalidate(),
  });
}
