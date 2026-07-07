import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/form';
import { Accent, Danger, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useCopyRoutine,
  useDeleteRoutine,
  useRemoveRoutineExercise,
  useRoutine,
  useUpdateRoutine,
  useUpdateRoutineExercise,
} from '@/hooks/use-routines';
import { useAuth } from '@/lib/auth-context';
import type { RoutineExercise } from '@/lib/types';

type NumericField = 'sets' | 'reps' | 'weight_kg';

function ExerciseRow({
  item,
  editable,
  routineId,
}: {
  item: RoutineExercise;
  editable: boolean;
  routineId: string;
}) {
  const theme = useTheme();
  const updateExercise = useUpdateRoutineExercise(routineId);
  const removeExercise = useRemoveRoutineExercise(routineId);
  const [values, setValues] = useState({
    sets: String(item.sets),
    reps: String(item.reps),
    weight_kg: item.weight_kg != null ? String(item.weight_kg) : '',
  });

  function commit(field: NumericField) {
    const raw = values[field].replace(',', '.');
    const num = raw === '' ? null : Number(raw);
    if (field !== 'weight_kg' && (num == null || !Number.isInteger(num) || num < 1)) {
      setValues((v) => ({ ...v, [field]: String(item[field]) }));
      return;
    }
    if (num != null && (Number.isNaN(num) || num < 0)) {
      setValues((v) => ({ ...v, [field]: '' }));
      return;
    }
    updateExercise.mutate(
      { id: item.id, changes: { [field]: num } },
      { onError: (e) => Alert.alert('No se pudo guardar', e.message) }
    );
  }

  function confirmRemove() {
    Alert.alert('Quitar ejercicio', `¿Quitar "${item.exercise?.name}" de la rutina?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () =>
          removeExercise.mutate(item.id, {
            onError: (e) => Alert.alert('Error', e.message),
          }),
      },
    ]);
  }

  const inputStyle = [
    styles.numInput,
    { backgroundColor: theme.backgroundSelected, color: theme.text },
  ];

  return (
    <ThemedView type="backgroundElement" style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <Pressable
          style={styles.exerciseName}
          onPress={() => router.push(`/exercise/${item.exercise_id}`)}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {item.exercise?.name ?? item.exercise_id}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Ver tutorial →
          </ThemedText>
        </Pressable>
        {editable && (
          <Pressable onPress={confirmRemove} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={Danger} />
          </Pressable>
        )}
      </View>

      {editable ? (
        <View style={styles.numRow}>
          {(
            [
              ['sets', 'Series'],
              ['reps', 'Reps'],
              ['weight_kg', 'Peso (kg)'],
            ] as [NumericField, string][]
          ).map(([field, label]) => (
            <View key={field} style={styles.numField}>
              <ThemedText type="small" themeColor="textSecondary">
                {label}
              </ThemedText>
              <TextInput
                style={inputStyle}
                keyboardType="numeric"
                value={values[field]}
                onChangeText={(text) => setValues((v) => ({ ...v, [field]: text }))}
                onEndEditing={() => commit(field)}
              />
            </View>
          ))}
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {item.sets} series × {item.reps} reps
          {item.weight_kg != null ? ` @ ${item.weight_kg} kg` : ''}
        </ThemedText>
      )}
    </ThemedView>
  );
}

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data: routine, isLoading, error } = useRoutine(id);
  const updateRoutine = useUpdateRoutine(id);
  const deleteRoutine = useDeleteRoutine();
  const copyRoutine = useCopyRoutine();

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error || !routine) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText themeColor="textSecondary">No se encontró la rutina.</ThemedText>
      </ThemedView>
    );
  }

  const isOwner = routine.owner_id === session?.user.id;

  function confirmDelete() {
    Alert.alert('Eliminar rutina', 'Esta acción no se puede deshacer. ¿Eliminar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          deleteRoutine.mutate(id, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert('Error', e.message),
          }),
      },
    ]);
  }

  function handleCopy() {
    copyRoutine.mutate(routine!, {
      onSuccess: (copy) => {
        Alert.alert('Rutina guardada', 'Se creó una copia en "Mis rutinas".');
        router.replace(`/routine/${copy.id}`);
      },
      onError: (e) => Alert.alert('No se pudo copiar', e.message),
    });
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: routine.name }} />
      <FlatList
        data={routine.routine_exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            {routine.description ? (
              <ThemedText type="small" themeColor="textSecondary">
                {routine.description}
              </ThemedText>
            ) : null}
            {isOwner && (
              <View style={styles.publicRow}>
                <ThemedText type="small">Rutina pública</ThemedText>
                <Switch
                  value={routine.is_public}
                  trackColor={{ true: Accent }}
                  onValueChange={(value) =>
                    updateRoutine.mutate(
                      { is_public: value },
                      { onError: (e) => Alert.alert('Error', e.message) }
                    )
                  }
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <ExerciseRow item={item} editable={isOwner} routineId={id} />}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Esta rutina aún no tiene ejercicios.
          </ThemedText>
        }
        ListFooterComponent={
          <View style={styles.actions}>
            {isOwner ? (
              <>
                <AppButton
                  title="+ Agregar ejercicio"
                  onPress={() => router.push(`/routine/${id}/add`)}
                />
                <AppButton
                  title="Compartir con un amigo"
                  variant="secondary"
                  onPress={() => router.push(`/routine/${id}/share`)}
                />
                <AppButton title="Eliminar rutina" variant="danger" onPress={confirmDelete} />
              </>
            ) : (
              <AppButton
                title="Guardar copia en mis rutinas"
                loading={copyRoutine.isPending}
                onPress={handleCopy}
              />
            )}
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  publicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  exerciseName: {
    flex: 1,
    gap: Spacing.half,
  },
  numRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  numField: {
    flex: 1,
    gap: Spacing.half,
  },
  numInput: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 16,
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    marginVertical: Spacing.four,
  },
  actions: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
});
