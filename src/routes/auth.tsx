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
import { ChartNoAxesCombined, LayoutGrid, SlidersHorizontal } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { AuthHeroBackground } from "@/components/AuthHeroBackground";
import { AuthWordmark } from "@/components/AuthWordmark";
import {
  enrollPasskey,
  preparePasskeyRegistration,
  prepareExistingPasskeyLogin,
  registrationErrorMessage,
  isEmbeddedAuthContext,
  type PreparedPasskeyRegistration,
  getLocalPasskey,
  getRememberedAccount,
  isBiometricAvailable,
  loginWithPasskey,
  preparePasskeyLogin,
  type PreparedPasskeyLogin,
} from "@/lib/passkey";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { accessDestination } from "@/lib/passkey-policy";

const LAST_USER_NAME_KEY = "axispay.lastUserName";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    confirmed: s.confirmed === true || s.confirmed === "true",
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
  const { user, loading, signIn, signUp, signOut, resetPassword, accessConfirmed, setAccessConfirmed } =
    useAuth();
  const { t } = useI18n();
  const [signupNotice, setSignupNotice] = useState<string | null>(null);
  const [preparedLogin, setPreparedLogin] = useState<PreparedPasskeyLogin | null>(null);
  const [loginAttempt, setLoginAttempt] = useState(0);
  const [preparingLogin, setPreparingLogin] = useState(false);
  const [loginPreparationError, setLoginPreparationError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setPreparedLogin(null);
    setLoginPreparationError(null);
    if (loading) return;
    setPreparingLogin(true);
    preparePasskeyLogin(user?.id).then((prepared) => {
      if (active) setPreparedLogin(prepared);
    }).catch((error) => {
      if (active) setLoginPreparationError(error instanceof Error ? error.message : t("auth.biometricFailed"));
    }).finally(() => { if (active) setPreparingLogin(false); });
    return () => { active = false; };
  }, [user?.id, loading, loginAttempt]);

  useEffect(() => {
    if (!search.confirmed || loading) return;
    let active = true;
    const confirmed = !!user?.email_confirmed_at;
    setAccessConfirmed(false);
    signOut().then(() => {
      if (!active) return;
      setSignupNotice(confirmed ? "E-mail confirmado. Entre com seu e-mail e senha para continuar." : "Após confirmar o e-mail, entre com seu e-mail e senha para continuar. Se o link expirou, solicite um novo cadastro ou reenvio da confirmação.");
      setTab("login");
      setShowForm(true);
      navigate({ to: "/auth", search: { redirect: search.redirect, confirmed: false }, replace: true });
    }).catch(() => { if (active) toast.error("Não foi possível finalizar a confirmação. Tente novamente."); });
    return () => { active = false; };
  }, [search.confirmed, loading, signOut]);

  const [tab, setTab] = useState<"login" | "signup" | "reset">("login");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rememberedEmail, setRememberedEmail] = useState("");
  const [rememberedName, setRememberedName] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState(false);
  const [embeddedPreview, setEmbeddedPreview] = useState(false);
  useEffect(() => {
    setEmbeddedPreview(isEmbeddedAuthContext());
  }, []);
  const [preparedRegistration, setPreparedRegistration] =
    useState<PreparedPasskeyRegistration | null>(null);
  const [preparingRegistration, setPreparingRegistration] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registrationAttempt, setRegistrationAttempt] = useState(0);
  const enrollmentUserId = user?.id;

  useEffect(() => {
    if (!enrollment || !enrollmentUserId) return;
    let active = true;
    setPreparedRegistration(null);
    setPreparingRegistration(true);
    setRegistrationError(null);
    preparePasskeyRegistration()
      .then(async (prepared) => {
        const existing = await prepareExistingPasskeyLogin(enrollmentUserId, prepared);
        if (!active) return;
        if (existing) {
          setPreparedLogin(existing);
          setEnrollment(false);
          setShowForm(false);
          toast.info("Toque em Acessar conta para confirmar com sua biometria já cadastrada.");
        } else {
          setPreparedRegistration(prepared);
        }
      })
      .catch((error) => {
        if (active)
          setRegistrationError(
            error instanceof Error
              ? error.message
              : "Não foi possível preparar a biometria. Tente novamente.",
          );
      })
      .finally(() => {
        if (active) setPreparingRegistration(false);
      });
    return () => {
      active = false;
    };
  }, [enrollment, enrollmentUserId, registrationAttempt]);

  const [holdLogin, setHoldLogin] = useState(false);
  const [biometricError, setBiometricError] = useState(false);
  const destination = accessDestination(search.redirect);
  useEffect(() => {
    try {
      const account = getRememberedAccount();
      setRememberedName(account?.name || window.localStorage.getItem(LAST_USER_NAME_KEY));
      setRememberedEmail(account?.email || "");
    } catch {
      // Storage can be unavailable in private browsing.
    }
  }, [user?.id]);

  const loginSchema = z.object({
    email: z.string().email(t("auth.invalidEmail")),
    password: z.string().min(6, t("auth.minPwd")),
  });
  const signupSchema = loginSchema.extend({
    name: z.string().min(2, t("auth.nameReq")),
  });

  useEffect(() => {
    if (loading || !user || holdLogin || enrollment || search.confirmed) return;
    const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
    if (name) {
      try {
        window.localStorage.setItem(LAST_USER_NAME_KEY, name);
      } catch {
        // ignore storage errors (private mode, quota, etc.)
      }
    }
    // A returning visitor explicitly confirms access with their registered key.
    if (!accessConfirmed) return;
    navigate({ to: destination });
  }, [user, loading, navigate, destination, holdLogin, enrollment, accessConfirmed]);

  const handleAccess = async () => {
    setBiometricError(false);
    if (!getLocalPasskey(user?.id) && !preparedLogin) {
      if (user) {
        if (await isBiometricAvailable()) {
          setEnrollment(true);
          return;
        }
        setAccessConfirmed(true);
        navigate({ to: destination });
        return;
      }
      setTab("login");
      setShowForm(true);
      return;
    }
    if (!preparedLogin || preparedLogin.local.userId !== (user?.id ?? getRememberedAccount()?.userId ?? getLocalPasskey()?.userId) || Date.now() - preparedLogin.preparedAt >= 4 * 60 * 1000) {
      setLoginAttempt((attempt) => attempt + 1);
      if (loginPreparationError) { setBiometricError(true); toast.error(loginPreparationError); }
      else toast.info("Preparando a biometria. Toque em Acessar conta novamente quando estiver pronto.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await loginWithPasskey(preparedLogin);
      if (result !== "ok") throw new Error("Missing credential");
      setAccessConfirmed(true);
      navigate({ to: destination });
    } catch {
      setLoginAttempt((attempt) => attempt + 1);
      setBiometricError(true);
      toast.error(t("auth.biometricFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) return;
    if (!preparedRegistration) {
      setRegistrationAttempt((attempt) => attempt + 1);
      return;
    }
    setSubmitting(true);
    setRegistrationError(null);
    try {
      await enrollPasskey(user.id, preparedRegistration);
      toast.success(t("auth.enrolled"));
      setAccessConfirmed(true);
      setEnrollment(false);
      setHoldLogin(false);
      navigate({ to: destination });
    } catch (error) {
      console.error("Passkey registration failed", error);
      setPreparedRegistration(null);
      const message = registrationErrorMessage(error);
      setRegistrationError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentName = typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : rememberedName;
  const firstName = currentName?.trim().split(" ")[0];
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
    setHoldLogin(true);
    let error: Error | null;
    try {
      ({ error } = await signIn(parsed.data.email, parsed.data.password));
    } catch (failure) {
      error = failure instanceof Error ? failure : new Error("Não foi possível entrar. Tente novamente.");
    }
    setSubmitting(false);
    if (error) {
      setHoldLogin(false);
      toast.error(
        error.message === "Invalid login credentials" ? t("auth.invalid") : error.message,
      );
    } else {
      toast.success(t("auth.welcomeBack"));
      const { data } = await supabase.auth.getSession();
      if (data.session && getLocalPasskey(data.session.user.id) && !biometricError) {
        setShowForm(false);
        toast.info("Toque em Acessar conta para confirmar com a biometria.");
        setLoginAttempt((attempt) => attempt + 1);
      } else if (!biometricError && (await isBiometricAvailable())) setEnrollment(true);
      else {
        setAccessConfirmed(true);
        setHoldLogin(false);
      }
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
    setHoldLogin(true);
    try {
      const { error, confirmationRequired } = await signUp(parsed.data.email, parsed.data.password, parsed.data.name);
      if (error) {
        toast.error(error.message.includes("already") ? t("auth.exists") : error.message);
        return;
      }
      setSignupNotice(confirmationRequired
        ? `Verifique seu e-mail (${parsed.data.email}) para confirmar o cadastro. Depois, volte e entre com seu e-mail e senha.`
        : "Conta criada. Entre com seu e-mail e senha para continuar.");
      setTab("login");
      setShowForm(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar. Tente novamente.");
    } finally {
      setSubmitting(false);
      setHoldLogin(false);
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
    <div className="auth-page relative isolate flex min-h-dvh flex-col overflow-x-hidden bg-transparent">
      <AuthHeroBackground />
      <AuthWordmark />

      <div className="absolute right-4 top-[max(1.25rem,env(safe-area-inset-top))] z-20 flex items-center justify-end lg:right-8 lg:top-8">
        <div className="rounded-full bg-background/45 [&_button]:text-foreground [&_svg]:text-foreground">
          <LanguageSwitcher />
        </div>
      </div>

      <div className="auth-content relative z-10 mt-auto flex w-full flex-col items-center px-[3.7vw] pb-[max(1vw,env(safe-area-inset-bottom))] pt-28 md:px-8 md:pb-10">
        {!showForm ? (
          <Card className="auth-welcome relative top-[12px] w-full max-w-4xl md:top-0 rounded-[9.5vw] border-white/[0.04] bg-transparent bg-gradient-to-b from-[#8c8582]/45 to-[#514d4b]/40 p-[5.4vw] text-white shadow-xl backdrop-blur-md md:rounded-[64px] md:p-10">
            <CardHeader className="space-y-[1.9vw] p-0 md:space-y-2">
              <CardTitle className="auth-greeting text-[3.8vw] font-normal leading-[1.25] md:text-[28px]">
                {greeting}
              </CardTitle>
              <div className="auth-features grid grid-cols-3 pt-[3vw] text-white/90 md:pt-5">
                {[
                  { icon: SlidersHorizontal, label: t("auth.control") },
                  { icon: ChartNoAxesCombined, label: t("auth.management") },
                  { icon: LayoutGrid, label: t("auth.everythingHere") },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex min-w-0 flex-col items-center gap-[1.5vw] border-r border-white/20 last:border-r-0 md:gap-2">
                    <Icon aria-hidden="true" strokeWidth={1.6} className="size-[4vw] md:size-7" />
                    <span className="text-[2.8vw] leading-snug md:text-lg">{label}</span>
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent className="auth-actions flex flex-col gap-[2.8vw] p-0 pt-[4.5vw] md:gap-5 md:pt-8">
              <Button
                className="h-[11.2vw] w-full rounded-[4vw] bg-[#0cc6a0] text-[4vw] font-normal text-[#064c72] hover:bg-[#0bb590] md:h-24 md:rounded-[36px] md:text-[34px]"
                onClick={handleAccess}
                disabled={submitting || loading || preparingLogin}
              >
                {submitting || preparingLogin ? t("auth.verifying") : t("auth.accessAccount")}
              </Button>
              <Button
                variant="outline"
                className="h-[11.2vw] w-full rounded-[4vw] border-transparent bg-[#303940] text-[4vw] font-normal text-[#18d6ae] hover:border-transparent hover:bg-[#3a454d] hover:text-[#43e8c4] md:h-24 md:rounded-[36px] md:text-[28px]"
                onClick={() => {
                  setTab("signup");
                  setShowForm(true);
                }}
              >
                {t("auth.create")}
              </Button>
            </CardContent>
            <Button variant="ghost" className="mt-3 w-full text-white" onClick={() => {
              setTab("login"); setShowForm(true); setSignupNotice(null);
            }}>{t("auth.usePassword")}</Button>
            {loginPreparationError && <p role="alert" className="mt-2 text-sm text-white">{loginPreparationError}</p>}
            {biometricError && <p role="alert" className="mt-2 text-sm text-white">Confirme com a biometria em Acessar conta ou entre com e-mail e senha.</p>}
          </Card>
        ) : (
          <Card className="auth-form w-full max-w-md self-center rounded-xl border-border/70 bg-background/88 text-foreground shadow-2xl backdrop-blur-xl [&_input]:h-8 [&_input]:border-border/80 [&_input]:bg-background/60 [&_label]:text-xs">
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
              {signupNotice && <p role="status" className="mb-3 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">{signupNotice}</p>}
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
                      <Input id="l-email" name="email" type="email" autoComplete="username" defaultValue={rememberedEmail} required />
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
      <Dialog
        open={enrollment}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setEnrollment(false);
            setHoldLogin(false);
            setAccessConfirmed(true);
          }
        }}
      >
        <DialogContent onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("auth.enrollTitle")}</DialogTitle>
            <DialogDescription>{t("auth.enrollDesc")}</DialogDescription>
          </DialogHeader>
          {embeddedPreview && (
            <p className="text-sm text-muted-foreground">
              Para ativar a biometria, abra o aplicativo fora da prévia do editor.{" "}
              <a
                className="font-medium text-primary underline"
                href={`https://cash-craft-vista.lovable.app/auth?redirect=${encodeURIComponent(destination)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir aplicativo
              </a>
            </p>
          )}
          {registrationError && (
            <p role="alert" className="text-sm text-destructive">
              {registrationError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => {
                setEnrollment(false);
                setHoldLogin(false);
                setAccessConfirmed(true);
              }}
            >
              {t("auth.enrollLater")}
            </Button>
            <Button disabled={submitting || preparingRegistration} onClick={handleEnroll}>
              {submitting || preparingRegistration
                ? t("auth.verifying")
                : preparedRegistration
                  ? t("auth.enrollNow")
                  : "Tentar novamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
