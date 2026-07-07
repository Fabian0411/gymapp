# GymApp 💪

Red social de gimnasio: crea y guarda tus rutinas con tutoriales de ejercicios, agrega amigos y comparte tus rutinas con ellos.

**Stack:** Expo (React Native) + TypeScript · Supabase (auth, Postgres, storage) · TanStack Query

## Primeros pasos (solo la primera vez)

### 1. Crear el proyecto en Supabase (gratis)

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta.
2. Crea un proyecto nuevo (elige una región cercana y una contraseña de base de datos — guárdala).
3. En el panel del proyecto ve a **SQL Editor**, pega TODO el contenido de
   [`supabase/migrations/001_schema.sql`](supabase/migrations/001_schema.sql) y presiona **Run**.
   Esto crea las tablas, las reglas de seguridad (RLS) y el bucket de avatares.

### 2. Configurar las claves

1. En Supabase ve a **Settings > API** y copia la **Project URL** y la **anon public key**.
2. Copia `.env.example` a `.env` y pega ambos valores.

### 3. Importar el catálogo de ejercicios (una sola vez)

1. En **Settings > API** copia también la **service_role key** y agrégala al `.env`
   como `SUPABASE_SERVICE_ROLE_KEY` (descomenta la línea).
2. Ejecuta:
   ```
   node scripts/import-exercises.mjs
   ```
3. **Borra la línea `SUPABASE_SERVICE_ROLE_KEY` del `.env`** — esa clave es secreta
   y la app nunca la necesita.

### 4. Arrancar la app

```
npm install
npx expo start
```

- **En tu teléfono:** instala la app **Expo Go** (Play Store / App Store), conéctate al
  mismo WiFi que tu PC y escanea el código QR que aparece en la terminal.
- **En emulador Android:** presiona `a` en la terminal (requiere Android Studio).

## Estructura

```
src/
├── app/                  # pantallas (Expo Router: cada archivo = una ruta)
│   ├── (auth)/           # login y registro
│   ├── (tabs)/           # rutinas, ejercicios, amigos, perfil
│   ├── exercise/[id]     # detalle de ejercicio con tutorial
│   └── routine/[id]/     # detalle de rutina, agregar ejercicio, compartir
├── components/           # UI reutilizable
├── hooks/                # use-routines, use-exercises, use-friends
└── lib/                  # cliente supabase, contexto de auth, tipos
supabase/migrations/      # esquema SQL con Row Level Security
scripts/                  # importador del catálogo de ejercicios
```

## Seguridad

- Toda la autorización vive en las políticas RLS de Postgres (`001_schema.sql`):
  aunque alguien extraiga la anon key de la app, solo puede hacer lo que las políticas permiten.
- La sesión se guarda cifrada en el teléfono con `expo-secure-store`.
- El `.env` está en `.gitignore`: nunca subas claves a git.

## Roadmap

- [x] Fase 1 — MVP: auth, catálogo de ejercicios, rutinas, amigos, compartir
- [ ] Fase 2 — Feed con fotos, historias 24h y logros automáticos (PRs, peso)
- [ ] Fase 3 — Dietas y macros (Open Food Facts)
- [ ] Fase 4 — Publicación en Google Play y App Store (EAS Build)
- [ ] Fase 5 — Monetización freemium con RevenueCat
