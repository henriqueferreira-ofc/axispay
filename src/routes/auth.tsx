import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { AuthHeroBackground } from "@/components/AuthHeroBackground";

import { passkeyErrorKey } from "@/auth/passkeys";

const LAST_USER_NAME_KEY = "axispay.lastUserName";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect:
      typeof s.redirect === "string" &&
      s.redirect.startsWith("/") &&
      !s.redirect.startsWith("//") &&
      !["/auth", "/reset-password"].includes(s.redirect.split(/[?#]/)[0].replace(/\/$/, ""))
        ? s.redirect
        : "/",
  }),
  head: () => ({
    meta: [
      { title: "AxisPay" },
      { name: "description", content: "Acesse sua conta AxisPay para gerenciar suas finanças." },
      { property: "og:title", content: "AxisPay — Acesso" },
      { property: "og:description", content: "Acesse sua conta AxisPay para gerenciar suas finanças." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { lockRevision } = useAuth();
  return <AuthScreen key={lockRevision} />;
}

function AuthScreen() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, loading, signIn, signUp, resetPassword, passkeySupported, signInWithPasskey } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<"login" | "signup" | "reset">("login");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rememberedName, setRememberedName] = useState<string | null>(null);

  // Keep the server and initial client render identical before reading browser storage.
  useEffect(() => {
    try {
      setRememberedName(window.localStorage.getItem(LAST_USER_NAME_KEY));
    } catch {
      // Keep the generic greeting when browser storage is unavailable.
    }
  }, []);

  const loginSchema = z.object({
    email: z.string().email(t("auth.invalidEmail")),
    password: z.string().min(6, t("auth.minPwd")),
  });
  const signupSchema = loginSchema.extend({
    name: z.string().min(2, t("auth.nameReq")),
  });

  useEffect(() => {
    if (loading || !user) return;
    const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
    if (name) {
      try {
        window.localStorage.setItem(LAST_USER_NAME_KEY, name);
      } catch {
        // ignore storage errors (private mode, quota, etc.)
      }
    }
    navigate({ to: search.redirect || "/", replace: true });
  }, [user, loading, navigate, search.redirect]);

  const firstName = rememberedName?.trim().split(" ")[0];
  const greeting = firstName ? t("auth.helloName", { name: firstName }) : t("auth.helloGeneric");

  const accessAccount = async () => {
    if (!passkeySupported) { setTab("login"); setShowForm(true); return; }
    setSubmitting(true);
    const { error } = await signInWithPasskey();
    setSubmitting(false);
    if (error) toast.error(t(passkeyErrorKey(error)));
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? t("auth.invalid") :
        "code" in error && error.code === "passkey_interrupted" ? t("passkey.interrupted") : error.message);
    } else {
      toast.success(t("auth.welcomeBack"));
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = signupSchema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(parsed.data.email, parsed.data.password, parsed.data.name);
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("already") ? t("auth.exists") : error.message);
    } else {
      form.reset();
      setTab("login");
      toast.success(t("auth.created"));
    }
  };

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    if (!email) return toast.error(t("auth.resetEmpty"));
    setSubmitting(true);
    const { error } = await resetPassword(email);
    setSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success(t("auth.resetSent"));
  };

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-hidden bg-background">
      <AuthHeroBackground />

      <div className="relative z-10 flex items-center justify-end px-4 pt-5">
        <div className="rounded-full bg-black/30 backdrop-blur-sm [&_button]:text-white [&_svg]:text-white">
          <LanguageSwitcher />
        </div>
      </div>

      <div className="relative z-10 mt-auto flex w-full flex-col px-4 pb-6 pt-16">
        <Card className="w-full max-w-md self-center rounded-2xl border-white/15 bg-black/35 text-white backdrop-blur-xl shadow-2xl [&_input]:border-white/20 [&_input]:bg-white/5 [&_input]:h-8 [&_label]:text-xs">
          <CardHeader className="gap-0.5 px-4 pb-1.5 pt-4">
            <CardTitle className="text-sm">
              {!showForm || tab === "login" ? greeting : tab === "signup" ? t("auth.signupTitle") : t("auth.reset")}
            </CardTitle>
            <CardDescription className="text-xs">
              {!showForm || tab === "login" ? t("auth.signinDesc") : tab === "signup" ? t("auth.signupDesc") : t("auth.resetDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0.5">
            {!showForm ? (
              <div className="space-y-3 pt-4">
                <Button className="h-12 w-full text-base" disabled={submitting || loading} onClick={accessAccount}>
                  {submitting ? t("auth.signing") : t("auth.accessAccount")}
                </Button>
                {passkeySupported && (
                  <button type="button" disabled={submitting} className="block w-full p-2 text-sm text-white/80" onClick={() => { setTab("login"); setShowForm(true); }}>
                    {t("passkey.passwordAlternative")}
                  </button>
                )}
                <Button disabled={submitting} variant="outline" className="h-12 w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => { setTab("signup"); setShowForm(true); }}>
                  {t("auth.create")}
                </Button>
              </div>
            ) : (
            <Tabs value={tab === "reset" ? "login" : tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid h-8 w-full grid-cols-2">
                <TabsTrigger value="login" className="text-xs">{t("auth.signin")}</TabsTrigger>
                <TabsTrigger value="signup" className="text-xs">{t("auth.signup")}</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-2">
                {tab === "reset" ? (
                  <form onSubmit={handleReset} className="space-y-2">
                    <div className="grid gap-1">
                      <Label htmlFor="r-email">{t("auth.email")}</Label>
                      <Input id="r-email" name="email" type="email" required />
                    </div>
                    <Button type="submit" className="h-8 w-full text-xs" disabled={submitting}>
                      {submitting ? t("auth.sending") : t("auth.sendResetLink")}
                    </Button>
                    <button
                      type="button"
                      className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setTab("login")}
                    >
                      {t("auth.backToSignin")}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-2">
                    <div className="grid gap-1">
                      <Label htmlFor="l-email">{t("auth.email")}</Label>
                      <Input id="l-email" name="email" type="email" autoComplete="email" required />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="l-pass">{t("auth.password")}</Label>
                      <Input id="l-pass" name="password" type="password" autoComplete="current-password" required />
                    </div>
                    <Button type="submit" className="h-8 w-full text-xs" disabled={submitting}>
                      {submitting ? t("auth.signing") : t("auth.accessAccount")}
                    </Button>
                    <button
                      type="button"
                      className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setTab("reset")}
                    >
                      {t("auth.forgot")}
                    </button>
                  </form>
                )}
              </TabsContent>
              <TabsContent value="signup" className="mt-2">
                <form onSubmit={handleSignup} className="space-y-2">
                  <div className="grid gap-1">
                    <Label htmlFor="s-name">{t("auth.name")}</Label>
                    <Input id="s-name" name="name" required />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="s-email">{t("auth.email")}</Label>
                    <Input id="s-email" name="email" type="email" autoComplete="email" required />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="s-pass">{t("auth.password")}</Label>
                    <Input id="s-pass" name="password" type="password" autoComplete="new-password" minLength={6} required />
                    <p className="text-[11px] text-muted-foreground">{t("auth.minChars")}</p>
                  </div>
                  <Button type="submit" className="h-8 w-full text-xs" disabled={submitting}>
                    {submitting ? t("auth.creating") : t("auth.create")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            )}
          </CardContent>
        </Card>

        {showForm && (
          <button type="button" className="mt-2.5 self-center p-2 text-xs text-white/80 drop-shadow hover:text-white" onClick={() => setShowForm(false)}>
            {t("auth.backHome")}
          </button>
        )}
      </div>
    </div>
  );
}
