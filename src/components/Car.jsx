import * as THREE from 'three'
import { useLayoutEffect, useRef, useState, Suspense } from 'react'
import { Canvas, applyProps, useFrame } from '@react-three/fiber'
import { PerformanceMonitor, AccumulativeShadows, RandomizedLight, Environment, Lightformer, Float, useGLTF, OrbitControls, Html, useProgress } from '@react-three/drei'
import { LayerMaterial, Color, Depth } from 'lamina'
import Overlay from './Overlay'
import Smoke from './Smoke'
import Flash from './Flash'
import revIcon from '/speedometer.png'
import startIcon from '/lightning.png'
import githubIcon from '/github.png'

// Loading component
function Loader() {
  const { active, progress, errors, item, loaded, total } = useProgress()
  
  return (
    <Html center>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '30px',
        borderRadius: '10px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Loading spinner */}
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderTop: '3px solid #cc00ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        
        {/* Progress bar */}
        <div style={{
          width: '200px',
          height: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '15px'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: '#cc00ff',
            transition: 'width 0.3s ease',
            borderRadius: '2px'
          }} />
        </div>
        
        {/* Loading text and percentage */}
        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
          Loading Lamborghini...
        </div>
        <div style={{ fontSize: '14px', opacity: 0.8 }}>
          {Math.round(progress)}% ({loaded} of {total} items)
        </div>
        
        {/* Current item being loaded */}
        {item && (
          <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '10px' }}>
            Loading: {item}
          </div>
        )}
        
        {/* Error display */}
        {errors.length > 0 && (
          <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '10px' }}>
            Errors: {errors.length}
          </div>
        )}
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </Html>
  )
}

// Fallback loading screen for the entire app
function AppLoader() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      zIndex: 1000
    }}>
      {/* Animated car icon */}
      <div style={{
        width: '80px',
        height: '80px',
        border: '4px solid rgba(204, 0, 255, 0.3)',
        borderTop: '4px solid #cc00ff',
        borderRadius: '50%',
        animation: 'spin 1.5s linear infinite',
        marginBottom: '30px'
      }} />
      
      <p style={{ margin: 0, fontSize: '16px', opacity: 0.8 }}>
        Loading 3D Experience
      </p>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// Engine sound management using Web Audio API
class EngineAudio {
  constructor() {
    // Initialize Web Audio API
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    // Audio buffers for each sound
    this.startBuffer = null
    this.loopBuffer = null
    this.endBuffer = null
    this.revBuffer = null
    
    // Audio sources and gain nodes
    this.startSource = null
    this.loopSource = null
    this.endSource = null
    this.revSource = null
    
    this.startGain = this.audioContext.createGain()
    this.loopGain = this.audioContext.createGain()
    this.endGain = this.audioContext.createGain()
    this.revGain = this.audioContext.createGain()
    
    // Connect gain nodes to destination
    this.startGain.connect(this.audioContext.destination)
    this.loopGain.connect(this.audioContext.destination)
    this.endGain.connect(this.audioContext.destination)
    this.revGain.connect(this.audioContext.destination)
    
    // Set initial volumes
    this.startGain.gain.value = 1.0
    this.loopGain.gain.value = 0.0
    this.endGain.gain.value = 1.0
    this.revGain.gain.value = 1.0
    
    this.isRunning = false
    this.isRevving = false
    this.scheduledEvents = []
    this.normalLoopVolume = 1.0  // Normal loop volume when not revving
    this.revLoopVolume = 0.3     // Reduced loop volume when revving
    
    // Load audio files
    this.loadAudioFiles()
  }

  async loadAudioFiles() {
    try {
      const [startResponse, loopResponse, endResponse, revResponse] = await Promise.all([
        fetch('/start.mp3'),
        fetch('/loop.mp3'),
        fetch('/end.mp3'),
        fetch('/rev.mp3')
      ])

      const [startArrayBuffer, loopArrayBuffer, endArrayBuffer, revArrayBuffer] = await Promise.all([
        startResponse.arrayBuffer(),
        loopResponse.arrayBuffer(),
        endResponse.arrayBuffer(),
        revResponse.arrayBuffer()
      ])

      this.startBuffer = await this.audioContext.decodeAudioData(startArrayBuffer)
      this.loopBuffer = await this.audioContext.decodeAudioData(loopArrayBuffer)
      this.endBuffer = await this.audioContext.decodeAudioData(endArrayBuffer)
      this.revBuffer = await this.audioContext.decodeAudioData(revArrayBuffer)

      console.log('Audio files loaded successfully')
    } catch (error) {
      console.error('Error loading audio files:', error)
    }
  }

