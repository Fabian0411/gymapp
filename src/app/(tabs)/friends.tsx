import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton, AppInput } from '@/components/ui/form';
import { Spacing } from '@/constants/theme';
import {
  useAcceptFriendRequest,
  useFriendships,
  useRemoveFriendship,
  useSearchProfiles,
  useSendFriendRequest,
} from '@/hooks/use-friends';
import { useAuth } from '@/lib/auth-context';
import type { Profile } from '@/lib/types';

function PersonRow({ profile, children }: { profile: Profile; children?: React.ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.personRow}>
      <View style={styles.personInfo}>
        <ThemedText type="smallBold">@{profile.username}</ThemedText>
        {profile.display_name ? (
          <ThemedText type="small" themeColor="textSecondary">
            {profile.display_name}
          </ThemedText>
        ) : null}
      </View>
      {children}
    </ThemedView>
  );
}

export default function FriendsScreen() {
  const [search, setSearch] = useState('');
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: friendships } = useFriendships();
  const { data: searchResults } = useSearchProfiles(search);
  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const removeFriendship = useRemoveFriendship();

  const incoming = (friendships ?? []).filter(
    (f) => f.status === 'pending' && f.addressee_id === userId
  );
  const accepted = (friendships ?? []).filter((f) => f.status === 'accepted');

  function relationWith(profileId: string) {
    return (friendships ?? []).find(
      (f) => f.requester_id === profileId || f.addressee_id === profileId
    );
  }

  const onError = (e: Error) => Alert.alert('Error', e.message);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppInput
          placeholder="Buscar por username..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {search.trim().length >= 2 &&
          (searchResults ?? []).map((profile) => {
            const relation = relationWith(profile.id);
            return (
              <PersonRow key={profile.id} profile={profile}>
                {!relation && (
                  <AppButton
                    title="Agregar"
                    style={styles.smallButton}
                    onPress={() =>
                      sendRequest.mutate(profile.id, {
                        onError,
                        onSuccess: () => setSearch(''),
                      })
                    }
                  />
                )}
                {relation?.status === 'pending' && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Pendiente
                  </ThemedText>
                )}
                {relation?.status === 'accepted' && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Ya son amigos
                  </ThemedText>
                )}
              </PersonRow>
            );
          })}

        {incoming.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Solicitudes recibidas
            </ThemedText>
            {incoming.map((f) => (
              <PersonRow key={f.id} profile={f.requester}>
                <View style={styles.buttonPair}>
                  <AppButton
                    title="Aceptar"
                    style={styles.smallButton}
                    onPress={() => acceptRequest.mutate(f.id, { onError })}
                  />
                  <AppButton
                    title="Rechazar"
                    variant="secondary"
                    style={styles.smallButton}
                    onPress={() => removeFriendship.mutate(f.id, { onError })}
                  />
                </View>
              </PersonRow>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Mis amigos ({accepted.length})
          </ThemedText>
          {accepted.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              Busca a tus amigos por username para agregarlos.
            </ThemedText>
          )}
          {accepted.map((f) => {
            const friend = f.requester_id === userId ? f.addressee : f.requester;
            return (
              <PersonRow key={f.id} profile={friend}>
                <AppButton
                  title="Eliminar"
                  variant="secondary"
                  style={styles.smallButton}
                  onPress={() =>
                    Alert.alert('Eliminar amigo', `¿Eliminar a @${friend.username}?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: () => removeFriendship.mutate(f.id, { onError }),
                      },
                    ])
                  }
                />
              </PersonRow>
            );
          })}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  section: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  personInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  buttonPair: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  smallButton: {
    alignSelf: 'auto',
    minHeight: 0,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
