import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { Thermometer, Droplets, Wind, Sun, Sparkles, CloudRain, Atom } from 'lucide-react'
import TopNav from '../components/TopNav'
import HeroTomato, { pickRandomScene } from '../components/HeroTomato'
import MetricChip from '../components/MetricChip'

const SCENE_ICON = {
  sunny:    Sparkles,
  rainy:    CloudRain,
  particle: Atom,
}

export default function LandingPage() {
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const [scene] = useState(pickRandomScene)

  useEffect(() => {
    document.body.classList.add('theme-dark')
    return () => document.body.classList.remove('theme-dark')
  }, [])

  useEffect(() => {
    if (!rootRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('[data-fx="chip"]', {
        opacity: 0,
        y: 16,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.08,
        delay: 0.25,
      })
      gsap.from('[data-fx="tag"]', {
        opacity: 0,
        y: -12,
        duration: 0.7,
        ease: 'power2.out',
        delay: 0.1,
      })
      gsap.from('[data-fx="title"]', {
        opacity: 0,
        y: 24,
        duration: 0.9,
        ease: 'power3.out',
        delay: 0.2,
      })
      gsap.from('[data-fx="sub"]', {
        opacity: 0,
        y: 16,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.4,
      })
      gsap.from('[data-fx="cta"]', {
        opacity: 0,
        y: 18,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.1,
        delay: 0.55,
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={rootRef} className="relative min-h-screen w-full overflow-hidden bg-hero-radial">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink-950 to-transparent" />

      <TopNav variant="dark" />

      <main className="relative">
        <section className="relative h-[calc(100vh-3.5rem)] w-full">
          <div className="absolute inset-0 z-0">
            <HeroTomato scene={scene} />
          </div>

          <div className="pointer-events-none relative z-10 mx-auto h-full w-full max-w-[1600px] px-5">

          <div
            data-fx="tag"
            className="pointer-events-none absolute left-1/2 top-6 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-glow/40 bg-ink-900/70 px-4 py-1.5 backdrop-blur-md shadow-glow-sm"
          >
            {(() => {
              const Icon = SCENE_ICON[scene.name] || Sparkles
              return <Icon size={12} className="text-glow" />
            })()}
            <span className="text-[10px] font-black uppercase tracking-[0.36em] text-glow">
              Living Lab · {scene.name}
            </span>
            {(() => {
              const Icon = SCENE_ICON[scene.name] || Sparkles
              return <Icon size={12} className="text-glow" />
            })()}
          </div>

          <button
            data-fx="chip"
            type="button"
            onClick={() => navigate('/workspace')}
            title="Open workspace"
            className="pointer-events-auto absolute left-5 top-20 z-10 sm:left-8 sm:top-24 transition-transform hover:scale-105 active:scale-100"
          >
            <MetricChip icon={Thermometer} label="Air Temp" value={scene.chips.temp.value} unit={scene.chips.temp.unit} align="left" />
          </button>
          <button
            data-fx="chip"
            type="button"
            onClick={() => navigate('/workspace')}
            title="Open workspace"
            className="pointer-events-auto absolute right-5 top-20 z-10 sm:right-8 sm:top-24 transition-transform hover:scale-105 active:scale-100"
          >
            <MetricChip icon={Droplets} label="Humidity" value={scene.chips.humidity.value} unit={scene.chips.humidity.unit} align="right" />
          </button>
          <button
            data-fx="chip"
            type="button"
            onClick={() => navigate('/workspace')}
            title="Open workspace"
            className="pointer-events-auto absolute bottom-44 left-5 z-10 sm:bottom-48 sm:left-8 transition-transform hover:scale-105 active:scale-100"
          >
            <MetricChip icon={Wind} label="CO₂" value={scene.chips.co2.value} unit={scene.chips.co2.unit} align="left" />
          </button>
          <button
            data-fx="chip"
            type="button"
            onClick={() => navigate('/workspace')}
            title="Open workspace"
            className="pointer-events-auto absolute bottom-44 right-5 z-10 sm:bottom-48 sm:right-8 transition-transform hover:scale-105 active:scale-100"
          >
            <MetricChip icon={scene.name === 'rainy' ? CloudRain : Sun} label="Light" value={scene.chips.light.value} unit={scene.chips.light.unit} align="right" />
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-14 z-10 flex flex-col items-center px-4 text-center sm:bottom-20">
            <h1
              data-fx="title"
              className="text-4xl font-black uppercase leading-[0.95] tracking-[0.04em] text-slate-100 sm:text-5xl md:text-6xl"
            >
              grow as you <span className="text-glow">want</span>
            </h1>
          </div>

          </div>
        </section>
      </main>
    </div>
  )
}
