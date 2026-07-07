import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton, AppInput } from '@/components/ui/form';
import { Accent, Spacing } from '@/constants/theme';
import { useCreateRoutine, useMyRoutines, useSharedRoutines } from '@/hooks/use-routines';
import type { Routine } from '@/lib/types';

function RoutineCard({ routine, subtitle }: { routine: Routine; subtitle?: string }) {
  return (
    <Pressable
      onPress={() => router.push(`/routine/${routine.id}`)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.cardTitle}>
            {routine.name}
          </ThemedText>
          {routine.is_public && <Ionicons name="earth" size={16} color={Accent} />}
        </View>
        {(subtitle ?? routine.description) ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {subtitle ?? routine.description}
          </ThemedText>
        ) : null}
      </ThemedView>
    </Pressable>
  );
}

export default function RoutinesScreen() {
  const [newName, setNewName] = useState('');
  const { data: routines, isLoading } = useMyRoutines();
  const { data: shared } = useSharedRoutines();
  const createRoutine = useCreateRoutine();

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    createRoutine.mutate(name, {
      onSuccess: (routine) => {
        setNewName('');
        router.push(`/routine/${routine.id}`);
      },
      onError: (error) => Alert.alert('No se pudo crear la rutina', error.message),
    });
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={routines ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.createRow}>
            <AppInput
              placeholder="Nombre de la nueva rutina..."
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={handleCreate}
              returnKeyType="done"
              style={styles.createInput}
            />
            <AppButton
              title="Crear"
              loading={createRoutine.isPending}
              onPress={handleCreate}
              style={styles.createButton}
            />
          </View>
        }
        renderItem={({ item }) => <RoutineCard routine={item} />}
        ListEmptyComponent={
          !isLoading ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Aún no tienes rutinas. Crea la primera arriba 👆
            </ThemedText>
          ) : null
        }
        ListFooterComponent={
          shared && shared.length > 0 ? (
            <View style={styles.sharedSection}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Compartidas conmigo
              </ThemedText>
              {shared.map((row) => (
                <RoutineCard
                  key={row.routine.id}
                  routine={row.routine}
                  subtitle={`Compartida por @${row.shared_by_profile?.username ?? '???'}`}
                />
              ))}
            </View>
          ) : null
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  createRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  createInput: {
    flex: 1,
  },
  createButton: {
    alignSelf: 'auto',
    paddingHorizontal: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
  sharedSection: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
});
