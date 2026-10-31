import { useEffect } from "react";

/** Independent of the photos so the brand can animate when the login screen opens. */
export function AuthWordmark() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.authSplash = "true";
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousMedia = theme?.getAttribute("media");
    theme?.removeAttribute("media");
    const reveal = () => {
      delete root.dataset.authSplash;
      // Keep black browser chrome for the splash only. Once the photo is visible,
      // let WebKit paint the document beneath the translucent status bar.
      theme?.setAttribute("media", "not all");
    };
    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName === "auth-splash-fade") reveal();
    };
    document.addEventListener("animationend", onAnimationEnd);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(reveal, reducedMotion ? 0 : 3400);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("animationend", onAnimationEnd);
      delete root.dataset.authSplash;
      if (previousMedia === null || previousMedia === undefined) theme?.removeAttribute("media");
      else theme?.setAttribute("media", previousMedia);
    };
  }, []);

  return (
    <>
    <div aria-hidden="true" className="auth-splash fixed inset-x-0 bottom-0 top-[calc(0px_-_env(safe-area-inset-top,0px))] z-30 bg-[#0d0d0d]" />
    <div className="auth-wordmark pointer-events-none absolute inset-x-0 z-40 flex justify-center px-6">
      <div role="img" className="auth-wordmark-entrance flex flex-col items-center text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.3)]" aria-label="AxisPay — financial AxisControle">
        <div aria-hidden="true" className="auth-wordmark-name flex items-baseline whitespace-nowrap leading-none tracking-[-0.065em]">
          <span className="font-extrabold">Axis</span><span className="font-thin">Pay</span>
        </div>
        <div aria-hidden="true" className="auth-wordmark-tagline mt-0.5 flex items-baseline whitespace-nowrap leading-none text-white">
          <span className="auth-wordmark-tagline-lead font-[200] tracking-[0.03em] text-white/75">financial</span>{" "}<span className="font-[family-name:var(--font-serif-brand)] font-semibold tracking-[0.01em]">AxisControle</span>
        </div>
      </div>
    </div>
    </>
  );
}
