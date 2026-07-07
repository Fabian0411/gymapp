import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet } from 'react-native';

import { ExerciseListItem } from '@/components/exercise-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppInput } from '@/components/ui/form';
import { Spacing } from '@/constants/theme';
import { useExercises } from '@/hooks/use-exercises';
import { useAddExerciseToRoutine, useRoutine } from '@/hooks/use-routines';
import type { Exercise } from '@/lib/types';

export default function AddExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const { data: exercises, isLoading } = useExercises(null, search);
  const { data: routine } = useRoutine(id);
  const addExercise = useAddExerciseToRoutine(id);

  function handleAdd(exercise: Exercise) {
    const nextPosition =
      (routine?.routine_exercises.reduce((max, re) => Math.max(max, re.position), -1) ?? -1) + 1;
    addExercise.mutate(
      { exerciseId: exercise.id, position: nextPosition },
      {
        onSuccess: () => router.back(),
        onError: (e) => Alert.alert('No se pudo agregar', e.message),
      }
    );
  }

  return (
    <ThemedView style={styles.container}>
      <AppInput
        placeholder="Buscar ejercicio..."
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        autoFocus
        style={styles.search}
      />
      {isLoading && <ActivityIndicator style={styles.loader} />}
      <FlatList
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ExerciseListItem exercise={item} onPress={() => handleAdd(item)} />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Sin resultados.
            </ThemedText>
          ) : null
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Spacing.three,
  },
  search: {
    marginHorizontal: Spacing.three,
  },
  loader: {
    marginTop: Spacing.three,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
});
