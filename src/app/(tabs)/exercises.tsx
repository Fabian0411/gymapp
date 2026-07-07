import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ExerciseListItem } from '@/components/exercise-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppInput } from '@/components/ui/form';
import { Accent, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useExercises } from '@/hooks/use-exercises';
import { MUSCLE_GROUPS, MUSCLE_LABELS_ES } from '@/lib/types';

export default function ExercisesScreen() {
  const [muscle, setMuscle] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const theme = useTheme();
  const { data: exercises, isLoading, error } = useExercises(muscle, search);

  return (
    <ThemedView style={styles.container}>
      <AppInput
        placeholder="Buscar ejercicio..."
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        style={styles.search}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipContent}>
        {MUSCLE_GROUPS.map((m) => {
          const active = muscle === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMuscle(active ? null : m)}
              style={[
                styles.chip,
                { backgroundColor: active ? Accent : theme.backgroundElement },
              ]}>
              <ThemedText type="small" style={active ? styles.chipTextActive : undefined}>
                {MUSCLE_LABELS_ES[m]}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading && <ActivityIndicator style={styles.loader} />}
      {error && (
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          No se pudo cargar el catálogo. ¿Ya ejecutaste el esquema SQL y el script de importación
          de ejercicios? (ver README)
        </ThemedText>
      )}

      <FlatList
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ExerciseListItem exercise={item} onPress={() => router.push(`/exercise/${item.id}`)} />
        )}
        ListEmptyComponent={
          !isLoading && !error ? (
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
  chipRow: {
    flexGrow: 0,
    marginTop: Spacing.two,
  },
  chipContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  loader: {
    marginTop: Spacing.four,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
});
