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
    const selected = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    setBackground(selected);

    // Safari also paints the document canvas behind its status bar and overscroll.
    // Keep that canvas continuous with the hero instead of the dark app theme.
    const root = document.documentElement;
    root.dataset.authHero = "true";
    root.style.setProperty("--auth-hero-image", `url("${selected}")`);
    return () => {
      delete root.dataset.authHero;
      root.style.removeProperty("--auth-hero-image");
    };
  }, []);

  return (
    <div
      className="auth-hero-background pointer-events-none fixed inset-x-0 top-0 overflow-hidden"
      aria-hidden="true"
    >
      <img
        src={background}
        alt=""
        className="absolute top-0 h-[105%] w-full max-w-none object-cover object-[52%_top] md:h-full md:object-center lg:object-[center_28%]"
      />
      {/* Fade the subtle sky blur out before it reaches the portrait. */}
      <div className="absolute inset-x-0 top-0 h-[22%] backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      {/* Gradual frosted finish, confined to the bottom of the photo. */}
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-black/10 backdrop-blur-[3px] [mask-image:linear-gradient(to_bottom,transparent,black)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 lg:bg-gradient-to-r lg:from-background/5 lg:via-background/20 lg:to-background/85" />
    </div>
  );
}
