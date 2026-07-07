import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { exerciseImageUrl, MUSCLE_LABELS_ES, type Exercise } from '@/lib/types';

type Props = {
  exercise: Exercise;
  onPress: () => void;
};

export function ExerciseListItem({ exercise, onPress }: Props) {
  const muscles = exercise.primary_muscles
    .map((m) => MUSCLE_LABELS_ES[m] ?? m)
    .join(', ');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
      <ThemedView type="backgroundElement" style={styles.row}>
        {exercise.images[0] ? (
          <Image
            source={{ uri: exerciseImageUrl(exercise.images[0]) }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <ThemedView type="backgroundSelected" style={styles.thumbnail} />
        )}
        <ThemedView type="backgroundElement" style={styles.info}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {exercise.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {muscles}
            {exercise.equipment ? ` · ${exercise.equipment}` : ''}
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 72,
    height: 72,
  },
  info: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
});
