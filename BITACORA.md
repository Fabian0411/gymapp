# Bitácora de GymApp

> Contexto del proyecto para retomar el trabajo sin re-explorar el código.
> **Mantener actualizada**: al agregar/mover archivos o tomar decisiones, actualizar aquí.
> Última actualización: 2026-07-07 (Fase 1 codificada y commiteada).

## Qué es

Red social de gimnasio: rutinas con tutoriales de ejercicios, amigos, compartir rutinas.
Usuario: desarrollador con experiencia intermedia, habla español, presupuesto mínimo.
Plan maestro completo en `C:\Users\Nan\.claude\plans\tengo-planeado-crear-una-streamed-ember.md`.

**Stack:** Expo SDK 57 + TypeScript + Expo Router (src/app = rutas) · Supabase free tier
(auth + Postgres con RLS + storage) · TanStack Query · catálogo de ejercicios free-exercise-db.

## Estado actual

- ✅ Fase 1 (MVP) codificada: auth, catálogo, rutinas, amigos, compartir, perfil. `tsc` y lint pasan.
- ⏳ **Bloqueado en**: el usuario aún NO configura Supabase (crear proyecto, correr SQL, `.env`, importar ejercicios — pasos en README.md). La app no se ha probado end-to-end.
- Pendiente: Fase 2 (seguimiento de progreso + feed/historias/logros), Fase 3 (dietas/macros), Fase 4 (tiendas), Fase 5 (monetización).

## Mapa de archivos

### Raíz
| Archivo | Qué es |
|---|---|
| `.env.example` | Plantilla de claves de Supabase. El `.env` real está en .gitignore, NUNCA se commitea. |
| `app.json` | Config de Expo (nombre, iconos, splash, plugins). |
| `AGENTS.md` / `CLAUDE.md` | Instrucciones para agentes IA (CLAUDE.md importa AGENTS.md y esta bitácora). |
| `eslint.config.js` | Config de ESLint generada por `npx expo lint`. |
| `expo-env.d.ts` | Tipos autogenerados de Expo (gitignored, se regenera solo). |

### `supabase/migrations/001_schema.sql`
TODO el backend: tablas + políticas RLS + trigger de perfil + bucket de avatares.
Se ejecuta pegándolo en el SQL Editor de Supabase (una vez).
- Tablas: `profiles`, `exercises` (catálogo), `routines`, `routine_exercises`, `friendships`, `routine_shares`.
- Funciones RLS (security definer, evitan recursión): `are_friends()`, `is_routine_owner()`, `can_view_routine()`.
- Reglas clave: rutinas visibles si son propias/públicas/compartidas contigo; solo el dueño edita; compartir solo con amigos aceptados; trigger `handle_new_user` crea el perfil al registrarse (username viene en metadata del signUp).

### `scripts/`
| Archivo | Qué hace |
|---|---|
| `import-exercises.mjs` | Importa ~870 ejercicios de free-exercise-db a la tabla `exercises`. Se corre UNA vez con `node`, necesita `SUPABASE_SERVICE_ROLE_KEY` temporal en `.env` (borrarla después). |
| `reset-project.js` | De la plantilla Expo, no se usa. |

### `src/lib/` — núcleo
| Archivo | Qué hace |
|---|---|
| `supabase.ts` | Cliente Supabase. Sesión cifrada con expo-secure-store (localStorage en web). Lanza error claro si falta `.env`. Auto-refresh de token según AppState. |
| `auth-context.tsx` | `AuthProvider` + `useAuth()`: expone `session`, `profile` (fila de profiles del usuario), `loading`, `refreshProfile()`, `signOut()`. |
| `types.ts` | Tipos TS de todas las tablas + `exerciseImageUrl()` (imágenes vienen del repo GitHub de free-exercise-db) + `MUSCLE_GROUPS` y traducciones `MUSCLE_LABELS_ES`. |

### `src/hooks/` — datos (TanStack Query sobre Supabase)
| Archivo | Exporta |
|---|---|
| `use-exercises.ts` | `useExercises(muscle, search)` (filtro por músculo con `contains`, búsqueda con `ilike`), `useExercise(id)`. |
| `use-routines.ts` | `useMyRoutines`, `useSharedRoutines` (join con profiles del que compartió), `useRoutine(id)` (con ejercicios anidados), mutations: create/update/delete rutina, add/update/remove ejercicio, `useCopyRoutine` (copia rutina ajena), `useRoutineShares`, `useShareRoutine`. Invalidan queries `['routines']` y `['routine', id]`. |
| `use-friends.ts` | `useFriendships` (todas mis filas), `useFriends` (solo aceptados, devuelve perfiles), `useSearchProfiles(term)` (mín. 2 letras), mutations: send/accept/remove. Joins usan FK names: `friendships_requester_id_fkey` etc. |
| `use-theme.ts`, `use-color-scheme*.ts` | De la plantilla: tema claro/oscuro. |

