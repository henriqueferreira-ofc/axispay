import { useEffect, useState } from "react";

const AUTH_BACKGROUNDS = ["/auth-bg-1.png", "/auth-bg-2.png", "/auth-bg-3.png"];

export function AuthHeroBackground() {
  // Picked client-side only: this page is server-rendered, and a random
  // pick made during render would differ between server and client and
  // trigger a hydration mismatch.
  const [bg, setBg] = useState<string | null>(null);

  useEffect(() => {
    setBg(AUTH_BACKGROUNDS[Math.floor(Math.random() * AUTH_BACKGROUNDS.length)]);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {bg && (
        <img
          src={bg}
          alt=""
          className="h-full w-full object-cover object-top animate-in fade-in duration-500"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/5 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
  );
}
