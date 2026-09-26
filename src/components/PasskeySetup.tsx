import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { passkeyErrorKey } from "@/auth/passkeys";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

function EnablePasskey() {
  const { registerPasskey } = useAuth();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return <Button disabled={busy || done} className="w-full" onClick={async () => {
    setBusy(true);
    const { error } = await registerPasskey();
    setBusy(false);
    if (error) toast.error(t(passkeyErrorKey(error)));
    else { setDone(true); toast.success(t("passkey.success")); }
  }}>{busy ? t("passkey.working") : done ? t("passkey.success") : t("passkey.enable")}</Button>;
}

export function PasskeySetup() {
  const { user, passkeySetupSuggested, dismissPasskeySetup } = useAuth();
  const { t } = useI18n();
  return <Dialog open={!!user && passkeySetupSuggested} onOpenChange={(open) => { if (!open) dismissPasskeySetup(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("passkey.title")}</DialogTitle>
        <DialogDescription>{t("passkey.description")}</DialogDescription>
      </DialogHeader>
      <EnablePasskey />
      <Button variant="ghost" onClick={dismissPasskeySetup}>{t("passkey.later")}</Button>
    </DialogContent>
  </Dialog>;
}

export function PasskeySettings() {
  const { user, passkeySupported } = useAuth();
  const { t } = useI18n();
  if (!user || !passkeySupported) return null;
  return <Card>
    <CardHeader><CardTitle className="text-base">{t("passkey.title")}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("passkey.description")}</p>
      <EnablePasskey key={user.id} />
    </CardContent>
  </Card>;
}
