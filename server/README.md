MotoTaxi local admin server

This small Express server exposes a single endpoint `/create-driver` that uses your Supabase service role key to create an auth user and related records (profile, drivers, user_roles).

Run locally (development):

1. Copy your service role key and URL to environment variables (do NOT commit these):

- On Windows (PowerShell):
  $env:SUPABASE_URL="https://<project>.supabase.co"
  $env:SUPABASE_SERVICE_ROLE_KEY="sb_..."
  npm install
  npm start

- Or create a `.env` and use a process manager to load it.

2. Start server:
  npm install
  npm start

3. The frontend will call `http://localhost:3000/create-driver` when creating drivers from the admin panel.

Production:
- Deploy this logic as a Supabase Edge Function or a small server behind HTTPS and set the function URL in the frontend.
- Make sure the service role key is stored securely (not in frontend code).
