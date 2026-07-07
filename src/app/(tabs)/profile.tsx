import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton, AppInput } from '@/components/ui/form';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null, bio: bio.trim() || null })
      .eq('id', session.user.id);
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo guardar', error.message);
      return;
    }
    await refreshProfile();
    Alert.alert('Perfil actualizado');
  }

  async function handlePickAvatar() {
    if (!session) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setUploading(true);
    try {
      const bytes = Uint8Array.from(atob(result.assets[0].base64), (c) => c.charCodeAt(0));
      const path = `${session.user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, bytes.buffer as ArrayBuffer, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // Query param para que la caché de imágenes detecte el cambio
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', session.user.id);
      if (updateError) throw updateError;
      await refreshProfile();
    } catch (e) {
      Alert.alert('No se pudo subir la foto', e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={handlePickAvatar} style={styles.avatarWrapper}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <ThemedView type="backgroundElement" style={[styles.avatar, styles.avatarEmpty]}>
              <ThemedText type="subtitle">
                {(profile?.username ?? '?').charAt(0).toUpperCase()}
              </ThemedText>
            </ThemedView>
          )}
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            {uploading ? 'Subiendo...' : 'Toca para cambiar la foto'}
          </ThemedText>
        </Pressable>

        <ThemedText type="subtitle" style={styles.centered}>
          @{profile?.username ?? '...'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          {session?.user.email}
        </ThemedText>

        <AppInput
          placeholder="Nombre para mostrar"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <AppInput
          placeholder="Bio (¿cuál es tu meta en el gym?)"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          style={styles.bioInput}
        />
        <AppButton title="Guardar cambios" loading={saving} onPress={handleSave} />
        <AppButton title="Cerrar sesión" variant="secondary" onPress={signOut} />
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
    gap: Spacing.three,
  },
  avatarWrapper: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  avatarEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
