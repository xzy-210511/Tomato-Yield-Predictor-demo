// Rule engine for the time-series growth AI advisor.
// Pure JS, no React imports. Uses the same suggestion shape as advisor.js.

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

function num(v) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : NaN
}

function fmt(v, digits = 1) {
  return Number.isFinite(v) ? v.toFixed(digits) : '--'
}

// ============================================================================
// Temperature
// ============================================================================

function evalAirTemperature(v) {
  if (!Number.isFinite(v)) return null
  if (v < 15) {
    return {
      id: 'ts.temp.low',
      severity: 'high',
      category: 'Climate',
      title: 'Air temperature may slow growth',
      summary: `Mean air temperature is ${fmt(v)}°C, below the productive greenhouse tomato range.`,
      body: 'Low air temperature can slow leaf expansion, stem growth, and daily development, so the growth curve may respond more weakly than expected.',
      impact: 'Slower height and leaf gain',
      action: 'Raise the locked mean temperature toward the productive comfort band before relying on a strong growth forecast.',
      icon: 'Thermometer',
      color: 'blue',
    }
  }
  if (v >= 32) {
    return {
      id: 'ts.temp.high',
      severity: 'high',
      category: 'Climate',
      title: 'Air temperature may stress the growth forecast',
      summary: `Mean air temperature is ${fmt(v)}°C, high enough to create serious heat-stress risk.`,
      body: 'High air temperature can reduce fruit set, reduce quality, destabilize vegetative growth, and cause visible stress such as wilting or weak leaves.',
      impact: 'Heat-limited growth stability',
      action: 'Improve ventilation, shading, or cooling and keep the average temperature closer to the tomato comfort range.',
      icon: 'Thermometer',
      color: 'red',
    }
  }
  if (v > 26) {
    return {
      id: 'ts.temp.warm',
      severity: 'medium',
      category: 'Climate',
      title: 'Temperature may reduce production',
      summary: `Mean air temperature is ${fmt(v)}°C, above the safer productive range.`,
      body: 'Warm conditions can reduce tomato production efficiency and make the predicted growth curve less reliable if cooling or ventilation is limited.',
      impact: 'Production and growth risk',
      action: 'Use cooling, ventilation or shading before trusting a strong growth forecast under warm conditions.',
      icon: 'Thermometer',
      color: 'orange',
    }
  }
  if (v < 18) {
    return {
      id: 'ts.temp.edge',
      severity: 'medium',
      category: 'Climate',
      title: 'Air temperature is near the edge',
      summary: `Mean air temperature is ${fmt(v)}°C; it is usable but not ideal for a clean growth signal.`,
      body: 'The temperature is not extreme, but it sits close to a less efficient range, so small changes may affect height and leaf development.',
      impact: 'Moderate growth uncertainty',
      action: 'Keep the temperature closer to the middle of the greenhouse tomato comfort range during the forecast window.',
      icon: 'Thermometer',
      color: 'orange',
    }
  }
  return {
    id: 'ts.temp.ok',
    severity: 'info',
    category: 'Climate',
    title: 'Temperature supports the forecast',
    summary: `Mean air temperature is ${fmt(v)}°C, which is suitable for interpreting the growth trajectory.`,
    body: 'The temperature setting is inside a practical range for tomato growth, so other factors such as light, CO2, and humidity should explain most changes.',
    impact: 'On track',
    action: 'Maintain the current temperature setpoint and continue monitoring trajectory changes.',
    icon: 'CheckCircle2',
    color: 'emerald',
  }
}

// ============================================================================
// Humidity
// ============================================================================

function evalHumidity(v) {
  if (!Number.isFinite(v)) return null
  if (v < 50) {
    return {
      id: 'ts.rh.low',
      severity: 'medium',
      category: 'Climate',
      title: 'Humidity may increase water stress',
      summary: `Relative humidity is ${fmt(v)}%, which can push stronger transpiration demand.`,
      body: 'Low humidity can increase transpiration demand and water stress, which may limit leaf expansion and make the canopy develop unevenly.',
      impact: 'Leaf expansion risk',
      action: 'Avoid long dry periods and check whether leaf growth is weaker than height growth.',
      icon: 'Droplets',
      color: 'orange',
    }
  }
  if (v > 85) {
    return {
      id: 'ts.rh.high',
      severity: 'medium',
      category: 'Climate',
      title: 'Humidity may reduce transpiration balance',
      summary: `Relative humidity is ${fmt(v)}%, high enough to weaken transpiration and raise disease pressure.`,
      body: 'Very humid air can reduce transpiration balance and increase canopy disease pressure, especially when air movement is limited.',
      impact: 'Canopy health risk',
      action: 'Increase air exchange or dehumidification and avoid persistent saturated air.',
      icon: 'Droplets',
      color: 'orange',
    }
  }
  return {
    id: 'ts.rh.ok',
    severity: 'info',
    category: 'Climate',
    title: 'Humidity is not a major warning',
    summary: `Relative humidity is ${fmt(v)}%, which supports a stable water-balance interpretation.`,
    body: 'Humidity is in a workable range, so water-balance stress is unlikely to be the main explanation for this forecast.',
    impact: 'On track',
    action: 'Maintain moderate humidity and continue watching leaf expansion.',
    icon: 'CheckCircle2',
    color: 'emerald',
  }
}

