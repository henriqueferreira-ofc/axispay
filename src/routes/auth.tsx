import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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

const LAST_USER_NAME_KEY = "axispay.lastUserName";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  head: () => ({
    meta: [
      { title: "AxisPay" },
      { name: "description", content: "Acesse sua conta AxisPay para gerenciar suas finanças." },
      { property: "og:title", content: "AxisPay — Acesso" },
      {
        property: "og:description",
        content: "Acesse sua conta AxisPay para gerenciar suas finanças.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<"login" | "signup" | "reset">("login");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rememberedName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(LAST_USER_NAME_KEY);
    } catch {
      return null;
    }
  });

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
    navigate({ to: search.redirect || "/" });
  }, [user, loading, navigate, search.redirect]);

  const firstName = rememberedName?.trim().split(" ")[0];
  const greeting = firstName ? t("auth.helloName", { name: firstName }) : t("auth.helloGeneric");

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
      toast.error(
        error.message === "Invalid login credentials" ? t("auth.invalid") : error.message,
      );
    } else {
      toast.success(t("auth.welcomeBack"));
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
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
    <div className="relative isolate flex min-h-svh flex-col overflow-x-hidden bg-background">
      <AuthHeroBackground />

      <div className="absolute right-4 top-5 z-20 flex items-center justify-end lg:right-8 lg:top-8">
        <div className="rounded-full bg-background/45 backdrop-blur-md [&_button]:text-foreground [&_svg]:text-foreground">
          <LanguageSwitcher />
        </div>
      </div>

      <div className="relative z-10 mt-auto flex w-full flex-col items-center px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-28 md:px-8 md:pb-10">
        {!showForm ? (
          <Card className="w-full max-w-4xl rounded-[20px] border-white/20 bg-black/45 p-4 text-white shadow-2xl backdrop-blur-2xl md:rounded-[36px] md:p-8">
            <CardHeader className="space-y-2 p-0">
              <CardTitle className="text-lg font-normal leading-tight md:text-[28px]">
                {greeting}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-slate-400 md:text-[22px]">
                {t("auth.signinDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-0 pt-6 md:gap-5 md:pt-10">
              <Button
                className="h-12 w-full rounded-xl bg-[#0cc6a0] text-lg font-normal text-[#064c72] hover:bg-[#0bb590] md:h-24 md:rounded-[28px] md:text-[34px]"
                onClick={() => {
                  setTab("login");
                  setShowForm(true);
                }}
              >
                {t("auth.accessAccount")}
              </Button>
              <Button
                variant="outline"
                className="h-12 w-full rounded-xl border-white/35 bg-white/5 text-lg font-normal text-white hover:bg-white/15 hover:text-white md:h-24 md:rounded-[28px] md:text-[28px]"
                onClick={() => {
                  setTab("signup");
                  setShowForm(true);
                }}
              >
                {t("auth.create")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md self-center rounded-xl border-border/70 bg-background/88 text-foreground shadow-2xl backdrop-blur-xl [&_input]:h-8 [&_input]:border-border/80 [&_input]:bg-background/60 [&_label]:text-xs">
            <CardHeader className="gap-0.5 px-4 pb-1.5 pt-4">
              <CardTitle className="text-sm">
                {tab === "login"
                  ? greeting
                  : tab === "signup"
                    ? t("auth.signupTitle")
                    : t("auth.reset")}
              </CardTitle>
              <CardDescription className="text-xs">
                {tab === "login"
                  ? t("auth.signinDesc")
                  : tab === "signup"
                    ? t("auth.signupDesc")
                    : t("auth.resetDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0.5">
              <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                <TabsList className="grid h-8 w-full grid-cols-2">
                  <TabsTrigger value="login" className="text-xs">
                    {t("auth.signin")}
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="text-xs">
                    {t("auth.signup")}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="mt-2">
                  <form onSubmit={handleLogin} className="space-y-2">
                    <div className="grid gap-1">
                      <Label htmlFor="l-email">{t("auth.email")}</Label>
                      <Input id="l-email" name="email" type="email" autoComplete="email" required />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="l-pass">{t("auth.password")}</Label>
                      <Input
                        id="l-pass"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                      />
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
                </TabsContent>
                <TabsContent value="reset" className="mt-2">
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
                      <Input
                        id="s-pass"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={6}
                        required
                      />
                      <p className="text-[11px] text-muted-foreground">{t("auth.minChars")}</p>
                    </div>
                    <Button type="submit" className="h-8 w-full text-xs" disabled={submitting}>
                      {submitting ? t("auth.creating") : t("auth.create")}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
            <button
              type="button"
              className="mb-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowForm(false)}
            >
              {t("auth.backToSignin")}
            </button>
          </Card>
        )}

        {showForm && (
          <p className="mt-2.5 text-center text-xs text-foreground/80 drop-shadow">
            <Link to="/" className="hover:text-foreground">
              {t("auth.backHome")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
