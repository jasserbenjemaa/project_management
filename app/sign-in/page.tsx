"use client";

import { useEffect, useRef } from "react";
import { NeatGradient, NeatConfig } from "@firecms/neat";
import { SignInCard } from "@/features/sign-in-card";
const config: Omit<NeatConfig, "ref"> = {
  colors: [
    { color: "#FAFAFA", enabled: true },
    { color: "#10ACDB", enabled: true },
    { color: "#0E98CA", enabled: true },
    { color: "#0D86BE", enabled: true },
    { color: "#0FA4D3", enabled: true },
  ],
  speed: 3,
  horizontalPressure: 5,
  verticalPressure: 7,
  waveFrequencyX: 2,
  waveFrequencyY: 2,
  waveAmplitude: 8,
  shadows: 6,
  highlights: 8,
  colorBrightness: 1,
  colorSaturation: 7,
  wireframe: false,
  colorBlending: 10,
  backgroundColor: "#004E64",
  backgroundAlpha: 1,
  grainScale: 3,
  grainSparsity: 0,
  grainIntensity: 0.3,
  grainSpeed: 1,
  resolution: 1,
  yOffset: 0.0999755859375,
  yOffsetWaveMultiplier: 4,
  yOffsetColorMultiplier: 6.3,
  yOffsetFlowMultiplier: 4,
  flowDistortionA: 0,
  flowDistortionB: 0,
  flowScale: 1,
  flowEase: 0,
  flowEnabled: false,
  enableProceduralTexture: false,
  transparentTextureVoid: false,
  textureVoidLikelihood: 0.45,
  textureVoidWidthMin: 200,
  textureVoidWidthMax: 486,
  textureBandDensity: 2.15,
  textureColorBlending: 0.01,
  textureSeed: 333,
  textureEase: 0.5,
  proceduralBackgroundColor: "#000000",
  textureShapeTriangles: 20,
  textureShapeCircles: 15,
  textureShapeBars: 15,
  textureShapeSquiggles: 10,
  domainWarpEnabled: false,
  domainWarpIntensity: 0,
  domainWarpScale: 3,
  vignetteIntensity: 0,
  vignetteRadius: 0.8,
  fresnelEnabled: false,
  fresnelPower: 2,
  fresnelIntensity: 0.5,
  fresnelColor: "#FFFFFF",
  iridescenceEnabled: false,
  iridescenceIntensity: 0.5,
  iridescenceSpeed: 1,
  bloomIntensity: 0,
  bloomThreshold: 0.7,
  chromaticAberration: 0,
  shapeType: "plane" as const,
  shapeRotationX: 0,
  shapeRotationY: 0,
  shapeRotationZ: 0,
  shapeAutoRotateSpeedX: 0,
  shapeAutoRotateSpeedY: 0,
  sphereRadius: 15,
  torusRadius: 15,
  torusTube: 5,
  cylinderRadius: 10,
  cylinderHeight: 40,
  planeBend: 0,
  planeTwist: 0,
  silhouetteFade: 0.25,
  cylinderFade: 0.08,
  ribbonFade: 0.05,
  flatShading: true,
  cameraLock: true,
  cameraX: 0,
  cameraY: 0,
  cameraZ: 0,
  cameraRotationX: 0,
  cameraRotationY: 0,
  cameraRotationZ: 0,
  cameraZoom: 1,
};

const SignInPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradientRef = useRef<NeatGradient | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gradient = new NeatGradient({
      ref: canvas,
      ...config,
    });
    gradientRef.current = gradient;

    // Keep the canvas's internal pixel buffer in sync with its displayed size
    const resizeCanvas = () => {
      const { clientWidth, clientHeight } = canvas;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
    };

    resizeCanvas();

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(canvas);

    const handleScroll = () => {
      gradient.yOffset = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
      gradient.destroy?.();
    };
  }, []);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-screen h-screen z-[-1] block"
      />
      <SignInCard />
    </div>
  );
};

export default SignInPage;
