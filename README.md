# Venue Inventory Tracking

Warehouse receiving, concession stand counts (opening/closing), waste/damage tracking, and
restock reporting for a concert venue — with a CSV export tuned for import into
[Yellow Dog Software](https://www.yellowdogsoftware.com/).

## Status

This is being built in phases. **Phase 1 (this commit)** covers: app scaffold, full database
schema with row-level security, authentication, and role-based route protection/navigation.
Feature screens (admin CRUD, scanning, counts, waste, CSV export, Monday report) land in
subsequent phases — see the in-app "Coming soon" placeholders for what's next, or the task
list in the originating session.

## Stack

- **Next.js 14** (App Router, TypeScript) — deploy target: [Vercel](https://vercel.com)
- **Supabase** — Postgres, Auth, Storage
- **Resend** — transactional email (count confirmations, Monday restock report)
- **@zxing/browser** — camera-based barcode/QR scanning (added in Phase 3)

## Roles

- **admin** — full access; manages stands, events, suppliers, products, thresholds, users,
  and the Yellow Dog CSV column mapping
- **warehouse** — receives shipments (scan-to-match or scan-to-add) and replenishes stands
- **stand_lead** — counts their assigned stand(s) at the start and end of each event, and logs
  waste/damage

New sign-ups default to `stand_lead`; an admin promotes users to `warehouse`/`admin` from
**Admin → Users**.

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then run the schema:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   (Or paste `supabase/migrations/0001_init.sql` into the Supabase SQL editor.)

3. **Copy environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in from Supabase (**Project Settings → API**): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. From
   [resend.com](https://resend.com): `RESEND_API_KEY`. Set `WAREHOUSE_REPORT_EMAILS` /
   `OPS_REPORT_EMAILS` to the recipient addresses for count confirmations and the Monday
   report. Set `CRON_SECRET` to a random string (used to authorize the scheduled report route
   once it ships in Phase 6).

4. **Create your first admin user**

   Sign up through the app (or Supabase Auth dashboard), then in the Supabase SQL editor:

   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```

5. **Run the app**

   ```bash
   npm run dev
   ```

## Deployment

Push to `main` and import the repo into Vercel. Add the same environment variables from
`.env.example` in the Vercel project settings. The Monday report (Phase 6) will run as a
Vercel Cron job.

## Yellow Dog CSV export

Yellow Dog's physical-count import format is issued per-client (their published "Generic
2-Way Sync" integration is sunset for new integrations), so the export uses an admin-editable
mapping (`yellow_dog_field_mapping` table / **Admin → Yellow Dog CSV Mapping**, shipping in
Phase 5) from internal fields to CSV column headers. Update the mapping once you have the real
import template from Yellow Dog support — no code changes required.
