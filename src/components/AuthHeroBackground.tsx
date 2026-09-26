import { useEffect, useState } from "react";

const PHOTOS = ["/auth-bg-1.png", "/auth-bg-2.png", "/auth-bg-3.png"];
const PHOTO_KEY = "axispay.lastWelcomePhoto";
let lastPhoto: string | null = null;

export function AuthHeroBackground() {
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    let selected = false;
    const selectPhoto = () => {
      if (selected || document.hidden) return;
      selected = true;
      let previous = lastPhoto;
      try { previous = localStorage.getItem(PHOTO_KEY) || previous; } catch { /* Use memory fallback. */ }
      const choices = PHOTOS.filter((path) => path !== previous);
      const next = choices[Math.floor(Math.random() * choices.length)];
      lastPhoto = next;
      try { localStorage.setItem(PHOTO_KEY, next); } catch { /* Use memory fallback. */ }
      setPhoto(next);
    };
    selectPhoto();
    document.addEventListener("visibilitychange", selectPhoto);
    return () => document.removeEventListener("visibilitychange", selectPhoto);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background" aria-hidden="true">
      {photo && (
        <img
          src={photo}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top sm:object-[center_20%]"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/5 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
  );
}
