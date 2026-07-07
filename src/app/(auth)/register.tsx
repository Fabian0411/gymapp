import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton, AppInput } from '@/components/ui/form';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const cleanUsername = username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(cleanUsername)) {
      Alert.alert(
        'Username inválido',
        'Usa de 3 a 20 caracteres: solo letras minúsculas, números y guion bajo.'
      );
      return;
    }
    if (password.length < 8) {
      Alert.alert('Contraseña muy corta', 'Usa al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Las contraseñas no coinciden', 'Revisa la confirmación.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: cleanUsername } },
    });
    setLoading(false);

    if (error) {
      Alert.alert('No se pudo crear la cuenta', error.message);
      return;
    }
    if (!data.session) {
      // Confirmación de email activada en Supabase (recomendado)
      Alert.alert(
        'Confirma tu correo',
        'Te enviamos un enlace de confirmación. Ábrelo y luego inicia sesión.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.form}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ThemedText type="subtitle" style={styles.title}>
            Crea tu cuenta
          </ThemedText>

          <AppInput
            placeholder="Username (ej. juan_fit)"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
          <AppInput
            placeholder="Correo electrónico"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <AppInput
            placeholder="Contraseña (mínimo 8 caracteres)"
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
          />
          <AppInput
            placeholder="Confirmar contraseña"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
          <AppButton title="Registrarme" loading={loading} onPress={handleRegister} />

          <Link href="/login" asChild>
            <ThemedText type="linkPrimary" style={styles.title}>
              Ya tengo cuenta
            </ThemedText>
          </Link>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
});
