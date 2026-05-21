import React, { Suspense, useRef, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────
function remap(val, inMin, inMax, outMin, outMax) {
  const t = Math.max(0, Math.min(1, (val - inMin) / (inMax - inMin)))
  return outMin + t * (outMax - outMin)
}

function clamp01(val) {
  return Math.max(0, Math.min(1, val))
}

function getPredictionScore(prediction) {
  const predictedYield = prediction?.predicted_yield_kg_per_m2
  if (!Number.isFinite(predictedYield)) return null

  // Demo model outputs are kg/m2; this range keeps backend influence visible but not overpowering.
  return remap(predictedYield, 2, 14, 0, 1)
}

function computeHealth(m) {
  const temp  = parseFloat(m.avgTemperatureC   || 25)
  const hum   = parseFloat(m.humidityPercent   || 70)
  const co2   = parseFloat(m.co2Ppm            || 800)
  const light = parseFloat(m.lightIntensityLux || 30000)
  const photo = parseFloat(m.photoperiodHours  || 12)
  const water = parseFloat(m.irrigationMm      || 7)
  const ph    = parseFloat(m.pH                || 6.5)
  const pest  = parseFloat(m.pestSeverity      || 1)
  const n     = parseFloat(m.fertilizerNKgHa   || 140)
  const p     = parseFloat(m.fertilizerPKgHa   || 60)
  const k     = parseFloat(m.fertilizerKKgHa   || 140)

  return (
    (1 - remap(Math.abs(temp - 23), 0, 20, 0, 1)) * 0.15 +
    remap(hum,   20,  80, 0.2, 1) * 0.10 +
    remap(co2,  300, 1500, 0.2, 1) * 0.10 +
    remap(light, 0, 60000, 0,   1) * 0.15 +
    remap(photo, 8,  16,   0.3, 1) * 0.05 +
    remap(water, 2,  20,   0.2, 1) * 0.10 +
    (1 - remap(Math.abs(ph - 6.5), 0, 2.5, 0, 1)) * 0.10 +
    (1 - remap(pest, 0, 5, 0, 1)) * 0.15 +
    remap((n + p + k) / 3, 0, 300, 0.1, 1) * 0.10
  )
}

function computeBlendedHealth(metrics, prediction) {
  const inputHealth = clamp01(computeHealth(metrics))
  const predictionScore = getPredictionScore(prediction)
  if (predictionScore == null) return inputHealth

  return inputHealth * 0.7 + predictionScore * 0.3
}

function formatNumber(value, digits = 0) {
  const number = parseFloat(value)
  if (!Number.isFinite(number)) return 'N/A'
  return number.toFixed(digits)
}

function buildInsightItems(metrics, prediction) {
  const temp = parseFloat(metrics.avgTemperatureC || 25)
  const humidity = parseFloat(metrics.humidityPercent || 70)
  const co2 = parseFloat(metrics.co2Ppm || 800)
  const light = parseFloat(metrics.lightIntensityLux || 30000)
  const photoperiod = parseFloat(metrics.photoperiodHours || 12)
  const water = parseFloat(metrics.irrigationMm || 7)
  const ph = parseFloat(metrics.pH || 6.5)
  const pest = parseFloat(metrics.pestSeverity || 0)
  const nitrogen = parseFloat(metrics.fertilizerNKgHa || 0)
  const potassium = parseFloat(metrics.fertilizerKKgHa || 0)
  const predictedYield = prediction?.predicted_yield_kg_per_m2
  const healthPercent = Math.round(computeBlendedHealth(metrics, prediction) * 100)

  return [
    {
      id: 'health',
      label: 'Health',
      value: `${healthPercent}%`,
      title: 'Overall plant health',
      body: `The model blends input conditions with backend yield prediction. Temperature near 23C, balanced pH, enough light, water and low pests make the plant larger, steadier and more vibrant.`,
    },
    {
      id: 'light',
      label: 'Light',
      value: `${formatNumber(light)} lux`,
      title: 'Light controls brightness and growth energy',
      body: `Higher light intensity and longer photoperiod increase scene brightness, sun rays, floating motes and plant scale. Low light makes the plant look less energetic and smaller.`,
    },
    {
      id: 'water',
      label: 'Water',
      value: `${formatNumber(water, 1)} mm`,
      title: 'Water affects leaf curl and fruit freshness',
      body: `Too little irrigation creates drought stress, curling the leaves and reducing fresh colour. Higher humidity also makes rain streaks more visible in the 3D scene.`,
    },
    {
      id: 'nutrients',
      label: 'Nutrients',
      value: `N ${formatNumber(nitrogen)} / K ${formatNumber(potassium)}`,
      title: 'Nutrients shape leaf and fruit colour',
      body: `More nitrogen supports greener leaves. Potassium pushes fruit colour from green toward ripe red, while pH far from 6.5 reduces leaf quality and makes the plant look stressed.`,
    },
    {
      id: 'climate',
      label: 'Climate',
      value: `${formatNumber(temp, 1)}C / ${formatNumber(co2)} ppm`,
      title: 'Climate changes movement and atmosphere',
      body: `Temperature shifts the plant posture, humidity affects sway and rain, and higher CO2 adds pale mist. These inputs also contribute to the health score used for scale and glow.`,
    },
    {
      id: 'pests',
      label: 'Pests',
      value: `${formatNumber(pest)} / 5`,
      title: 'Pests reduce visible plant quality',
      body: `Higher pest severity adds bug particles, lowers health, increases leaf stress and pushes leaves toward weaker yellow-brown tones.`,
    },
    {
      id: 'ai',
      label: 'AI Yield',
      value: Number.isFinite(predictedYield) ? `${predictedYield.toFixed(2)} kg/m2` : 'Waiting',
      title: 'Backend prediction fine-tunes the 3D model',
      body: `When the backend returns a yield estimate, high predicted yield makes the plant fuller, redder and greener. Low predicted yield slightly reduces scale and colour confidence.`,
    },
  ]
}

function ModelInsightPanel({ metrics, prediction }) {
  const items = useMemo(() => buildInsightItems(metrics, prediction), [metrics, prediction])
  const [activeId, setActiveId] = useState('health')
  const [isOpen, setIsOpen] = useState(false)
  const activeItem = items.find(item => item.id === activeId) || items[0]

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="absolute left-4 top-4 z-10 rounded-full border border-white/70 bg-white/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-brand-600 shadow-xl backdrop-blur-md transition-all hover:bg-white hover:text-brand-700"
      >
        3D Growth Guide
      </button>
    )
  }

  return (
    <div className="absolute left-4 top-4 z-10 w-[min(360px,calc(100%-2rem))] rounded-3xl border border-white/70 bg-white/85 p-4 text-slate-800 shadow-xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-600">3D Growth Guide</p>
          <h3 className="mt-1 text-sm font-black text-slate-900">How inputs affect the tomato</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-700"
        >
          Hide
        </button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveId(item.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black transition-all ${
              activeId === item.id
                ? 'bg-brand-600 text-white shadow-md shadow-brand-100'
                : 'bg-white/80 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-2xl bg-slate-50/90 p-3">
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="text-xs font-black text-slate-900">{activeItem.title}</p>
          <p className="shrink-0 text-[10px] font-black text-brand-600">{activeItem.value}</p>
        </div>
        <p className="text-[11px] font-semibold leading-relaxed text-slate-500">{activeItem.body}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Static shadow plane — replaces ContactShadows (no per-frame flicker)
// ─────────────────────────────────────────────────────────────────────────────
function GroundShadow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.81, 0]} receiveShadow>
      <planeGeometry args={[12, 12]} />
      <shadowMaterial transparent opacity={0.18} />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Rain — line segments for visible streaks
// ─────────────────────────────────────────────────────────────────────────────
const RAIN_COUNT = 500

function RainSystem({ humidity }) {
  const meshRef = useRef()
  const posArr  = useRef(null)
  const velArr  = useRef(null)

  const { geo, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(RAIN_COUNT * 6)
    const vel = new Float32Array(RAIN_COUNT)
    for (let i = 0; i < RAIN_COUNT; i++) {
      const x = (Math.random() - 0.5) * 10
      const y = Math.random() * 10 - 1
      const z = (Math.random() - 0.5) * 10
      pos[i * 6]     = x;  pos[i * 6 + 1] = y;        pos[i * 6 + 2] = z
      pos[i * 6 + 3] = x;  pos[i * 6 + 4] = y - 0.22; pos[i * 6 + 5] = z
      vel[i] = 0.12 + Math.random() * 0.08
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    posArr.current = pos
    velArr.current = vel
    const mat = new THREE.LineBasicMaterial({
      color: 0xb8e0ff,
      transparent: true,
      opacity: 0,
    })
    return { geo, mat }
  }, [])

  useEffect(() => {
    const target = remap(humidity, 45, 100, 0, 0.75)
    gsap.to(mat, { opacity: target, duration: 1.2 })
  }, [humidity, mat])

  useFrame(() => {
    if (!meshRef.current || !posArr.current) return
    if (mat.opacity < 0.01) return
    const pos = posArr.current
    const vel = velArr.current
    for (let i = 0; i < RAIN_COUNT; i++) {
      pos[i * 6 + 1] -= vel[i]
      pos[i * 6 + 4] -= vel[i]
      if (pos[i * 6 + 4] < -2) {
        const y = 8 + Math.random() * 2
        pos[i * 6 + 1] = y
        pos[i * 6 + 4] = y - 0.22
        pos[i * 6]     = (Math.random() - 0.5) * 10
        pos[i * 6 + 3] = pos[i * 6]
        pos[i * 6 + 2] = (Math.random() - 0.5) * 10
        pos[i * 6 + 5] = pos[i * 6 + 2]
      }
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true
  })

  return <lineSegments ref={meshRef} geometry={geo} material={mat} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Sun rays — shimmering volumetric shafts
// ─────────────────────────────────────────────────────────────────────────────
const RAY_COUNT = 12

function SunRays({ lightIntensity }) {
  const matsRef = useRef([])

  const rays = useMemo(() => {
    return Array.from({ length: RAY_COUNT }, (_, i) => {
      const angle = (i / RAY_COUNT) * Math.PI * 2
      const spread = 0.4 + Math.random() * 0.5
      const len    = 2.5 + Math.random() * 2
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfffbe0,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      matsRef.current[i] = mat
      return { angle, spread, len, mat }
    })
  }, [])

  useEffect(() => {
    const base = remap(lightIntensity, 15000, 90000, 0, 0.13)
    matsRef.current.forEach(m => {
      gsap.to(m, { opacity: base + Math.random() * 0.04, duration: 1.8 })
    })
  }, [lightIntensity])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    matsRef.current.forEach((m, i) => {
      const base = remap(lightIntensity, 15000, 90000, 0, 0.13)
      if (base < 0.005) return
      m.opacity = base * (0.72 + 0.28 * Math.sin(t * 0.8 + i * 1.3))
    })
  })

  return (
    <group position={[0, 2, 0]}>
      {rays.map(({ angle, spread, len, mat }, i) => (
        <mesh
          key={i}
          material={mat}
          rotation={[0, angle, -0.4]}
          position={[Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3]}
        >
          <planeGeometry args={[spread, len]} />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sun motes — golden dust floating upward
// ─────────────────────────────────────────────────────────────────────────────
const MOTE_COUNT = 200

function SunMotes({ lightIntensity }) {
  const meshRef  = useRef()
  const posArr   = useRef(null)
  const phaseArr = useRef(null)

  const { geo, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(MOTE_COUNT * 3)
    const ph  = new Float32Array(MOTE_COUNT)
    for (let i = 0; i < MOTE_COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 6
      pos[i * 3 + 1] = Math.random() * 5 - 1
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6
      ph[i] = Math.random() * Math.PI * 2
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    posArr.current   = pos
    phaseArr.current = ph
    const mat = new THREE.PointsMaterial({
      color: 0xffd84d,
      size: 0.055,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    return { geo, mat }
  }, [])

  useEffect(() => {
    const target = remap(lightIntensity, 15000, 80000, 0, 0.65)
    gsap.to(mat, { opacity: target, duration: 1.5 })
  }, [lightIntensity, mat])

  useFrame(({ clock }) => {
    if (!meshRef.current || !posArr.current || mat.opacity < 0.01) return
    const t   = clock.getElapsedTime()
    const pos = posArr.current
    const ph  = phaseArr.current
    for (let i = 0; i < MOTE_COUNT; i++) {
      pos[i * 3 + 1] += 0.003
      pos[i * 3]     += Math.sin(t * 0.4 + ph[i]) * 0.0015
      pos[i * 3 + 2] += Math.cos(t * 0.3 + ph[i]) * 0.001
      if (pos[i * 3 + 1] > 4) pos[i * 3 + 1] = -1
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true
  })

  return <points ref={meshRef} geometry={geo} material={mat} />
}

// ─────────────────────────────────────────────────────────────────────────────
// CO2 mist — pale green bubbles rising from soil
// ─────────────────────────────────────────────────────────────────────────────
const CO2_COUNT = 80

function CO2Mist({ co2 }) {
  const meshRef  = useRef()
  const posArr   = useRef(null)
  const spdArr   = useRef(null)

  const { geo, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(CO2_COUNT * 3)
    const spd = new Float32Array(CO2_COUNT)
    for (let i = 0; i < CO2_COUNT; i++) {
      const r = Math.random() * 1.2
      const a = Math.random() * Math.PI * 2
      pos[i * 3]     = Math.cos(a) * r
      pos[i * 3 + 1] = Math.random() * 2 - 1.5
      pos[i * 3 + 2] = Math.sin(a) * r
      spd[i] = 0.005 + Math.random() * 0.008
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    posArr.current = pos
    spdArr.current = spd
    const mat = new THREE.PointsMaterial({
      color: 0xccffee,
      size: 0.055,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    return { geo, mat }
  }, [])

  useEffect(() => {
    const target = remap(co2, 600, 2000, 0, 0.32)
    gsap.to(mat, { opacity: target, duration: 1.5 })
  }, [co2, mat])

  useFrame(() => {
    if (!meshRef.current || !posArr.current || mat.opacity < 0.01) return
    const pos = posArr.current
    const spd = spdArr.current
    for (let i = 0; i < CO2_COUNT; i++) {
      pos[i * 3 + 1] += spd[i]
      if (pos[i * 3 + 1] > 2.5) pos[i * 3 + 1] = -1.5
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true
  })

  return <points ref={meshRef} geometry={geo} material={mat} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Pest bugs — tiny red dots orbiting the plant
// ─────────────────────────────────────────────────────────────────────────────
const BUG_COUNT = 60

function PestBugs({ pestLevel }) {
  const meshRef  = useRef()
  const posArr   = useRef(null)
  const angArr   = useRef(null)
  const radArr   = useRef(null)
  const hgtArr   = useRef(null)
  const spdArr   = useRef(null)

  const { geo, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(BUG_COUNT * 3)
    const ang = new Float32Array(BUG_COUNT)
    const rad = new Float32Array(BUG_COUNT)
    const hgt = new Float32Array(BUG_COUNT)
    const spd = new Float32Array(BUG_COUNT)
    for (let i = 0; i < BUG_COUNT; i++) {
      ang[i] = Math.random() * Math.PI * 2
      rad[i] = 0.3 + Math.random() * 0.8
      hgt[i] = Math.random() * 2.5 - 0.5
      spd[i] = (0.5 + Math.random()) * (Math.random() > 0.5 ? 1 : -1)
      pos[i * 3]     = Math.cos(ang[i]) * rad[i]
      pos[i * 3 + 1] = hgt[i]
      pos[i * 3 + 2] = Math.sin(ang[i]) * rad[i]
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    posArr.current = pos
    angArr.current = ang
    radArr.current = rad
    hgtArr.current = hgt
    spdArr.current = spd
    const mat = new THREE.PointsMaterial({
      color: 0xff3300,
      size: 0.04,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    return { geo, mat }
  }, [])

  useEffect(() => {
    const target = remap(pestLevel, 1, 5, 0, 0.9)
    gsap.to(mat, { opacity: target, duration: 1.0 })
  }, [pestLevel, mat])

  useFrame(({ clock }) => {
    if (!meshRef.current || !posArr.current || mat.opacity < 0.01) return
    const dt  = 0.016
    const t   = clock.getElapsedTime()
    const pos = posArr.current
    const ang = angArr.current
    const rad = radArr.current
    const hgt = hgtArr.current
    const spd = spdArr.current
    for (let i = 0; i < BUG_COUNT; i++) {
      ang[i] += spd[i] * dt
      hgt[i] += Math.sin(t * 1.5 + i) * 0.003
      pos[i * 3]     = Math.cos(ang[i]) * rad[i]
      pos[i * 3 + 1] = hgt[i]
      pos[i * 3 + 2] = Math.sin(ang[i]) * rad[i]
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true
  })

  return <points ref={meshRef} geometry={geo} material={mat} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Organic idle — whole group sway + breath
// ─────────────────────────────────────────────────────────────────────────────
function useOrganicIdle(groupRef, visualRef) {
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t      = clock.getElapsedTime()
    const { metrics: m = {}, prediction = null } = visualRef.current || {}
    const wind   = remap(parseFloat(m.humidityPercent || 70), 20, 100, 0.004, 0.014)
    const health = computeBlendedHealth(m, prediction)

    groupRef.current.rotation.z = Math.sin(t * wind * 55) * 0.016 * (0.6 + (1 - health) * 0.6)

    const breathScale = 1 + Math.sin(t * 0.5) * 0.006 * health
    const base = groupRef.current.userData.baseScale || 2.5
    groupRef.current.scale.setScalar(breathScale * base)

    const temp = parseFloat(m.avgTemperatureC || 25)
    groupRef.current.rotation.x = remap(temp, 10, 45, -0.04, 0.055)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tomato model — colours overridden directly, no part position/scale changes
// ─────────────────────────────────────────────────────────────────────────────
function TomatoModel({ metrics, prediction, hero = false }) {
  const { scene }   = useGLTF('/models/tomato.glb')
  const groupRef    = useRef()
  const visualRef   = useRef({ metrics, prediction })
  const tlRef       = useRef(null)
  const firstRender = useRef(true)

  useOrganicIdle(groupRef, visualRef)

  const parts = useMemo(() => {
    scene.traverse((obj) => {
      if (!obj.isMesh) return
      if (!obj.userData.materialCloned) {
        obj.material = obj.material.clone()
        if (!obj.material.emissive) obj.material.emissive = new THREE.Color(0, 0, 0)
        obj.userData.materialCloned = true
      }
    })
    return {
      leaves:      scene.getObjectByName('Object_2'),
      stem:        scene.getObjectByName('Object_3'),
      fruit:       scene.getObjectByName('Object_4'),
      smallLeaves: scene.getObjectByName('Object_5'),
    }
  }, [scene])

  useEffect(() => {
    visualRef.current = { metrics, prediction }
    if (!scene || !groupRef.current) return
    if (tlRef.current) tlRef.current.kill()

    const { fruit, leaves, smallLeaves } = parts
    const dur = firstRender.current ? 0 : 1.4
    firstRender.current = false

    const temp  = parseFloat(metrics.avgTemperatureC   || 25)
    const hum   = parseFloat(metrics.humidityPercent   || 70)
    const co2   = parseFloat(metrics.co2Ppm            || 800)
    const light = parseFloat(metrics.lightIntensityLux || 30000)
    const photo = parseFloat(metrics.photoperiodHours  || 12)
    const water = parseFloat(metrics.irrigationMm      || 7)
    const ph    = parseFloat(metrics.pH                || 6.5)
    const pest  = parseFloat(metrics.pestSeverity      || 0)
    const n     = parseFloat(metrics.fertilizerNKgHa   || 0)
    const p     = parseFloat(metrics.fertilizerPKgHa   || 0)
    const k     = parseFloat(metrics.fertilizerKKgHa   || 0)

    const predictionScore = getPredictionScore(prediction)
    const health = computeBlendedHealth(metrics, prediction)
    const yieldBoost = predictionScore == null ? 0 : predictionScore - 0.5

    // Whole plant scale
    const plantScale = hero
      ? 0.96
      : remap(health, 0, 1, 0.55, 1.2)  *
        remap(co2,  300, 2000, 0.88, 1.12) *
        remap(photo,  0,   18, 0.78, 1.08) *
        remap(light,  0, 80000, 0.82, 1.10) *
        (1 + yieldBoost * 0.18)
    groupRef.current.userData.baseScale = 2.5 * plantScale

    // ── Fruit colour: override completely, ignore original material tint ──────
    // k=0 → unripe green, k=300 → ripe red
    const kFactor     = clamp01(remap(k, 0, 300, 0, 1) + yieldBoost * 0.22)
    const waterFactor = remap(water, 0, 40, 1, 0.72) * (1 + yieldBoost * 0.08)
    const fR = (0.08 + kFactor * 0.80) * waterFactor
    const fG = (0.45 - kFactor * 0.38) * waterFactor
    const fB = (0.05 - kFactor * 0.02) * waterFactor

    // ── Leaf colour: override completely ─────────────────────────────────────
    const phPenalty  = 1 - remap(Math.abs(ph - 6.5), 0, 2.5, 0, 0.85)
    const pestFactor = remap(pest, 0, 5, 0, 1)
    const nFactor    = remap(n, 0, 400, 0.2, 1)
    const drought    = remap(water, 0, 4, 1, 0)
    const lR = 0.10 + pestFactor * 0.45 + drought * 0.35 + (1 - phPenalty) * 0.25 - yieldBoost * 0.08
    const lG = (0.55 + nFactor * 0.10 + yieldBoost * 0.14) * phPenalty * (1 - pestFactor * 0.35) * (1 - drought * 0.25)
    const lB = 0.08 * (1 - pestFactor * 0.6) + Math.max(0, yieldBoost) * 0.03

    // Leaf droop
    const heatStress = remap(temp, 30, 45, 0, 0.30)
    const leafCurlX  = remap(drought * 0.5 + heatStress + pestFactor * 0.2, 0, 1, -0.04, 0.42)

    // Emissive
    const leafEmissive  = remap(hum, 20, 100, 0, 0.04) * health
    const fruitEmissive = remap(co2, 300, 2000, 0, 0.04) * health

    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } })
    tlRef.current = tl

    tl.to(groupRef.current.scale, {
      x: 2.5 * plantScale, y: 2.5 * plantScale, z: 2.5 * plantScale,
      duration: dur,
    }, 0)

    if (fruit?.material) {
      tl.to(fruit.material.color, { r: fR, g: fG, b: fB, duration: dur * 1.2 }, 0)
      if (fruit.material.emissive) {
        tl.to(fruit.material.emissive, {
          r: fR * fruitEmissive * 2,
          g: fG * fruitEmissive,
          b: 0,
          duration: dur,
        }, 0)
      }
    }

    ;[leaves, smallLeaves].forEach(part => {
      if (!part?.material) return
      tl.to(part.rotation, { x: leafCurlX, duration: dur }, 0)
      tl.to(part.material.color, { r: lR, g: lG, b: lB, duration: dur * 1.1 }, 0)
      if (part.material.emissive) {
        tl.to(part.material.emissive, {
          r: 0, g: leafEmissive * 2.5, b: leafEmissive * 0.5,
          duration: dur,
        }, 0)
      }
    })

    return () => { if (tlRef.current) tlRef.current.kill() }
  }, [metrics, prediction, scene, parts])

  return scene ? (
    <group ref={groupRef} position={[0, -1.8, 0]}>
      <primitive object={scene} />
    </group>
  ) : null
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic lighting
// ─────────────────────────────────────────────────────────────────────────────
function DynamicLighting({ metrics }) {
  const ambientRef = useRef()
  const spotRef    = useRef()

  useEffect(() => {
    if (!ambientRef.current || !spotRef.current) return
    const light = parseFloat(metrics?.lightIntensityLux || 30000)
    const co2   = parseFloat(metrics?.co2Ppm            || 800)
    const photo = parseFloat(metrics?.photoperiodHours  || 12)

    const ambientI = remap(light, 0, 100000, 0.25, 1.1) * remap(photo, 0, 24, 0.35, 1)
    const spotI    = remap(light, 0, 100000, 0.4, 2.2)
    const warmth   = remap(co2, 300, 2000, 0, 0.07)

    gsap.to(ambientRef.current, { intensity: ambientI, duration: 1.2 })
    gsap.to(spotRef.current,    { intensity: spotI,    duration: 1.2 })
    if (ambientRef.current.color) {
      gsap.to(ambientRef.current.color, {
        r: 1, g: 1 - warmth * 0.08, b: 1 - warmth * 0.28, duration: 1.2,
      })
    }
  }, [metrics])

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.8} />
      <spotLight ref={spotRef} position={[5, 10, 5]} angle={0.3} penumbra={1} intensity={1.5} castShadow />
      <pointLight position={[-4, 3, -3]} intensity={0.3} color="#c8f0d0" />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
const TomatoCanvas = ({ metrics, prediction, hero = false, rainy = false, darkBg = false }) => {
  if (!metrics) return null

  const humidity  = parseFloat(metrics.humidityPercent   || 70)
  const lightLux  = parseFloat(metrics.lightIntensityLux || 30000)
  const co2       = parseFloat(metrics.co2Ppm            || 800)
  const pestLevel = parseFloat(metrics.pestSeverity      || 0)

  const darkScene = hero || darkBg

  return (
    <div className="h-full w-full relative overflow-hidden">
      {!darkScene && <ModelInsightPanel metrics={metrics} prediction={prediction} />}
      <Canvas
        shadows
        camera={{ position: [0, 2, 6], fov: 40 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <DynamicLighting metrics={metrics} />
        {darkScene && (
          <>
            <ambientLight intensity={rainy ? 0.5 : 0.45} color={rainy ? '#cfe0f0' : '#dbeafe'} />
            <directionalLight
              position={[3, 6, 4]}
              intensity={rainy ? 0.9 : 1.4}
              color={rainy ? '#d4dde8' : '#fff7d6'}
              castShadow
            />
            <spotLight
              position={[-4, 5, 3]}
              angle={0.45}
              penumbra={0.8}
              intensity={rainy ? 0.7 : 1.1}
              color={rainy ? '#9ec0d8' : '#9af7c5'}
            />
            <pointLight position={[0, 1.4, -3.5]} intensity={rainy ? 0.8 : 1.2} color="#34ff8e" />
            <pointLight
              position={[2.5, -0.5, 2]}
              intensity={rainy ? 0.4 : 0.6}
              color={rainy ? '#b6c7d8' : '#a7f3d0'}
            />
          </>
        )}

        <Suspense fallback={null}>
          <TomatoModel metrics={metrics} prediction={prediction} hero={darkScene} />
          {(!darkScene || rainy)  && <RainSystem humidity={humidity} />}
          {!darkScene             && <SunRays    lightIntensity={lightLux} />}
          {(!darkScene || !rainy) && <SunMotes   lightIntensity={lightLux} />}
          <CO2Mist     co2={co2} />
          <PestBugs    pestLevel={pestLevel} />
          <GroundShadow />
          {darkScene && (
            <gridHelper
              args={[28, 56, '#1f5a3c', '#0f3322']}
              position={[0, -1.805, 0]}
            />
          )}
          <Environment preset={darkScene ? 'studio' : 'forest'} />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          makeDefault
          autoRotate={darkScene}
          autoRotateSpeed={darkScene ? 0.55 : 0}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/tomato.glb')

export default TomatoCanvas