  createAudioSource(buffer, gainNode, loop = false, loopStart = 0.3, loopEnd = null) {
    if (!buffer) return null
    
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    
    if (loop) {
      source.loop = true
      source.loopStart = loopStart
      source.loopEnd = loopEnd || (buffer.duration - 0.3)
    }
    
    source.connect(gainNode)
    return source
  }

  clearScheduledEvents() {
    this.scheduledEvents.forEach(eventId => clearTimeout(eventId))
    this.scheduledEvents = []
  }

  async startEngine() {
    if (this.isRunning || !this.startBuffer || !this.loopBuffer) return
    
    // Resume audio context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
    
    this.isRunning = true
    
    try {
      // Stop any existing sources and clear events
      this.stopAllSources()
      this.clearScheduledEvents()
      
      const currentTime = this.audioContext.currentTime
      const fadeTime = 0.1 // 100ms fade for seamless transition
      
      // Create and start the start source
      this.startSource = this.createAudioSource(this.startBuffer, this.startGain, false)
      this.startGain.gain.setValueAtTime(1.0, currentTime)
      this.startSource.start(currentTime)
      
      // Create and start the loop source immediately but silent
      this.loopSource = this.createAudioSource(
        this.loopBuffer, 
        this.loopGain, 
        true, 
        0.3, 
        this.loopBuffer.duration - 0.3
      )
      this.loopGain.gain.setValueAtTime(0.0, currentTime)
      this.loopSource.start(currentTime)
      
      // Schedule the crossfade to happen right when start sound ends
      const startDuration = this.startBuffer.duration
      const transitionTime = currentTime + startDuration - fadeTime
      
      // Schedule start fade out
      this.startGain.gain.setValueAtTime(1.0, transitionTime)
      this.startGain.gain.linearRampToValueAtTime(0.0, transitionTime + fadeTime)
      
      // Schedule loop fade in to normal volume
      this.loopGain.gain.setValueAtTime(0.0, transitionTime)
      this.loopGain.gain.linearRampToValueAtTime(this.normalLoopVolume, transitionTime + fadeTime)
      
    } catch (error) {
      console.error('Error starting engine:', error)
      this.isRunning = false
    }
  }

  async revEngine(onRevStart, onRevEnd) {
    // Check conditions: engine must be running and not currently revving
    if (!this.isRunning || this.isRevving || !this.revBuffer) {
      console.log('Rev blocked: engine not running or already revving')
      return
    }
    
    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
    
    this.isRevving = true
    
    try {
      // Trigger rev start callback (for flash effects)
      if (onRevStart) onRevStart()
      
      const currentTime = this.audioContext.currentTime
      const volumeFadeTime = 0.05 // Quick 50ms fade for loop volume change
      
      // Only lower the loop volume if the loop is actually playing (not during start sound)
      // Check if loop volume is at normal level, indicating it's the active sound
      if (this.loopSource && this.loopGain.gain.value >= this.normalLoopVolume * 0.9) {
        this.loopGain.gain.cancelScheduledValues(currentTime)
        this.loopGain.gain.setValueAtTime(this.loopGain.gain.value, currentTime)
        this.loopGain.gain.linearRampToValueAtTime(this.revLoopVolume, currentTime + volumeFadeTime)
      }
      
      // Create and start rev source
      this.revSource = this.createAudioSource(
        this.revBuffer, 
        this.revGain, 
        false, 
        0.3, 
        this.revBuffer.duration - 0.3
      )
      this.revGain.gain.setValueAtTime(1.0, currentTime)
      this.revSource.start(currentTime)
      
      // Schedule rev end callback and restore loop volume
      const revDuration = this.revBuffer.duration * 1000 // Convert to milliseconds
      const eventId = setTimeout(() => {
        this.isRevving = false
        
        // Only restore loop volume if loop is active and was previously reduced
        if (this.loopSource && this.loopGain.gain.value > 0 && this.loopGain.gain.value <= this.revLoopVolume * 1.1) {
          const restoreTime = this.audioContext.currentTime
          this.loopGain.gain.cancelScheduledValues(restoreTime)
          this.loopGain.gain.setValueAtTime(this.loopGain.gain.value, restoreTime)
          this.loopGain.gain.linearRampToValueAtTime(this.normalLoopVolume, restoreTime + volumeFadeTime)
        }
        
        if (onRevEnd) onRevEnd()
      }, revDuration)
      
      this.scheduledEvents.push(eventId)
      
    } catch (error) {
      console.error('Error revving engine:', error)
      this.isRevving = false
      
      // Restore loop volume in case of error, but only if it was actually reduced
      if (this.loopSource && this.loopGain.gain.value > 0 && this.loopGain.gain.value <= this.revLoopVolume * 1.1) {
        const restoreTime = this.audioContext.currentTime
        this.loopGain.gain.cancelScheduledValues(restoreTime)
        this.loopGain.gain.setValueAtTime(this.loopGain.gain.value, restoreTime)
        this.loopGain.gain.linearRampToValueAtTime(this.normalLoopVolume, restoreTime + 0.05)
      }
      
      if (onRevEnd) onRevEnd()
    }
  }

