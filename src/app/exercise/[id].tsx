import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useExercise } from '@/hooks/use-exercises';
import { exerciseImageUrl, MUSCLE_LABELS_ES } from '@/lib/types';

const LEVEL_ES: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  expert: 'Avanzado',
};

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: exercise, isLoading } = useExercise(id);
  const { width } = useWindowDimensions();
  const imageSize = Math.min(width, 500);

  if (isLoading || !exercise) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const muscles = exercise.primary_muscles.map((m) => MUSCLE_LABELS_ES[m] ?? m).join(', ');

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: exercise.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Las 2 imágenes del dataset muestran posición inicial y final */}
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {exercise.images.map((img) => (
            <Image
              key={img}
              source={{ uri: exerciseImageUrl(img) }}
              style={{ width: imageSize, height: imageSize * 0.66 }}
              contentFit="contain"
            />
          ))}
        </ScrollView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.name}>
            {exercise.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {muscles}
            {exercise.equipment ? ` · ${exercise.equipment}` : ''}
            {exercise.level ? ` · ${LEVEL_ES[exercise.level] ?? exercise.level}` : ''}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Cómo se hace</ThemedText>
          {exercise.instructions.length === 0 && (
            <ThemedText themeColor="textSecondary">Sin instrucciones disponibles.</ThemedText>
          )}
          {exercise.instructions.map((step, i) => (
            <ThemedView key={i} style={styles.step}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {i + 1}.
              </ThemedText>
              <ThemedText type="small" style={styles.stepText}>
                {step}
              </ThemedText>
            </ThemedView>
          ))}
        </ThemedView>
      </ScrollView>
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
  content: {
    paddingBottom: Spacing.six,
  },
  section: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stepText: {
    flex: 1,
  },
});
