/** Independent of the photos so the brand can animate when the login screen opens. */
export function AuthWordmark() {
  return (
    <>
    <div aria-hidden="true" className="auth-splash absolute inset-0 z-30 bg-[#0d0d0d]" />
    <div className="auth-wordmark pointer-events-none absolute inset-x-0 z-40 flex justify-center px-6">
      <div role="img" className="auth-wordmark-entrance flex flex-col items-center text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.3)]" aria-label="AxisPay — financial AxisControle">
        <div aria-hidden="true" className="auth-wordmark-name flex items-baseline whitespace-nowrap leading-none tracking-[-0.045em]">
          <span className="font-bold">Axis</span><span className="font-thin">Pay</span>
        </div>
        <div aria-hidden="true" className="auth-wordmark-tagline mt-1.5 flex items-baseline whitespace-nowrap leading-none text-white">
          <span className="auth-wordmark-tagline-lead font-[200] tracking-[0.03em] text-white/75">financial</span>{" "}<span className="font-[family-name:var(--font-serif-brand)] font-semibold tracking-[0.01em]">AxisControle</span>
        </div>
      </div>
    </div>
    </>
  );
}