  stopEngine() {
    if (!this.isRunning) return
    
    this.isRunning = false
    this.clearScheduledEvents()
    
    const currentTime = this.audioContext.currentTime
    const fadeTime = 0.5 // Very fast 50ms fade for immediate response
    
    try {
      // Immediately start fading out current sounds
      if (this.startSource && this.startGain.gain.value > 0) {
        this.startGain.gain.cancelScheduledValues(currentTime)
        this.startGain.gain.setValueAtTime(this.startGain.gain.value, currentTime)
        this.startGain.gain.linearRampToValueAtTime(0.0, currentTime + fadeTime)
      }
      
      if (this.loopSource && this.loopGain.gain.value > 0) {
        this.loopGain.gain.cancelScheduledValues(currentTime)
        this.loopGain.gain.setValueAtTime(this.loopGain.gain.value, currentTime)
        this.loopGain.gain.linearRampToValueAtTime(0.0, currentTime + fadeTime)
      }
      
      // If revving, also stop rev sound
      if (this.revSource && this.revGain.gain.value > 0) {
        this.revGain.gain.cancelScheduledValues(currentTime)
        this.revGain.gain.setValueAtTime(this.revGain.gain.value, currentTime)
        this.revGain.gain.linearRampToValueAtTime(0.0, currentTime + fadeTime)
      }
      
      // Reset revving state
      this.isRevving = false
      
      // Schedule end sound to start immediately after fade
    //   const endStartTime = currentTime + fadeTime
      
      if (this.endBuffer) {
        // Stop old sources and start end sound
        const eventId = setTimeout(() => {
          this.stopAllSources()
          
          this.endSource = this.createAudioSource(
            this.endBuffer, 
            this.endGain, 
            false, 
            0.3, 
            this.endBuffer.duration - 0.3
          )
          this.endGain.gain.setValueAtTime(1.0, this.audioContext.currentTime)
          this.endSource.start(this.audioContext.currentTime)
        }, fadeTime * 1000)
        
        this.scheduledEvents.push(eventId)
      }
      
    } catch (error) {
      console.error('Error stopping engine:', error)
    }
  }

  stopAllSources() {
    try {
      if (this.startSource) {
        this.startSource.stop()
        this.startSource = null
      }
      if (this.loopSource) {
        this.loopSource.stop()
        this.loopSource = null
      }
      if (this.endSource) {
        this.endSource.stop()
        this.endSource = null
      }
      if (this.revSource) {
        this.revSource.stop()
        this.revSource = null
      }
    } catch (error) {
      // Sources might already be stopped
      console.log("Error in sound: ", error);
    }
  }

  cleanup() {
    this.stopEngine()
    this.clearScheduledEvents()
    this.stopAllSources()
    
    if (this.audioContext) {
      this.audioContext.close()
    }
  }
}

