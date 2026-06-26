"use client";

import { useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";

/* -------------------------------------------------------------------------- */
/*  Asset paths — every visual is a photographic PNG (zero SVG / vectors).     */
/* -------------------------------------------------------------------------- */
const BOTTLE_SRC = "/assets/products/shilajit/bottle/shilajit-bottle-composite.png";
const STONE_SRC = "/assets/products/shilajit/backgrounds/wet-stone-base.png";
const GLOW_SRC = "/assets/global/botanical-kit/glow/golden-light-sweep.png";

/** Shared scroll progress handle (0 -> 1), driven by GSAP ScrollTrigger. */
type ScrollProps = { scrollRef: { current: number } };

/**
 * Deterministic, seeded pseudo-random in [0, 1) using a Math.sin hash. Keeps
 * particle layouts stable across renders / SSR without pulling in a PRNG.
 */
function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * useTexture onLoad helper: tags photographic textures as sRGB. Done here
 * (inside the loader callback) rather than mutating the hook's return value in
 * a component body, which the react-hooks/immutability rule forbids.
 */
function tagSRGB(texture: THREE.Texture | THREE.Texture[]): void {
  const tex = Array.isArray(texture) ? texture[0] : texture;
  tex.colorSpace = THREE.SRGBColorSpace;
}

/* -------------------------------------------------------------------------- */
/*  Bottle — the composite PNG on a plane. The bottle IS the photo.           */
/* -------------------------------------------------------------------------- */
function Bottle({ scrollRef }: ScrollProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(BOTTLE_SRC, tagSRGB);

  // useThree() is read here for the viewport only — NOT for the camera (the
  // camera is mutated inside useFrame to avoid R3F immutability lint errors).
  const { viewport } = useThree();
  // Scale the bottle plane to a sensible fraction of the visible viewport while
  // preserving the source aspect ratio (576 x 1024).
  const aspect = 576 / 1024;
  const height = Math.min(2.6, viewport.height * 0.82);
  const width = height * aspect;

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { pointer } = state;
    const progress = scrollRef.current;

    // Scroll rotates the bottle 25° around Y.
    mesh.rotation.y = THREE.MathUtils.degToRad(25) * progress;
    // Mouse tilts it subtly.
    mesh.rotation.x = pointer.y * 0.15;
    mesh.position.x = pointer.x * 0.2;
    // Subtle continuous float.
    mesh.position.y = Math.sin(Date.now() * 0.001) * 0.02;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        transparent
        roughness={0.65}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  CameraRig — orbits the camera from scroll + mouse, always facing origin.   */
/* -------------------------------------------------------------------------- */
function CameraRig({ scrollRef }: ScrollProps) {
  useFrame((state) => {
    const { camera, pointer } = state;
    const progress = scrollRef.current;

    // angle: +0.25 rad (slightly right) at start -> -0.25 rad (left) at end.
    const angle = THREE.MathUtils.lerp(0.25, -0.25, progress);
    const radius = 3.5;

    camera.position.x = Math.sin(angle) * radius + pointer.x * 0.4;
    camera.position.y = pointer.y * 0.3;
    camera.position.z = Math.cos(angle) * radius;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  StoneBackground — dark wet-stone PNG far behind, parallaxing with mouse.   */
/* -------------------------------------------------------------------------- */
function StoneBackground() {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(STONE_SRC, tagSRGB);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { pointer } = state;
    // Parallax: moves opposite the mouse direction.
    mesh.position.x = -pointer.x * 0.3;
    mesh.position.y = -pointer.y * 0.2;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -3]}>
      <planeGeometry args={[8, 5]} />
      <meshBasicMaterial map={texture} transparent opacity={0.6} depthWrite={false} />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  ParticleField — one additive point system. Floats up, resets, drifts.     */
/* -------------------------------------------------------------------------- */
type ParticleFieldProps = {
  count: number;
  zMin: number;
  zMax: number;
  size: number;
  seed: number;
};

const FIELD_TOP = 2.6;
const FIELD_BOTTOM = -2.6;
const FIELD_HALF_HEIGHT = FIELD_TOP - FIELD_BOTTOM;

function ParticleField({ count, zMin, zMax, size, seed }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r1 = hash(seed + i * 1.13);
      const r2 = hash(seed + i * 2.71 + 0.5);
      const r3 = hash(seed + i * 3.33 + 0.9);
      const r4 = hash(seed + i * 4.21 + 1.7);
      positions[i * 3] = (r1 - 0.5) * 6; // x
      positions[i * 3 + 1] = (r2 - 0.5) * FIELD_HALF_HEIGHT; // y
      positions[i * 3 + 2] = zMin + r3 * (zMax - zMin); // z
      speeds[i] = 0.05 + r4 * 0.18; // upward drift speed (units/sec)
    }
    return { positions, speeds };
  }, [count, zMin, zMax, seed]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    const { pointer } = state;

    // Whole system drifts with mouse parallax.
    points.position.x = pointer.x * 0.15;
    points.position.y = pointer.y * 0.1;

    // Float each particle upward; reset to the bottom when it exits the top.
    const attr = points.geometry.attributes.position;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const yi = i * 3 + 1;
      arr[yi] += speeds[i] * delta;
      if (arr[yi] > FIELD_TOP) arr[yi] = FIELD_BOTTOM;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#ffe9c7"
        opacity={0.9}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/*  GoldenSweep — additive golden-light PNG that crosses the frame mid-scroll. */
/* -------------------------------------------------------------------------- */
function GoldenSweep({ scrollRef }: ScrollProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(GLOW_SRC, tagSRGB);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const progress = scrollRef.current;
    const material = mesh.material as THREE.MeshBasicMaterial;

    // Fade in only across the mid-scroll band (0.3 -> 0.7), peaking at 0.35.
    let target = 0;
    if (progress > 0.3 && progress < 0.7) {
      const t = (progress - 0.3) / 0.4; // 0..1 within the band
      target = 0.35 * Math.sin(t * Math.PI); // bell curve 0 -> 1 -> 0
    }
    material.opacity = THREE.MathUtils.lerp(material.opacity, target, 0.1);

    // Sweep across the frame and bob vertically.
    mesh.position.x = THREE.MathUtils.lerp(-1.5, 1.5, progress);
    mesh.position.y = Math.sin(progress * Math.PI) * 0.5;
  });

  return (
    <mesh ref={meshRef} position={[-1.5, 0, 0.3]}>
      <planeGeometry args={[3, 4]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Effects — bloom + vignette + film grain.                                  */
/* -------------------------------------------------------------------------- */
function Effects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.3}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Vignette darkness={0.55} eskil={false} />
      <Noise opacity={0.015} />
    </EffectComposer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scene — everything inside the Canvas.                                      */
/* -------------------------------------------------------------------------- */
function Scene({ scrollRef }: ScrollProps) {
  return (
    <Suspense fallback={null}>
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 1, 2]} intensity={0.4} color="#ffd4a0" />

      <CameraRig scrollRef={scrollRef} />
      <StoneBackground />

      {/* 40 particles behind the bottle */}
      <ParticleField count={40} zMin={-3} zMax={-1} size={0.012} seed={11.7} />

      <Bottle scrollRef={scrollRef} />

      {/* 30 particles in front of the bottle */}
      <ParticleField count={30} zMin={0.5} zMax={2} size={0.02} seed={97.3} />

      <GoldenSweep scrollRef={scrollRef} />

      <Effects />
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/*  DOM overlay content.                                                       */
/* -------------------------------------------------------------------------- */
const CARDS = [
  {
    title: "Purified Resin",
    description:
      "Cliff-harvested shilajit, triple-filtered and lab-verified for fulvic acid potency.",
  },
  {
    title: "85+ Trace Minerals",
    description:
      "A full-spectrum mineral complex delivered in a fast-absorbing resin base.",
  },
  {
    title: "Third-Party Tested",
    description:
      "Every batch screened for heavy metals and authenticity before it ships.",
  },
];

/* -------------------------------------------------------------------------- */
/*  ThreeDBottleScene — pinned, scroll-driven 3D product viewer section.       */
/* -------------------------------------------------------------------------- */
export default function ThreeDBottleScene() {
  const scrollRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Respect reduced-motion: skip the scroll-driven animation entirely.
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.to(scrollRef, {
        current: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".td-section",
          start: "top top",
          end: "+=200%",
          scrub: 0.5,
          pin: true,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <section className="td-section relative h-[100dvh] w-full overflow-hidden bg-black">
      <Canvas
        className="absolute inset-0"
        style={{ position: "absolute", inset: 0 }}
        dpr={[1, 1.5]}
        camera={{ position: [0.5, 0, 3.5], fov: 35 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <Scene scrollRef={scrollRef} />
      </Canvas>

      {/* Vignette overlay above the canvas (radial darken toward the edges). */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* DOM overlay: liquid-glass info cards, bottom-right. */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-end p-6 md:p-10">
        <div className="flex w-full max-w-xs flex-col gap-3">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: "easeOut" }}
              className="liquid-glass pointer-events-auto cursor-pointer rounded-2xl p-4"
              style={{ willChange: "transform, opacity" }}
            >
              <h3 className="text-sm font-semibold tracking-wide text-amber-100">
                {card.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                {card.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
