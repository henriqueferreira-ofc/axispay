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
  const [rememberedName, setRememberedName] = useState<string | null>(null);

  useEffect(() => {
    try {
      setRememberedName(window.localStorage.getItem(LAST_USER_NAME_KEY));
    } catch {
      // The greeting is optional when browser storage is unavailable.
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
    navigate({ to: search.redirect || "/" });
  }, [user, loading, navigate, search.redirect]);

  const firstName = rememberedName?.trim().split(/\s+/)[0];
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
    <div className="dark relative isolate flex min-h-svh flex-col overflow-x-hidden bg-black text-white">
      <AuthHeroBackground />

      <div className="absolute right-4 top-5 z-20 flex items-center justify-end sm:right-5 sm:top-4">
        <div className="rounded-full bg-black/30 backdrop-blur-md sm:rounded-none sm:bg-transparent sm:backdrop-blur-none [&_button]:text-white [&_svg]:text-white">
          <LanguageSwitcher />
        </div>
      </div>

      <div className="relative z-10 mt-auto flex w-full flex-col items-center px-4 pb-3 pt-20 sm:px-6 sm:pb-8">
        <Card className="w-full max-w-[40rem] rounded-[20px] sm:rounded-[28px] border-white/15 bg-black/40 text-white shadow-none backdrop-blur-xl [&_input]:h-11 [&_input]:border-white/20 [&_input]:bg-black/30 [&_label]:text-sm">
          <CardHeader className="gap-2 space-y-0 px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
            <CardTitle className="text-sm leading-5 sm:text-xl sm:leading-7">
              {tab === "login"
                ? greeting
                : tab === "signup"
                  ? t("auth.signupTitle")
                  : t("auth.reset")}
            </CardTitle>
            <CardDescription className="text-xs leading-[18px] text-gray-400 sm:text-base sm:leading-6">
              {tab === "login"
                ? t("auth.signinDesc")
                : tab === "signup"
                  ? t("auth.signupDesc")
                  : t("auth.resetDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
            {!showForm ? (
              <div className="grid gap-3 sm:gap-4">
                <Button
                  className="h-12 w-full rounded-[10px] bg-[#12cfa0] text-base sm:h-[68px] sm:rounded-2xl font-medium text-[#123a7a] hover:bg-[#10bb91] sm:text-2xl"
                  onClick={() => {
                    setTab("login");
                    setShowForm(true);
                  }}
                >
                  {t("auth.accessAccount")}
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-[10px] border-white/25 bg-white/5 text-sm sm:h-[68px] sm:rounded-2xl sm:text-xl font-medium text-white hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    setTab("signup");
                    setShowForm(true);
                  }}
                >
                  {t("auth.create")}
                </Button>
              </div>
            ) : (
              <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                <TabsList className="grid h-8 w-full grid-cols-2">
                  <TabsTrigger value="login" className="text-xs">
                    {t("auth.signin")}
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="text-xs">
                    {t("auth.signup")}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value={tab === "reset" ? "reset" : "login"} className="mt-4">
                  {tab === "reset" ? (
                    <form onSubmit={handleReset} className="space-y-2">
                      <div className="grid gap-1">
                        <Label htmlFor="r-email">{t("auth.email")}</Label>
                        <Input id="r-email" name="email" type="email" required />
                      </div>
                      <Button
                        type="submit"
                        className="h-11 w-full bg-[#12cfa0] text-sm text-black hover:bg-[#10bb91]"
                        disabled={submitting}
                      >
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
                        <Input
                          id="l-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                        />
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
                      <Button
                        type="submit"
                        className="h-11 w-full bg-[#12cfa0] text-sm text-[#123a7a] hover:bg-[#10bb91]"
                        disabled={submitting}
                      >
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
                    <Button
                      type="submit"
                      className="h-11 w-full bg-[#12cfa0] text-sm text-black hover:bg-[#10bb91]"
                      disabled={submitting}
                    >
                      {submitting ? t("auth.creating") : t("auth.create")}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
            {showForm && (
              <button
                type="button"
                className="mt-5 block w-full text-center text-sm text-gray-300 hover:text-white"
                onClick={() => {
                  setShowForm(false);
                  setTab("login");
                }}
              >
                {t("auth.backHome")}
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
