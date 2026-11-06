import { useEffect, useState } from "react";

const imageFolders = {
  phone: "/iphonevertical",
  tabletPortrait: "/Tabletevertical",
  tabletLandscape: "/tabletehorizontal",
  desktop: "/Computadorhorizontal",
} as const;

const imageCount = 5;
const imagePath = (folder: string, variant: number) => `${folder}/${variant}.png`;

export function AuthHeroBackground() {
  // Keep SSR and the first client render identical; randomize after hydration.
  const [variant, setVariant] = useState(1);

  useEffect(() => {
    const selected = Math.floor(Math.random() * imageCount) + 1;
    setVariant(selected);

    // Safari's status bar and overscroll use the same art direction as <picture>.
    // CSS chooses the matching variable on resize and orientation changes.
    const root = document.documentElement;
    const canvasImages = {
      "--auth-hero-phone-image": imageFolders.phone,
      "--auth-hero-tablet-portrait-image": imageFolders.tabletPortrait,
      "--auth-hero-tablet-landscape-image": imageFolders.tabletLandscape,
      "--auth-hero-desktop-image": imageFolders.desktop,
    };
    root.dataset.authHero = "true";
    for (const [property, folder] of Object.entries(canvasImages)) {
      root.style.setProperty(property, `url("${imagePath(folder, selected)}")`);
    }
    return () => {
      delete root.dataset.authHero;
      for (const property of Object.keys(canvasImages)) root.style.removeProperty(property);
    };
  }, []);

  return (
    <div
      className="auth-hero-background pointer-events-none fixed inset-x-0 top-0 overflow-hidden"
      aria-hidden="true"
    >
      <picture>
        <source media="(min-width: 1280px)" srcSet={imagePath(imageFolders.desktop, variant)} />
        <source
          media="(min-width: 768px) and (orientation: landscape)"
          srcSet={imagePath(imageFolders.tabletLandscape, variant)}
        />
        <source
          media="(min-width: 768px)"
          srcSet={imagePath(imageFolders.tabletPortrait, variant)}
        />
        <img
          src={imagePath(imageFolders.phone, variant)}
          alt=""
          className="auth-hero-photo absolute top-0 h-[105%] w-full max-w-none object-cover object-[52%_top] md:h-full md:object-center"
        />
      </picture>
      {/* Gradual frosted finish, confined to the bottom of the photo. */}
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-black/10 backdrop-blur-[3px] [mask-image:linear-gradient(to_bottom,transparent,black)]" />
      <div className="auth-hero-shade absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
    </div>
  );
}
