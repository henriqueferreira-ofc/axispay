export function AuthHeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background" aria-hidden="true">
      <picture>
        <source media="(min-width: 1024px)" srcSet="/auth-bg-1.png" />
        <source media="(min-width: 640px)" srcSet="/auth-bg-2.png" />
        <img
          src="/auth-bg-3.png"
          alt=""
          className="h-full w-full object-cover object-[52%_top] sm:object-center lg:object-[center_28%]"
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-transparent to-background/80 lg:bg-gradient-to-r lg:from-background/5 lg:via-background/20 lg:to-background/85" />
      <div className="auth-background-pulse absolute inset-0 bg-gradient-to-t from-background/75 via-transparent to-transparent" />
    </div>
  );
}
