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
      try {
        previous = localStorage.getItem(PHOTO_KEY) || previous;
      } catch {
        /* Use memory fallback. */
      }
      const next = PHOTOS[(PHOTOS.indexOf(previous || "") + 1) % PHOTOS.length];
      lastPhoto = next;
      try {
        localStorage.setItem(PHOTO_KEY, next);
      } catch {
        /* Use memory fallback. */
      }
      setPhoto(next);
    };
    selectPhoto();
    document.addEventListener("visibilitychange", selectPhoto);
    return () => document.removeEventListener("visibilitychange", selectPhoto);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-black"
      aria-hidden="true"
    >
      {photo && (
        <img
          src={photo}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover object-[52%_top] sm:object-center ${photo === "/auth-bg-1.png" ? "lg:object-[center_28%]" : "lg:object-[center_21%]"}`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/25 to-black/30 lg:bg-none lg:bg-black/5" />
    </div>
  );
}