// ============================================================================
// CO2
// ============================================================================

function evalCO2(co2, par) {
  if (!Number.isFinite(co2)) return null
  if (co2 < 400) {
    return {
      id: 'ts.co2.low',
      severity: 'medium',
      category: 'Climate',
      title: 'CO2 may limit photosynthesis',
      summary: `CO2 is ${fmt(co2, 0)} ppm, so carbon supply may limit the predicted growth curve.`,
      body: 'Low CO2 can limit photosynthesis, especially when light is sufficient enough for the crop to use extra carbon.',
      impact: 'Photosynthesis constraint',
      action: 'If height and leaf rates are weak, check CO2 supply together with PAR rather than treating CO2 alone.',
      icon: 'Wind',
      color: 'orange',
    }
  }
  if (co2 > 900 && Number.isFinite(par) && par < 300) {
    return {
      id: 'ts.co2.light-mismatch',
      severity: 'low',
      category: 'Climate',
      title: 'High CO2 may not pay off under low light',
      summary: `CO2 is ${fmt(co2, 0)} ppm, but lamp PAR is only ${fmt(par, 0)}.`,
      body: 'CO2 enrichment is less efficient when light input is low, because the crop may not have enough light energy to convert the extra carbon into growth.',
      impact: 'Efficiency warning',
      action: 'Prioritize improving light availability before assuming CO2 enrichment will drive the trajectory.',
      icon: 'Wind',
      color: 'amber',
    }
  }
  return {
    id: 'ts.co2.ok',
    severity: 'info',
    category: 'Climate',
    title: 'CO2 is acceptable for this forecast',
    summary: `CO2 is ${fmt(co2, 0)} ppm; no major CO2 warning is detected.`,
    body: 'CO2 is not the main limiting signal in this run, but it should still be interpreted together with light intensity and photoperiod.',
    impact: 'On track',
    action: 'Keep CO2 interpretation paired with light intensity and photoperiod.',
    icon: 'CheckCircle2',
    color: 'emerald',
  }
}

// ============================================================================
// Light intensity
// ============================================================================

function evalLampPar(v) {
  if (!Number.isFinite(v)) return null
  if (v < 250) {
    return {
      id: 'ts.par.low',
      severity: 'medium',
      category: 'Light',
      title: 'Lamp PAR may constrain growth',
      summary: `Daily lamp PAR is ${fmt(v, 0)}, which may make a strong growth forecast optimistic.`,
      body: 'Low light input can reduce photosynthesis, dry matter accumulation, and final growth performance.',
      impact: 'Light-limited trajectory',
      action: 'If height and leaf gain are weak, improve available light before changing other climate factors.',
      icon: 'Sun',
      color: 'orange',
    }
  }
  if (v > 1200) {
    return {
      id: 'ts.par.high',
      severity: 'low',
      category: 'Light',
      title: 'High lamp PAR needs matching climate',
      summary: `Daily lamp PAR is ${fmt(v, 0)}, so CO2 and temperature should be checked alongside light.`,
      body: 'High light only helps when temperature, CO2, and humidity can support the extra photosynthetic demand.',
      impact: 'Climate-match warning',
      action: 'Confirm CO2 and temperature are also in range before expecting faster height and leaf growth.',
      icon: 'Sun',
      color: 'amber',
    }
  }
  return {
    id: 'ts.par.ok',
    severity: 'info',
    category: 'Light',
    title: 'Lamp PAR supports interpretation',
    summary: `Daily lamp PAR is ${fmt(v, 0)}, with no major light-intensity warning.`,
    body: 'Light intensity is in a practical range for comparing forecast runs, so large growth differences are more likely to come from other inputs.',
    impact: 'On track',
    action: 'Keep the light setting stable while comparing trajectory changes across runs.',
    icon: 'CheckCircle2',
    color: 'emerald',
  }
}

// ============================================================================
// Photoperiod
// ============================================================================

