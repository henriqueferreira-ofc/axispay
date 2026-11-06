import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function collectViewportInfo() {
  const round = (value: number) => Math.round(value * 100) / 100;
  const bounds = (selector: string) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { top: round(rect.top), bottom: round(rect.bottom), height: round(rect.height) };
  };
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;inset:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)";
  document.body.appendChild(probe);
  const safeStyle = getComputedStyle(probe);
  const safeArea = { top: safeStyle.paddingTop, bottom: safeStyle.paddingBottom };
  const heights: Record<string, number> = {
    fixedInset: round(probe.getBoundingClientRect().height),
  };
  for (const unit of ["vh", "svh", "lvh", "dvh"]) {
    probe.style.height = `100${unit}`;
    heights[unit] = round(probe.getBoundingClientRect().height);
  }
  probe.remove();
  const viewport = window.visualViewport;
  return {
    page: location.origin + location.pathname,
    userAgent: navigator.userAgent,
    installed: (navigator as Navigator & { standalone?: boolean }).standalone ?? false,
    displayMode: matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser",
    screen: { width: screen.width, height: screen.height, pixelRatio: devicePixelRatio },
    window: {
      width: innerWidth,
      height: innerHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollY,
    },
    visualViewport: viewport
      ? {
          height: round(viewport.height),
          width: round(viewport.width),
          offsetTop: round(viewport.offsetTop),
          scale: viewport.scale,
        }
      : null,
    safeArea,
    heights,
    statusBar: [
      ...document.querySelectorAll<HTMLMetaElement>(
        'meta[name="apple-mobile-web-app-status-bar-style"]',
      ),
    ].map((meta) => meta.content),
    elements: {
      page: bounds(".auth-page"),
      background: bounds(".auth-hero-background"),
      photo: bounds(".auth-hero-photo"),
      brand: bounds(".auth-wordmark"),
      panel: bounds(".auth-welcome"),
      lastButton: bounds(".auth-welcome > button"),
    },
  };
}

/** Read-only support tool, opened only after five taps on the opening wordmark. */
export function AuthViewportDiagnostics({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [info, setInfo] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (!open) return;
    setInfo(JSON.stringify(collectViewportInfo(), null, 2));
    setStatus("");
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Informações da tela</DialogTitle>
          <DialogDescription>
            Medidas da abertura para investigar a faixa. Não inclui dados da conta.
          </DialogDescription>
        </DialogHeader>
        <textarea
          aria-label="Informações da tela"
          readOnly
          value={info}
          className="h-48 w-full select-text rounded-md border bg-background p-2 font-mono text-xs"
        />
        <Button
          disabled={!info}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(info);
              setStatus("Informações copiadas.");
            } catch {
              setStatus("Selecione o texto acima para copiar manualmente.");
            }
          }}
        >
          Copiar informações
        </Button>
        <p role="status" className="text-sm">
          {status}
        </p>
      </DialogContent>
    </Dialog>
  );
}
