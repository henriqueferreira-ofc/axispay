import { useEffect, useState } from "react";

const backgrounds = [
  "/auth-tennis.png",
  "/auth-racing.png",
  "/auth-ski.png",
  "/auth-surf.png",
  "/auth-card.png",
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
        className="absolute bottom-0 h-[108%] w-full max-w-none object-cover object-[52%_bottom] md:h-full md:object-center lg:object-[center_28%]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 lg:bg-gradient-to-r lg:from-background/5 lg:via-background/20 lg:to-background/85" />
    </div>
  );
}
