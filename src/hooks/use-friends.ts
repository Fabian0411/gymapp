import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Friendship, Profile } from '@/lib/types';

type FriendshipRow = Friendship & {
  requester: Profile;
  addressee: Profile;
};

const FRIENDSHIP_SELECT =
  '*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)';

/** Todas mis filas de amistad (aceptadas y pendientes, en ambas direcciones). */
export function useFriendships() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['friendships'],
    enabled: !!session,
    queryFn: async (): Promise<FriendshipRow[]> => {
      const { data, error } = await supabase
        .from('friendships')
        .select(FRIENDSHIP_SELECT)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as FriendshipRow[];
    },
  });
}

/** Perfiles de mis amigos aceptados. */
export function useFriends() {
  const { session } = useAuth();
  const query = useFriendships();
  const userId = session?.user.id;
  const friends: Profile[] = (query.data ?? [])
    .filter((f) => f.status === 'accepted')
    .map((f) => (f.requester_id === userId ? f.addressee : f.requester));
  return { ...query, friends };
}

export function useSearchProfiles(term: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['profile-search', term],
    enabled: !!session && term.trim().length >= 2,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${term.trim().toLowerCase()}%`)
        .neq('id', session!.user.id)
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidateFriendships() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['friendships'] });
}

export function useSendFriendRequest() {
  const { session } = useAuth();
  const invalidate = useInvalidateFriendships();
  return useMutation({
    mutationFn: async (addresseeId: string) => {
      const { error } = await supabase
        .from('friendships')
        .insert({ requester_id: session!.user.id, addressee_id: addresseeId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useAcceptFriendRequest() {
  const invalidate = useInvalidateFriendships();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Rechazar solicitud o eliminar amistad (misma operación: borrar la fila). */
export function useRemoveFriendship() {
  const invalidate = useInvalidateFriendships();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
