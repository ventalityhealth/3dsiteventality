/**
 * HeroLogScene — placeholder scene.
 *
 * NOTE: This is a lightweight stub so the page composes end-to-end. Replace it
 * with the real hero/log scene implementation. It intentionally uses only CSS
 * (no SVG, no vector graphics) for its visuals.
 */
export default function HeroLogScene() {
  return (
    <section className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#0a0a0a] via-[#111111] to-[#050505]">
      <div className="text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.5em] text-amber-200/60">
          Ventality Health
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-foreground md:text-7xl">
          Shilajit
        </h1>
        <p className="mt-4 text-sm text-white/40">Hero scene placeholder</p>
      </div>
    </section>
  );
}
