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
      body: 'Tomato growth, photosynthesis and development are temperature-dependent. Cool air slows leaf expansion and stem growth, so the predicted trajectory may be difficult to reach in practice. Evidence: Shamshiri et al. (2018) greenhouse tomato microclimate review; Bayer protected-culture tomato guide.',
      impact: 'Slower height and leaf gain',
      action: 'Raise the locked mean temperature toward the productive comfort band before relying on a strong growth forecast.',
      icon: 'Thermometer',
      color: 'blue',
    }
  }
  if (v > 30) {
    return {
      id: 'ts.temp.high',
      severity: 'high',
      category: 'Climate',
      title: 'Air temperature may stress the growth forecast',
      summary: `Mean air temperature is ${fmt(v)}°C, high enough to increase heat-stress risk.`,
      body: 'High greenhouse temperature can reduce stable vegetative development and increase transpiration pressure. A strong model forecast should be interpreted carefully when the crop is held hot. Evidence: Shamshiri et al. (2018) greenhouse tomato microclimate review; Bayer protected-culture tomato guide.',
      impact: 'Heat-limited growth stability',
      action: 'Improve ventilation, shading, or cooling and keep the average temperature closer to the tomato comfort range.',
      icon: 'Thermometer',
      color: 'red',
    }
  }
  if (v < 18 || v > 28) {
    return {
      id: 'ts.temp.edge',
      severity: 'medium',
      category: 'Climate',
      title: 'Air temperature is near the edge',
      summary: `Mean air temperature is ${fmt(v)}°C; it is usable but not ideal for a clean growth signal.`,
      body: 'Moderate temperature drift can change photosynthesis, respiration and development rate. This matters when interpreting daily height and leaf-count changes. Evidence: Shamshiri et al. (2018) greenhouse tomato microclimate review; Bayer protected-culture tomato guide.',
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
    body: 'The locked air temperature is not the main warning signal for this run. Height and leaf trends can be interpreted mainly against light, CO2 and trajectory balance. Evidence: Shamshiri et al. (2018) greenhouse tomato microclimate review; Bayer protected-culture tomato guide.',
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
      body: 'Humidity affects plant water status, transpiration and nutrient uptake. Dry air can reduce leaf expansion if root uptake cannot keep pace. Evidence: Shamshiri et al. (2018) greenhouse tomato VPD/humidity review; Bayer protected-culture tomato guide.',
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
      body: 'Very humid greenhouse air can reduce transpiration, reduce nutrient-flow stability and increase disease risk. This can make actual canopy development weaker than the forecast. Evidence: Shamshiri et al. (2018) greenhouse tomato VPD/humidity review; Bayer protected-culture tomato guide.',
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
    body: 'The humidity value is not an obvious limiting signal, so trajectory interpretation can focus more on light, CO2 and growth-rate balance. Evidence: Shamshiri et al. (2018) greenhouse tomato VPD/humidity review; Bayer protected-culture tomato guide.',
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
      body: 'CO2 enrichment can increase tomato photosynthesis, but the benefit depends on the light environment. Low CO2 is especially important when light is otherwise adequate. Evidence: Dannehl et al. (2021), CO2 enrichment and PPFD interaction in greenhouse tomato photosynthesis.',
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
      body: 'CO2 response is linked to PPFD. When light is limited, extra CO2 may not fully convert into stronger height or leaf growth. Evidence: Dannehl et al. (2021), CO2 enrichment and PPFD interaction in greenhouse tomato photosynthesis.',
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
    body: 'The CO2 value does not appear to be the main limiting factor for this run. Its benefit should still be interpreted together with lamp PAR. Evidence: Dannehl et al. (2021), CO2 enrichment and PPFD interaction in greenhouse tomato photosynthesis.',
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
      body: 'Tomato growth depends on available photosynthetic light. Low light reduces dry-matter accumulation and can weaken canopy development. Evidence: Dannehl et al. (2021); supplemental LED inter-lighting tomato study showing light/DLI effects on crop growth.',
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
      body: 'High light can support stronger photosynthesis only when other climate factors are not limiting. Mismatched CO2, temperature or humidity can reduce the benefit. Evidence: Dannehl et al. (2021); supplemental LED inter-lighting tomato study showing light/DLI effects on crop growth.',
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
    body: 'The lamp PAR value is suitable for interpreting the predicted height and leaf-count curves, especially when paired with acceptable CO2 and temperature. Evidence: Dannehl et al. (2021); supplemental LED inter-lighting tomato study showing light/DLI effects on crop growth.',
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
      body: 'Photoperiod and intensity together determine daily light integral. A short photoperiod can limit growth even when instant light intensity is acceptable. Evidence: Hao et al. (2025) greenhouse tomato photoperiod/DLI study; Cruz and Gomez (2022) tomato DLI and photoperiod study.',
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
      body: 'Long photoperiod responses depend on daily light integral and light quality. More hours are not automatically better if the crop receives excessive or poorly balanced light. Evidence: Hao et al. (2025) greenhouse tomato photoperiod/DLI study; Cruz and Gomez (2022) tomato DLI and photoperiod study.',
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
      body: 'Daily light integral is driven by both intensity and photoperiod. When both are low, the forecast can show limited leaf and height development. Evidence: Hao et al. (2025) greenhouse tomato photoperiod/DLI study; Cruz and Gomez (2022) tomato DLI and photoperiod study.',
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
      body: 'A height-dominant trajectory can indicate unbalanced vegetative development when leaf formation does not keep pace. This should be interpreted together with light, temperature and humidity. Evidence: Bayer protected-culture tomato cultural-practices guide on balanced vegetative growth; tomato lighting and microclimate studies above.',
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
      body: 'Slow height and leaf development suggests the forecast is constrained. Environmental inputs should be checked before interpreting the crop as on track. Evidence: Bayer protected-culture tomato cultural-practices guide on balanced vegetative growth; tomato lighting and microclimate studies above.',
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
      body: 'The model output shows coordinated stem and leaf development. This does not prove the environment is perfect, but it supports a consistent growth interpretation. Evidence: Bayer protected-culture tomato cultural-practices guide on balanced vegetative growth; tomato lighting and microclimate studies above.',
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
