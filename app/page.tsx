import HeroLogScene from "./components/HeroLogScene";
import VineGrowthScene from "./components/VineGrowthScene";
import ProductWrapScene from "./components/ProductWrapScene";
import ThreeDProductScene from "./components/ThreeDProductScene";
import ThreeDBottleScene from "./components/ThreeDBottleScene";
import MouseTrail from "./components/MouseTrail";

export default function Home() {
  return (
    <main className="relative w-full">
      <HeroLogScene />
      <VineGrowthScene />
      <ProductWrapScene />
      <ThreeDProductScene />
      <ThreeDBottleScene />
      <MouseTrail />
    </main>
  );
}
