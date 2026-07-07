import { useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/form';
import { Spacing } from '@/constants/theme';
import { useFriends } from '@/hooks/use-friends';
import { useRoutineShares, useShareRoutine } from '@/hooks/use-routines';

export default function ShareRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { friends } = useFriends();
  const { data: sharedWith } = useRoutineShares(id);
  const shareRoutine = useShareRoutine(id);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {friends.length === 0 && (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Aún no tienes amigos en la app. Agrégalos en la pestaña Amigos para poder compartir
            tus rutinas.
          </ThemedText>
        )}
        {friends.map((friend) => {
          const alreadyShared = (sharedWith ?? []).includes(friend.id);
          return (
            <ThemedView key={friend.id} type="backgroundElement" style={styles.row}>
              <View style={styles.info}>
                <ThemedText type="smallBold">@{friend.username}</ThemedText>
                {friend.display_name ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {friend.display_name}
                  </ThemedText>
                ) : null}
              </View>
              {alreadyShared ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Compartida ✓
                </ThemedText>
              ) : (
                <AppButton
                  title="Compartir"
                  style={styles.smallButton}
                  onPress={() =>
                    shareRoutine.mutate(friend.id, {
                      onError: (e) => Alert.alert('No se pudo compartir', e.message),
                    })
                  }
                />
              )}
            </ThemedView>
          );
        })}
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
  empty: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
  smallButton: {
    alignSelf: 'auto',
    minHeight: 0,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
