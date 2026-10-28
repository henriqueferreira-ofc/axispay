import { useEffect, useState } from "react";

const backgrounds = [
  "/auth-tennis.png",
  "/auth-racing.png",
  "/auth-ski.png",
  "/auth-surf.png",
];

export function AuthHeroBackground() {
  const [background, setBackground] = useState(backgrounds[0]);

  useEffect(() => {
    setBackground(backgrounds[Math.floor(Math.random() * backgrounds.length)]);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-background"
      aria-hidden="true"
    >
      <img
        src={background}
        alt=""
        className="h-full w-full object-cover object-[52%_top] sm:object-center lg:object-[center_28%]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-transparent to-background/80 lg:bg-gradient-to-r lg:from-background/5 lg:via-background/20 lg:to-background/85" />
      <div className="auth-background-pulse absolute inset-0 bg-gradient-to-t from-background/75 via-transparent to-transparent" />
    </div>
  );
}