### `src/app/` — pantallas (Expo Router: archivo = ruta)
| Ruta | Qué hace |
|---|---|
| `_layout.tsx` | Raíz: QueryClientProvider + AuthProvider + Stack con `Stack.Protected` — sin sesión solo se ve `(auth)`, con sesión el resto. Oculta splash cuando auth carga. |
| `(auth)/login.tsx`, `register.tsx` | Email+contraseña. El registro manda `username` en metadata (el trigger SQL crea el perfil) y avisa que confirme el correo. |
| `(tabs)/_layout.tsx` | 4 tabs con Ionicons: Rutinas (index), Ejercicios, Amigos, Perfil. |
| `(tabs)/index.tsx` | Mis rutinas: input para crear + lista de cards + sección "Compartidas conmigo". |
| `(tabs)/exercises.tsx` | Catálogo: búsqueda + chips de grupo muscular + lista → detalle. |
| `(tabs)/friends.tsx` | Buscar por username, solicitudes recibidas (aceptar/rechazar), lista de amigos (eliminar). |
| `(tabs)/profile.tsx` | Avatar (sube a bucket `avatars/{uid}/avatar.jpg` vía base64→bytes), display name, bio, cerrar sesión. |
| `exercise/[id].tsx` | Tutorial: imágenes inicio/fin (scroll horizontal) + instrucciones numeradas + músculos/equipo/nivel traducidos. |
| `routine/[id]/index.tsx` | Detalle de rutina. Dueño: editar series/reps/peso inline (commit en `onEndEditing`), quitar ejercicios, switch "pública", botones agregar/compartir/eliminar. No dueño: solo lectura + "Guardar copia". |
| `routine/[id]/add.tsx` | Modal: buscar ejercicio y agregarlo (position = max+1). |
| `routine/[id]/share.tsx` | Modal: lista de amigos con botón compartir (marca "Compartida ✓"). |

### `src/components/`
| Archivo | Qué es |
|---|---|
| `ui/form.tsx` | `AppInput` y `AppButton` (variants primary/secondary/danger, prop loading). Base de todos los formularios. |
| `exercise-list-item.tsx` | Card de ejercicio con thumbnail (usada en catálogo y en el picker de agregar). |
| `themed-text.tsx`, `themed-view.tsx` | De la plantilla: componentes con tema claro/oscuro. Usarlos siempre en vez de Text/View directos. |
| `ui/collapsible.tsx`, `external-link.tsx` | De la plantilla, sin uso actual. |

### `src/constants/theme.ts`
Colores light/dark, `Spacing` (usar siempre, no números mágicos), `Accent` (#FF5722, color de marca) y `Danger`.

## Convenciones
- Imports con alias `@/` → `src/` (y `@/assets/` → `assets/`).
- Datos: siempre hooks de TanStack Query en `src/hooks/`, nunca llamadas a supabase directas en pantallas (excepción: profile.tsx y pantallas de auth, que son operaciones one-off).
- Textos de UI en español; código/identificadores en inglés.
- La autorización REAL está en RLS (el cliente solo filtra por UX). Cualquier tabla nueva DEBE tener RLS desde el día 1, en una nueva migración `00X_*.sql`.
- Estilo: `StyleSheet.create` al pie del archivo, `Spacing` para espaciados.

## Decisiones tomadas (no re-discutir sin motivo)
- **MVP primero rutinas+social**, feed después (Fase 2), dietas después (Fase 3).
- **Monetización** (decidida jul 2026): gratis = 5 rutinas, slots extra con anuncio recompensado voluntario (nunca interstitials forzados), estadísticas con ventana de 1 mes; Pro $3-5/mes (RevenueCat) = ilimitado + historial completo + sin anuncios + exportar. **Los datos se guardan siempre completos, solo se limita la ventana de visualización** (aplicar límite también en servidor).
- GitHub: el usuario prefiere repo privado por ahora; ojo con el LICENSE MIT de la plantilla si lo hace público.
- Peso en rutinas = peso de trabajo actual (sin historial). El historial real llega en Fase 2 con `workout_logs`.

## Cómo verificar que todo sigue funcionando
```
npx tsc --noEmit   # tipos
npx expo lint      # lint
npx expo start     # probar con Expo Go en el teléfono (mismo WiFi)
```
Flujo E2E de referencia: registrarse → confirmar email → ver catálogo → crear rutina con 3 ejercicios → cerrar/abrir app → sigue ahí.
