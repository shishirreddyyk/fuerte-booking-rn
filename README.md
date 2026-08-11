# fuerte-booking-rn

An appointment-booking app for pharma reps and medical practices: browse practices,
pick a slot, confirm, get a push notification. Built as a pnpm/Turborepo monorepo -
Expo React Native app, Express 5 + tRPC API, Drizzle ORM over Postgres, TypeScript
front to back.

## Stack

| Layer | What |
|---|---|
| Monorepo | TypeScript, pnpm workspaces, Turborepo |
| Mobile | Expo React Native (Expo Router), TanStack Query, Zustand, expo-notifications, EAS |
| API | Express 5, tRPC v11, superjson, zod |
| Data | Postgres (Supabase), Drizzle ORM, drizzle-kit migrations |
| CI | GitHub Actions - build, typecheck, 16 vitest cases |

## Layout

```
packages/shared   zod schemas + the booking rules (pure, unit-tested)
packages/db       drizzle schema, client, seed
apps/api          Express 5 + tRPC router
apps/mobile       Expo React Native app
```

## Setup

```
cd ~/Downloads
unzip fuerte-booking-rn.zip
cd fuerte-booking-rn
pnpm install
cp .env.example .env
```

Put a Postgres URL in `.env`. Free Supabase project works:
Supabase dashboard -> Project Settings -> Database -> Connection string (URI).

```
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
PORT=4000
```

## Database

```
pnpm --filter @fuerte/shared build
pnpm --filter @fuerte/db build
pnpm --filter @fuerte/db generate
pnpm --filter @fuerte/db migrate
pnpm --filter @fuerte/db seed
```

Seed inserts 3 practices and a 14-day slot grid (9-5, lunch blocked out, no weekends).

## Run

```
pnpm --filter @fuerte/api dev
```

Then in a second terminal:

```
cd ~/Downloads/fuerte-booking-rn/apps/mobile
npx expo install --fix
npx expo start
```

Scan the QR code with Expo Go. Push notifications only fire on a real device, not a
simulator - `registerForPush` returns null there and the booking still works.

Check the API on its own:

```
curl http://localhost:4000/health
```

## Tests

```
pnpm --filter @fuerte/shared test
pnpm --filter @fuerte/shared --filter @fuerte/db --filter @fuerte/api typecheck
```

16 vitest cases cover the slot grid generator, overlap detection, and every rule in
`checkBookable` - lead time, past slots, taken slots, a rep double-booking themselves,
and the back-to-back case that should be allowed.

## EAS build

```
npm i -g eas-cli
eas login
eas build:configure
eas build --profile preview --platform ios
```

The `preview` profile builds a simulator/internal-distribution build and points
`EXPO_PUBLIC_API_URL` at the deployed API. Deploy `apps/api` anywhere that runs Node
22 (Render, Fly, Elastic Beanstalk) and set `DATABASE_URL` there.

## Notes on the design

- **Booking rules live in `packages/shared`, not in the app or the router.** The phone
  renders whatever the API sends, including the reason a slot is dead ("Just taken",
  "Too soon to book"). One place to change a rule.
- **Double-booking is stopped in Postgres, not in JavaScript.** `bookings.create` takes
  a `SELECT ... FOR UPDATE` on the slot row inside a transaction, and there is a unique
  index on `bookings.slot_id`. Two reps tapping Confirm in the same second: one gets a
  booking, the other gets a 409 with a reason.
- **Push is fire-and-forget, outside the transaction.** A dead Expo token should never
  fail a real booking.
- **`now` is injected into the tRPC context** so time-dependent rules are testable
  without mocking `Date`.
