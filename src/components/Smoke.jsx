import React, { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const Smoke = ({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  isActive = true,
  particlesPerEmission = 2,
  emissionRate = 60,
  particleLifetime = 1500,
  color = [0.5, 0.5, 0.5],
  opacity = 0.6,
  scale = 1
}) => {
  const groupRef = useRef()
  const particlesRef = useRef([])
  const lastEmissionRef = useRef(0)
  const materialRef = useRef()

  // Create realistic smoke texture
  const smokeTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')

// Create radial gradient for realistic white smoke
const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
gradient.addColorStop(0, 'rgba(220, 220, 220, 1)')     // bright center
gradient.addColorStop(0.4, 'rgba(240, 240, 240, 0.7)') // lighter gray
gradient.addColorStop(0.8, 'rgba(250, 250, 250, 0.3)') // almost white
gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')     // fade to transparent


    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [])

  // Create smoke material
  const smokeMaterial = useMemo(() => {
    const material = new THREE.SpriteMaterial({
      map: smokeTexture,
      transparent: true,
      opacity: opacity,
      color: new THREE.Color(...color),
      blending: THREE.NormalBlending,
      depthWrite: false
    })
    materialRef.current = material
    return material
  }, [smokeTexture, opacity, color])

  // Particle class equivalent
  const createParticle = useCallback((emissionPos) => {
    const particle = {
      position: emissionPos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        Math.random() * 0.1,
        (Math.random() - 0.5) * 0.2
      )),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 1
      ),
      age: 0,
      lifetime: particleLifetime + Math.random() * 500,
      startScale: (Math.random() * 0.3 + 0.15) * scale,
      finalScale: 0,
      sprite: null
    }
    
    particle.finalScale = particle.startScale + (Math.random() * 0.6 + 0.4) * scale
    
    // Create sprite
    particle.sprite = new THREE.Sprite(smokeMaterial.clone())
    particle.sprite.position.copy(particle.position)
    particle.sprite.scale.setScalar(particle.startScale)
    
    return particle
  }, [smokeMaterial, particleLifetime, scale])

  // Update particle system
  useFrame((state, delta) => {
    const deltaMs = delta * 1000
    const now = state.clock.elapsedTime * 1000

    // Add new particles if active
    if (isActive && now - lastEmissionRef.current > emissionRate) {
      lastEmissionRef.current = now
      
      const emissionPos = new THREE.Vector3(...position)
      
      for (let i = 0; i < particlesPerEmission; i++) {
        const particle = createParticle(emissionPos)
        particlesRef.current.push(particle)
        
        if (groupRef.current) {
          groupRef.current.add(particle.sprite)
        }
      }
    }

    // Update existing particles
    particlesRef.current = particlesRef.current.filter(particle => {
      // Update position
      particle.position.add(
        particle.velocity.clone().multiplyScalar(deltaMs * 0.001)
      )
      
      // Update age
      particle.age += deltaMs
      
      // Calculate life fraction
      const lifeFrac = particle.age / particle.lifetime
      
      // Apply drag to velocity
      particle.velocity.multiplyScalar(Math.pow(0.95, deltaMs * 0.06))
      
      // Calculate current scale and opacity
      const currentScale = particle.startScale + lifeFrac * (particle.finalScale - particle.startScale)
      const opacity = lifeFrac < 0.2 
        ? lifeFrac * 3.5 
        : (1 - lifeFrac) * 0.875

      // Update sprite
      if (particle.sprite) {
        particle.sprite.position.copy(particle.position)
        particle.sprite.scale.setScalar(currentScale)
        particle.sprite.material.opacity = Math.max(0, opacity)
      }

      // Check if particle is alive
      const isAlive = particle.age < particle.lifetime
      
      // Clean up dead particles
      if (!isAlive && particle.sprite) {
        if (groupRef.current) {
          groupRef.current.remove(particle.sprite)
        }
        particle.sprite.material.dispose()
      }
      
      return isAlive
    })
  })

  return (
    <group 
      ref={groupRef} 
      position={position} 
      rotation={rotation}
    />
  )
}

export default Smoke