function evalPhotoperiod(hours, par) {
  if (!Number.isFinite(hours)) return null
  if (hours < 6) {
    return {
      id: 'ts.photo.short',
      severity: 'medium',
      category: 'Light',
      title: 'Light duration may be too short',
      summary: `Lamp-on time is ${fmt(hours)} h/day, which can limit daily light integral.`,
      body: 'A short photoperiod lowers total daily light input, even when lamp intensity looks acceptable.',
      impact: 'Daily light limitation',
      action: 'Interpret weak height or leaf gain as a possible light-duration problem, especially if PAR is also low.',
      icon: 'Sun',
      color: 'orange',
    }
  }
  if (hours > 18) {
    return {
      id: 'ts.photo.long',
      severity: 'low',
      category: 'Light',
      title: 'Long photoperiod should be checked against DLI',
      summary: `Lamp-on time is ${fmt(hours)} h/day, so photoperiod should be evaluated together with PAR.`,
      body: 'A long photoperiod may waste energy or create imbalance if the crop, CO2, and temperature cannot use the extra light efficiently.',
      impact: 'Efficiency warning',
      action: 'Use PAR and photoperiod together when explaining the growth curve.',
      icon: 'Sun',
      color: 'amber',
    }
  }
  if (Number.isFinite(par) && par < 300 && hours < 10) {
    return {
      id: 'ts.photo.par-combo',
      severity: 'medium',
      category: 'Light',
      title: 'Low PAR and short photoperiod combine',
      summary: `PAR ${fmt(par, 0)} with ${fmt(hours)} h/day suggests a low total light input.`,
      body: 'Low intensity and short duration combine into a stronger light limitation than either factor alone.',
      impact: 'Compound light constraint',
      action: 'Increase either lamp PAR or lamp-on hours before expecting a stronger growth trajectory.',
      icon: 'Sun',
      color: 'orange',
    }
  }
  return null
}

// ============================================================================
// Growth trajectory
// ============================================================================

function evalGrowthBalance(stats) {
  if (!stats || !Number.isFinite(stats.heightRate) || !Number.isFinite(stats.leafRate)) return null
  const { heightRate, leafRate, heightDelta, leafDelta } = stats
  if (heightRate > 0.35 && leafRate < 0.08) {
    return {
      id: 'ts.balance.height-heavy',
      severity: 'medium',
      category: 'Growth Balance',
      title: 'Height and leaf growth are unbalanced',
      summary: `Height rises ${fmt(heightRate, 2)} cm/day, while leaves rise only ${fmt(leafRate, 2)} leaves/day.`,
      body: 'A height-heavy curve can indicate stretched growth, where stem elongation is stronger than canopy development.',
      impact: 'Possible stretched growth',
      action: 'Check whether light is insufficient or temperature is pushing stem elongation faster than canopy development.',
      icon: 'Activity',
      color: 'orange',
    }
  }
  if (heightRate < 0.12 && leafRate < 0.05) {
    return {
      id: 'ts.balance.slow',
      severity: 'medium',
      category: 'Growth Balance',
      title: 'Predicted growth is slow',
      summary: `Height gain is ${fmt(heightDelta)} cm and leaf gain is ${fmt(leafDelta)} over the window.`,
      body: 'When both height and leaf growth are weak, the limitation is more likely to come from combined climate and light conditions than from one isolated input.',
      impact: 'Low vigor signal',
      action: 'Review temperature, light and CO2 together; do not treat the slow curve as a nutrient-solution issue by default.',
      icon: 'Activity',
      color: 'orange',
    }
  }
  if (heightRate > 0.2 && leafRate > 0.08) {
    return {
      id: 'ts.balance.ok',
      severity: 'info',
      category: 'Growth Balance',
      title: 'Growth trajectory is balanced',
      summary: `Height and leaf count both increase across D${stats.startDay}-D${stats.endDay}.`,
      body: 'The predicted trajectory shows height and leaf development moving together, so this run is useful as a baseline for comparison.',
      impact: 'On track',
      action: 'Use this run as a comparison baseline when changing climate inputs.',
      icon: 'CheckCircle2',
      color: 'emerald',
    }
  }
  return null
}

// ============================================================================
// Public entry
// ============================================================================

const EMPTY_COUNTS = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }

export function analyzeTimeSeriesInput(form, predictions = [], stats = null) {
  if (!form || typeof form !== 'object') {
    return { suggestions: [], counts: { ...EMPTY_COUNTS } }
  }

  const f = {
    tAirMean: num(form.tAirMean),
    rhMean: num(form.rhMean),
    co2Mean: num(form.co2Mean),
    parLampDaily: num(form.parLampDaily),
    lightOnHoursDaily: num(form.lightOnHoursDaily),
  }

  const tips = []
  const push = t => { if (t) tips.push(t) }

  push(evalAirTemperature(f.tAirMean))
  push(evalHumidity(f.rhMean))
  push(evalCO2(f.co2Mean, f.parLampDaily))
  push(evalLampPar(f.parLampDaily))
  push(evalPhotoperiod(f.lightOnHoursDaily, f.parLampDaily))
  if (predictions.length > 0) push(evalGrowthBalance(stats))

  tips.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])

  const counts = tips.reduce(
    (acc, s) => ({ ...acc, [s.severity]: (acc[s.severity] || 0) + 1 }),
    { ...EMPTY_COUNTS }
  )

  return { suggestions: tips, counts }
}
