import TomatoCanvas from './TomatoCanvas'
import ParticleTomato from './ParticleTomato'

export const HERO_SCENES = {
  particle: {
    name: 'particle',
    chips: {
      temp:     { value: '???', unit: '' },
      humidity: { value: '???', unit: '' },
      co2:      { value: '???', unit: '' },
      light:    { value: '???', unit: '' },
    },
  },
  sunny: {
    name: 'sunny',
    metrics: {
      avgTemperatureC: '25',
      minTemperatureC: '23',
      maxTemperatureC: '28',
      humidityPercent: '60',
      co2Ppm: '820',
      lightIntensityLux: '62000',
      photoperiodHours: '14',
      irrigationMm: '6',
      fertilizerNKgHa: '160',
      fertilizerPKgHa: '70',
      fertilizerKKgHa: '200',
      pestSeverity: '0',
      pH: '6.4',
      variety: 'Roma',
    },
    chips: {
      temp:     { value: '25',  unit: '°C' },
      humidity: { value: '60',  unit: '%' },
      co2:      { value: '820', unit: 'ppm' },
      light:    { value: '14',  unit: 'hrs' },
    },
  },
  rainy: {
    name: 'rainy',
    metrics: {
      avgTemperatureC: '21',
      minTemperatureC: '20',
      maxTemperatureC: '23',
      humidityPercent: '93',
      co2Ppm: '780',
      lightIntensityLux: '9000',
      photoperiodHours: '10',
      irrigationMm: '14',
      fertilizerNKgHa: '160',
      fertilizerPKgHa: '70',
      fertilizerKKgHa: '200',
      pestSeverity: '0',
      pH: '6.4',
      variety: 'Roma',
    },
    chips: {
      temp:     { value: '21',  unit: '°C' },
      humidity: { value: '93',  unit: '%' },
      co2:      { value: '780', unit: 'ppm' },
      light:    { value: '10',  unit: 'hrs' },
    },
  },
}

const HERO_PREDICTION = { predicted_yield_kg_per_m2: 11.2 }

const SCENE_WEIGHTS = [
  { key: 'sunny',    weight: 0.5 },
  { key: 'rainy',    weight: 0.3 },
  { key: 'particle', weight: 0.2 },
]

export function pickRandomScene() {
  const r = Math.random()
  let acc = 0
  for (const { key, weight } of SCENE_WEIGHTS) {
    acc += weight
    if (r < acc) return HERO_SCENES[key]
  }
  return HERO_SCENES.sunny
}

export default function HeroTomato({ scene }) {
  const active = scene || HERO_SCENES.sunny

  if (active.name === 'particle') {
    return (
      <div className="relative h-full w-full">
        <ParticleTomato />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950/80 to-transparent" />
      </div>
    )
  }

  const rainy = active.name === 'rainy'
  return (
    <div className="relative h-full w-full">
      <TomatoCanvas metrics={active.metrics} prediction={HERO_PREDICTION} hero rainy={rainy} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950/80 to-transparent" />
    </div>
  )
}
