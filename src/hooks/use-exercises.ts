import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Exercise } from '@/lib/types';

export function useExercises(muscle: string | null, search: string) {
  return useQuery({
    queryKey: ['exercises', muscle, search],
    queryFn: async (): Promise<Exercise[]> => {
      let query = supabase.from('exercises').select('*').order('name').limit(100);
      if (muscle) {
        query = query.contains('primary_muscles', [muscle]);
      }
      if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useExercise(id: string) {
  return useQuery({
    queryKey: ['exercise', id],
    queryFn: async (): Promise<Exercise> => {
      const { data, error } = await supabase.from('exercises').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
  });
}
