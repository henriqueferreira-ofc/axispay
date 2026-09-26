export function AuthHeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background" aria-hidden="true">
      <picture className="absolute inset-0 block">
        <source media="(min-width: 1024px)" srcSet="/auth-bg-1.png" />
        <source media="(min-width: 640px)" srcSet="/auth-bg-2.png" />
        <img
          src="/auth-bg-3.png"
          alt=""
          className="h-full w-full object-cover object-top"
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/5 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
  );
}
