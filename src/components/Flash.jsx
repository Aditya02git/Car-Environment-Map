import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';

const Flash = ({ position = [0, 0, 0], rotation = [0, 0, 0], intensity = 1.0, color = 0x00aaff, isActive = false }) => {
  const groupRef = useRef();
  const flare1Ref = useRef();
  const flare2Ref = useRef();
  const flare3Ref = useRef();
  const coreFlareRef = useRef();
  const revSequenceRef = useRef(null);
  const activeSequenceRef = useRef(null);

  // Create flare textures and materials
  const flareMaterials = useMemo(() => {
    const flareTexture = new THREE.TextureLoader().load(
      "https://threejs.org/examples/textures/lensflare/lensflare0.png"
    );

    // Core intense flare (bright center)
    const coreFlareMaterial = new THREE.SpriteMaterial({
      map: flareTexture,
      color: new THREE.Color(color).multiplyScalar(3.0),
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.01,
    });

    // Main flare (bright outer ring)
    const mainFlareMaterial = new THREE.SpriteMaterial({
      map: flareTexture,
      color: new THREE.Color(color).multiplyScalar(2.0),
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.01,
    });

    // Secondary flare (larger halo)
    const secondaryFlareMaterial = new THREE.SpriteMaterial({
      map: flareTexture,
      color: new THREE.Color(color).multiplyScalar(1.5),
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.01,
    });

    // Outer glow flare (largest)
    const outerFlareMaterial = new THREE.SpriteMaterial({
      map: flareTexture,
      color: new THREE.Color(color).multiplyScalar(1.0),
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.01,
    });

    return {
      core: coreFlareMaterial,
      main: mainFlareMaterial,
      secondary: secondaryFlareMaterial,
      outer: outerFlareMaterial
    };
  }, [color]);

  // Single flash burst effect - optimized for zero latency
  const triggerFlashBurst = () => {
    const core = coreFlareRef.current;
    const flare1 = flare1Ref.current;
    const flare2 = flare2Ref.current;
    const flare3 = flare3Ref.current;

    if (!core || !flare1 || !flare2 || !flare3) return;

    // Instant flash ON - maximum brightness (no delays)
    const maxIntensity = intensity;
    core.material.opacity = maxIntensity * 1.0;
    flare1.material.opacity = maxIntensity * 0.9;
    flare2.material.opacity = maxIntensity * 0.7;
    flare3.material.opacity = maxIntensity * 0.5;

    // Random scale variation for more realistic effect
    const scaleVariation = 0.8 + Math.random() * 0.4;
    core.scale.setScalar(0.6 * scaleVariation);
    flare1.scale.setScalar(1.2 * scaleVariation);
    flare2.scale.setScalar(2.0 * scaleVariation);
    flare3.scale.setScalar(3.5 * scaleVariation);

    // Immediate fade using requestAnimationFrame for smooth performance
    let fadeStartTime = null;
    const fadeOutDuration = 80;

    const fadeOut = (timestamp) => {
      if (!fadeStartTime) fadeStartTime = timestamp;
      const elapsed = timestamp - fadeStartTime;
      const progress = Math.min(elapsed / fadeOutDuration, 1);
      const opacity = Math.max(0, 1 - progress);

      if (core.material && flare1.material && flare2.material && flare3.material) {
        core.material.opacity = maxIntensity * opacity;
        flare1.material.opacity = maxIntensity * 0.9 * opacity;
        flare2.material.opacity = maxIntensity * 0.7 * opacity;
        flare3.material.opacity = maxIntensity * 0.5 * opacity;
      }

      if (progress < 1) {
        requestAnimationFrame(fadeOut);
      }
    };

    // Start fade after 30ms of full brightness
    setTimeout(() => {
      requestAnimationFrame(fadeOut);
    }, 30);
  };

  // Rev sequence - 2-3 quick flashes with zero latency
  const startRevSequence = () => {
    if (revSequenceRef.current) {
      clearTimeout(revSequenceRef.current);
    }

    // Random patterns: sometimes no flash, sometimes quick bursts, sometimes long sequences
    const patterns = [
      { type: 'none', chance: 0.15 }, // 15% chance of no flash at all
      { type: 'single', chance: 0.25 }, // 25% chance of single quick flash
      { type: 'short', chance: 0.35 }, // 35% chance of 2-3 flashes
      { type: 'long', chance: 0.20 }, // 20% chance of 4-6 flashes
      { type: 'extended', chance: 0.05 } // 5% chance of 7-10 flashes
    ];

    // Select pattern based on weighted random
    const random = Math.random();
    let cumulativeChance = 0;
    let selectedPattern = patterns[2]; // default to short

    for (const pattern of patterns) {
      cumulativeChance += pattern.chance;
      if (random <= cumulativeChance) {
        selectedPattern = pattern;
        break;
      }
    }

    // Handle no flash case
    if (selectedPattern.type === 'none') {
      revSequenceRef.current = null;
      return;
    }

    // Determine flash count and timing based on pattern
    let numberOfFlashes;
    let baseDelay;
    let delayVariation;

    switch (selectedPattern.type) {
      case 'single':
        numberOfFlashes = 1;
        baseDelay = 0; // No delay for single flash
        delayVariation = 0;
        break;
      case 'short':
        numberOfFlashes = 2 + Math.floor(Math.random() * 2); // 2-3 flashes
        baseDelay = 60 + Math.random() * 40; // 60-100ms between flashes
        delayVariation = 30;
        break;
      case 'long':
        numberOfFlashes = 4 + Math.floor(Math.random() * 3); // 4-6 flashes
        baseDelay = 80 + Math.random() * 60; // 80-140ms between flashes
        delayVariation = 50;
        break;
      case 'extended':
        numberOfFlashes = 7 + Math.floor(Math.random() * 4); // 7-10 flashes
        baseDelay = 40 + Math.random() * 30; // 40-70ms between flashes (rapid fire)
        delayVariation = 40;
        break;
    }

    let flashCount = 0;

    const executeFlashSequence = () => {
      if (flashCount < numberOfFlashes) {
        // Random chance to skip individual flashes for more realistic engine behavior
        const skipFlash = Math.random() < 0.1; // 10% chance to skip a flash
        
        if (!skipFlash) {
          triggerFlashBurst();
        }
        
        flashCount++;
        
        // Variable delay with more randomness for realistic engine timing
        let nextDelay;
        if (selectedPattern.type === 'single') {
          nextDelay = 0;
        } else {
          nextDelay = baseDelay + (Math.random() - 0.5) * delayVariation;
          // Ensure minimum delay
          nextDelay = Math.max(30, nextDelay);
        }
        
        revSequenceRef.current = setTimeout(executeFlashSequence, nextDelay);
      } else {
        revSequenceRef.current = null;
      }
    };

    executeFlashSequence();
  };

  // Continuous flash sequence when isActive is true
  const startActiveSequence = () => {
    if (!isActive) return;

    startRevSequence();

    // Schedule next sequence with random interval
    const nextInterval = 800 + Math.random() * 1500; // 800-2300ms between sequences
    activeSequenceRef.current = setTimeout(startActiveSequence, nextInterval);
  };

  // Handle isActive state changes
  useEffect(() => {
    if (isActive) {
      // Start the active sequence when isActive becomes true
      startActiveSequence();
    } else {
      // Clear all sequences when isActive becomes false
      if (activeSequenceRef.current) {
        clearTimeout(activeSequenceRef.current);
        activeSequenceRef.current = null;
      }
      if (revSequenceRef.current) {
        clearTimeout(revSequenceRef.current);
        revSequenceRef.current = null;
      }
    }

    return () => {
      if (activeSequenceRef.current) {
        clearTimeout(activeSequenceRef.current);
        activeSequenceRef.current = null;
      }
      if (revSequenceRef.current) {
        clearTimeout(revSequenceRef.current);
        revSequenceRef.current = null;
      }
    };
  }, [isActive, intensity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeSequenceRef.current) {
        clearTimeout(activeSequenceRef.current);
        activeSequenceRef.current = null;
      }
      if (revSequenceRef.current) {
        clearTimeout(revSequenceRef.current);
        revSequenceRef.current = null;
      }
    };
  }, []);

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={rotation}
    >
      {/* Core intense flare - smallest, brightest */}
      <sprite 
        ref={coreFlareRef}
        material={flareMaterials.core}
        scale={[0.6, 0.6, 0.6]}
        position={[0, 0, 0.1]}
      />
      
      {/* Main flare - medium size */}
      <sprite 
        ref={flare1Ref}
        material={flareMaterials.main}
        scale={[1.2, 1.2, 1.2]}
        position={[0, 0, 0.05]}
      />
      
      {/* Secondary flare - larger halo */}
      <sprite 
        ref={flare2Ref}
        material={flareMaterials.secondary}
        scale={[2.0, 2.0, 2.0]}
        position={[0, 0, 0]}
      />
      
      {/* Outer glow flare - largest */}
      <sprite 
        ref={flare3Ref}
        material={flareMaterials.outer}
        scale={[3.5, 3.5, 3.5]}
        position={[0, 0, -0.05]}
      />
    </group>
  );
};

export default Flash;