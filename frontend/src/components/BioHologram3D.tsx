'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BioHologram3DProps {
  color?: string;
  size?: number;
  isPulsing?: boolean;
}

export const BioHologram3D: React.FC<BioHologram3DProps> = ({
  color = '#0066ff',
  size = 46,
  isPulsing = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // 1. Scene & Camera setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 2.6;

    // 2. WebGL Renderer with alpha transparency and antialiasing
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // 3. 3D Geometries - Medical Hologram Core
    const hexColor = new THREE.Color(color);

    // Inner wireframe sphere
    const innerGeo = new THREE.IcosahedronGeometry(0.72, 1);
    const innerMat = new THREE.MeshBasicMaterial({
      color: hexColor,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerMesh);

    // Outer orbiting faceted cage
    const outerGeo = new THREE.DodecahedronGeometry(0.98, 0);
    const outerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#38bdf8'),
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    scene.add(outerMesh);

    // Luminous core sphere
    const coreGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const coreMat = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.35,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // 4. Orbiting particle cloud
    const particlesCount = 28;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.1 + Math.random() * 0.25;
      posArray[i] = r * Math.sin(phi) * Math.cos(theta);
      posArray[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      posArray[i + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.05,
      color: new THREE.Color('#60a5fa'),
      transparent: true,
      opacity: 0.75,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 5. Animation loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const speed = isPulsing ? 1.8 : 1.0;

      innerMesh.rotation.x = elapsed * 0.45 * speed;
      innerMesh.rotation.y = elapsed * 0.65 * speed;

      outerMesh.rotation.x = -elapsed * 0.35 * speed;
      outerMesh.rotation.z = elapsed * 0.55 * speed;

      particleSystem.rotation.y = elapsed * 0.25 * speed;

      // Subtle breath pulse
      const scale = 1 + Math.sin(elapsed * 2.5) * 0.04;
      innerMesh.scale.set(scale, scale, scale);

      renderer.render(scene, camera);
    };

    animate();

    // 6. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      innerGeo.dispose();
      innerMat.dispose();
      outerGeo.dispose();
      outerMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, [color, size, isPulsing]);

  return (
    <div
      ref={mountRef}
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center pointer-events-none drop-shadow-[0_0_10px_rgba(0,102,255,0.4)]"
    />
  );
};
