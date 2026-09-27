export function AuthHeroBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-black"
      aria-hidden="true"
    >
      <picture>
        <source media="(min-width: 1024px)" srcSet="/auth-bg-2.png" />
        <source media="(min-width: 640px)" srcSet="/auth-bg-2.png" />
        <img
          src="/auth-bg-3.png"
          alt=""
          className="h-full w-full object-cover object-[52%_top] sm:object-center lg:object-[center_21%]"
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/25 to-black/30 lg:bg-none lg:bg-black/5" />
    </div>
  );
}