export function Car() {
  const [degraded, degrade] = useState(false)
  const [isEngineRunning, setIsEngineRunning] = useState(false)
  const [isRevving, setIsRevving] = useState(false)
  const [isAppLoading, setIsAppLoading] = useState(true)
  const engineAudioRef = useRef(null)
  
  // Initialize engine audio on mount
  useLayoutEffect(() => {
    engineAudioRef.current = new EngineAudio()
    
    // Simulate initial app loading
    const timer = setTimeout(() => {
      setIsAppLoading(false)
    }, 2000) // 2 second minimum loading time
    
    return () => {
      clearTimeout(timer)
      if (engineAudioRef.current) {
        engineAudioRef.current.cleanup()
      }
    }
  }, [])

  const handleStartEngine = async () => {
    if (!isEngineRunning && engineAudioRef.current) {
      setIsEngineRunning(true)
      await engineAudioRef.current.startEngine()
    }
  }

  const handleStopEngine = () => {
    if (isEngineRunning && engineAudioRef.current) {
      setIsEngineRunning(false)
      setIsRevving(false) // Reset revving state when engine stops
      engineAudioRef.current.stopEngine()
    }
  }

  const handleRevEngine = async () => {
    if (!isEngineRunning || isRevving || !engineAudioRef.current) {
      return // Rev blocked: engine not running or already revving
    }

    await engineAudioRef.current.revEngine(
      () => setIsRevving(true),  // onRevStart callback
      () => setIsRevving(false) // onRevEnd callback
    )
  }

  // Show app loading screen
  if (isAppLoading) {
    return <AppLoader />
  }

  return (
    <div className="relative w-full h-screen">
      <Canvas
        shadows
        camera={{ position: [5, 0, 15], fov: 30 }}
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      >
        <spotLight
          position={[0, 15, 0]}
          angle={0.3}
          penumbra={1}
          castShadow
          intensity={3}
          shadow-bias={-0.0001}
        />
        <ambientLight intensity={0.8} />
        
        {/* Wrap the model in Suspense with the loader */}
        <Suspense fallback={<Loader />}>
          <Porsche
            scale={1.6}
            position={[-0.5, -0.18, 0]}
            rotation={[0, Math.PI / 5, 0]}
          />
        </Suspense>
        
        <Smoke 
          position={[-1.35, -0.1, -1.5]} 
          particlesPerEmission={3}
          emissionRate={50}
          particleLifetime={2000}
          color={[0.3, 0.3, 0.3]}
          scale={1.2}
          isActive={isEngineRunning} // Only show smoke when engine is running
        />
        {/* Multiple Flash effects for realistic exhaust */}
        <Flash
          position={[-2.25, 0.06, -2.9]}  // Rear left exhaust
          rotation={[0, Math.PI, 0]}      // Pointing backward
          isRevving={isRevving}
          intensity={1.8}
          color={0x0088ff}
          isActive={isRevving}               // Bright blue flame
        />
        
        <Flash
          position={[-2.7, 0.06, -2.5]} 
          rotation={[0, Math.PI, 0]}     
          isRevving={isRevving}
          intensity={1.8}
          color={0x0099ff} 
          isActive={isRevving}             
        />
        
        <AccumulativeShadows
          position={[0, -1.16, 0]}
          frames={100}
          alphaTest={0.9}
          scale={10}
        >
          <RandomizedLight
            amount={8}
            radius={10}
            ambient={0.5}
            position={[1, 5, -1]}
          />
        </AccumulativeShadows>

        <PerformanceMonitor onDecline={() => degrade(true)} />

        <Environment
          frames={degraded ? 1 : Infinity}
          resolution={256}
          background
          blur={1}
        >
          <Lightformers />
        </Environment>

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={3}
          maxDistance={30}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* Overlay absolutely positioned and forced above */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10, // 🔑 makes it sit above Canvas
          pointerEvents: 'none',
        }}
      >
        <Overlay />
      </div>
      <div
        style={{
            position: "absolute",
            bottom: 200,
            right: 40,
            fontSize: 13,
        }}
        >
        <button
            style={{
            background: "transparent", // remove white background
            border: "none",           // remove default border
            padding: 0,               // remove default padding
            cursor: "pointer",        // optional: pointer on hover
            opacity: isEngineRunning ? 1 : 0.5, // Visual feedback for disabled state
            }}
            onClick={handleRevEngine}
            disabled={!isEngineRunning || isRevving}
        >
            <img src={revIcon} alt="" height={25} width={25} style={{filter: 'brightness(0) invert(1)'}}/>
        </button>
      </div>
      <div
        style={{
            position: "absolute",
            bottom: 250,
            right: 40,
            fontSize: 13,
        }}
        >
        <button
        style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
        }}
        onClick={isEngineRunning ? handleStopEngine : handleStartEngine}
        >
        <div
            style={{
            width: 25,
            height: 25,
            backgroundColor: isEngineRunning ? "red" : "white", // engine state color
            maskImage: `url(${startIcon})`,
            maskRepeat: "no-repeat",
            maskPosition: "center",
            maskSize: "contain",
            WebkitMaskImage: `url(${startIcon})`,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            WebkitMaskSize: "contain",
            }}
        />
        </button>
      </div>
      <div
        style={{
            position: "absolute",
            bottom: 40,
            right: 40,
            fontSize: 13,
        }}
        >
        <button
        style={{
            background: "transparent", // remove white background
            border: "none",            // remove default border
            padding: 0,                // remove default padding
            cursor: "pointer",         // pointer on hover
            opacity: isEngineRunning ? 1 : 0.5, // feedback
        }}
        onClick={() => window.open("https://github.com/Aditya02git", "_blank")}
        >
        <img
            src={githubIcon}
            alt="GitHub"
            height={25}
            width={25}
            style={{ filter: "brightness(0) invert(1)" }}
        />
        </button>

      </div>
    </div>
  )
}


