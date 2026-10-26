-- WebAuthn credentials and single-use challenges are accessed only by the server.
CREATE TABLE IF NOT EXISTS public.passkey_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}',
  rp_id text NOT NULL,
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.passkey_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('register', 'login')),
  origin text NOT NULL,
  rp_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);
ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.passkey_credentials, public.passkey_challenges FROM anon, authenticated;
GRANT ALL ON public.passkey_credentials, public.passkey_challenges TO service_role;
CREATE INDEX IF NOT EXISTS passkey_credentials_user_rp ON public.passkey_credentials (user_id, rp_id);
CREATE INDEX IF NOT EXISTS passkey_challenges_expiry ON public.passkey_challenges (expires_at);
