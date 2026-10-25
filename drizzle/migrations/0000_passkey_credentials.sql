CREATE TABLE public.passkey_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}',
  rp_id text NOT NULL,
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
GRANT SELECT, DELETE ON public.passkey_credentials TO authenticated;
GRANT ALL ON public.passkey_credentials TO service_role;
ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own passkeys" ON public.passkey_credentials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own passkeys" ON public.passkey_credentials
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX passkey_credentials_user_idx ON public.passkey_credentials(user_id);

CREATE TABLE public.passkey_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  challenge text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('register','login')),
  rp_id text NOT NULL,
  origin text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.passkey_challenges TO service_role;
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;
CREATE INDEX passkey_challenges_expires_idx ON public.passkey_challenges(expires_at);