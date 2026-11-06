import { useEffect, useState } from "react";

const imageFolders = {
  phone: "/iphone-vertical",
  tabletPortrait: "/Tablete-vertical",
  tabletLandscape: "/tablete-horizontal",
  desktop: "/Computador-horizontal",
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
    const standalone = window.matchMedia("(display-mode: standalone)");
    let lastScreenWidth = 0;
    const syncScreenHeight = () => {
      const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
      const installed = typeof iosStandalone === "boolean" && (iosStandalone || standalone.matches);
      const phone =
        window.matchMedia("(max-width: 767px)").matches &&
        Math.min(screen.width, screen.height) < 768;
      if (!installed || !phone) {
        root.style.removeProperty("--auth-screen-height");
        lastScreenWidth = 0;
        return;
      }
      // In an installed iPhone app, svh can omit the system inset. The physical
      // screen size stays stable while chrome changes or the keyboard opens.
      if (
        window.innerWidth === lastScreenWidth &&
        root.style.getPropertyValue("--auth-screen-height")
      )
        return;
      lastScreenWidth = window.innerWidth;
      const landscape = window.matchMedia("(orientation: landscape)").matches;
      const height = landscape
        ? Math.min(screen.width, screen.height)
        : Math.max(screen.width, screen.height);
      root.style.setProperty("--auth-screen-height", `${height}px`);
    };
    syncScreenHeight();
    window.addEventListener("resize", syncScreenHeight);
    window.addEventListener("orientationchange", syncScreenHeight);
    standalone.addEventListener("change", syncScreenHeight);
    root.dataset.authHero = "true";
    for (const [property, folder] of Object.entries(canvasImages)) {
      root.style.setProperty(property, `url("${imagePath(folder, selected)}")`);
    }
    return () => {
      window.removeEventListener("resize", syncScreenHeight);
      window.removeEventListener("orientationchange", syncScreenHeight);
      standalone.removeEventListener("change", syncScreenHeight);
      root.style.removeProperty("--auth-screen-height");
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
