/**
 * ThreeDProductScene — placeholder scene.
 *
 * Lightweight stub so the page composes end-to-end. Replace with the real
 * 3D product scene. CSS-only visuals (no SVG / vector graphics). The new
 * ThreeDBottleScene is rendered immediately after this component.
 */
export default function ThreeDProductScene() {
  return (
    <section className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#050505] via-[#101418] to-[#050505]">
      <div className="text-center">
        <h2 className="text-3xl font-medium tracking-tight text-sky-100/80 md:text-5xl">
          Every angle
        </h2>
        <p className="mt-4 text-sm text-white/40">3D product scene placeholder</p>
      </div>
    </section>
  );
}