function Porsche(props) {
  const { scene, nodes, materials } = useGLTF('/lamborghini_revuelto.glb')
  useLayoutEffect(() => {
    Object.values(nodes).forEach((node) => node.isMesh && (node.receiveShadow = node.castShadow = true))
    applyProps(materials.Tire, { color: '#222', roughness: 0.6, roughnessMap: null, normalScale: [4, 4] })
    applyProps(materials.Windows, { color: 'black', roughness: 0, clearcoat: 0.1 })
    applyProps(materials.coat, { envMapIntensity: 4, roughness: 0.5, metalness: 1 })
    applyProps(materials.Body, { envMapIntensity: 2, roughness: 0.45, metalness: 0.8, color: 'rgb(204,0,255)' })
  }, [nodes, materials])
  return <primitive object={scene} {...props} />
}

function Lightformers({ positions = [2, 0, 2, 0, 2, 0, 2, 0] }) {
  const group = useRef()
  useFrame((state, delta) => (group.current.position.z += delta * 10) > 20 && (group.current.position.z = -60))
  return (
    <>
      {/* Ceiling */}
      <Lightformer intensity={0.75} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
      <group rotation={[0, 0.5, 0]}>
        <group ref={group}>
          {positions.map((x, i) => (
            <Lightformer key={i} form="circle" intensity={2} rotation={[Math.PI / 2, 0, 0]} position={[x, 4, i * 4]} scale={[3, 1, 1]} />
          ))}
        </group>
      </group>
      {/* Sides */}
      <Lightformer intensity={4} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[20, 0.1, 1]} />
      <Lightformer rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[20, 0.5, 1]} />
      <Lightformer rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 1, 1]} />
      {/* Accent (red) */}
      <Float speed={5} floatIntensity={2} rotationIntensity={2}>
        <Lightformer form="ring" color="red" intensity={1} scale={10} position={[-15, 4, -18]} target={[0, 0, 0]} />
      </Float>
      {/* Background */}
      <mesh scale={100}>
        <sphereGeometry args={[1, 64, 64]} />
        <LayerMaterial side={THREE.BackSide}>
          <Color color="#444" alpha={1} mode="normal" />
          <Depth colorA="blue" colorB="black" alpha={0.5} mode="normal" near={0} far={300} origin={[100, 100, 100]} />
        </LayerMaterial>
      </mesh>
    </>
  )
}

export default Car