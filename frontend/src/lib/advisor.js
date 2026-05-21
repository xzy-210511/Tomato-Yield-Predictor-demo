// Rule engine for the AI Optimization Advisor.
// Pure JS, no React imports. Tiered severity (critical/high/medium/low/info) with
// agronomic survival thresholds for each of the 14 yield-form inputs plus cross-field
// interactions. Returns { suggestions, counts }.

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

const VARIETY_NOTES = {
  Roma: {
    summary: 'Paste-type variety, tolerates lower humidity.',
    body: 'Roma fruit set is robust under moderate humidity (55–75%). Keep nitrogen modest to avoid hollow fruit.',
    action: 'Hold N around 120–160 kg/ha; favor steady K through fruiting.',
  },
  Cherry: {
    summary: 'Needs higher light and shorter photoperiod for sweetness.',
    body: 'Cherry varieties accumulate sugar best at 25k+ lux with 11–12 h photoperiod and a 6–8°C diurnal swing.',
    action: 'Target lux ≥ 25 000 and photoperiod 11–12 h.',
  },
  Beefsteak: {
    summary: 'Heavy K demand, sensitive to pH drift.',
    body: 'Beefsteak fruit firmness depends on stable K supply and pH between 6.0 and 6.8.',
    action: 'Bump K to ~180 kg/ha and tighten pH control to ±0.2.',
  },
  Heirloom: {
    summary: 'Prone to cracking under irrigation spikes.',
    body: 'Heirloom skins crack when irrigation swings widely. Even drip cycles outperform large pulses.',
    action: 'Split irrigation into 3–4 small daily cycles instead of 1–2 large ones.',
  },
}

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

function evalAvgTemperature(v) {
  if (!Number.isFinite(v)) return null
  if (v > 40) {
    return {
      id: 'temp.avg.critical-heat',
      severity: 'critical',
      category: 'Climate',
      title: `LETHAL: Avg temperature ${fmt(v)}°C exceeds heat-death threshold`,
      summary: 'Persistent >40°C causes leaf scorch, pollen sterility, and irreversible heat injury.',
      body: 'Tomato optimum sits at 22–26°C. Above 35°C pollen becomes non-viable; above 40°C cellular damage compounds and the plant cannot recover.',
      impact: 'Whole-plant loss risk >80% within hours',
      action: 'Open shade nets, activate fogging/forced ventilation immediately. Target ≤28°C as fast as possible.',
      icon: 'Thermometer',
      color: 'critical',
    }
  }
  if (v < 5) {
    return {
      id: 'temp.avg.critical-cold',
      severity: 'critical',
      category: 'Climate',
      title: `LETHAL: Avg temperature ${fmt(v)}°C — frost / chilling injury`,
      summary: 'Below 5°C tomato cells suffer cold injury; below 0°C ice formation is fatal.',
      body: 'Tomatoes are warm-season; sustained <5°C halts metabolism and damages mitochondria. Prolonged exposure leads to leaf necrosis and plant collapse.',
      impact: 'Crop loss imminent if exposure continues',
      action: 'Switch on heating now; close vents, deploy thermal screens. Target ≥18°C within 2 hours.',
      icon: 'Thermometer',
      color: 'critical',
    }
  }
  if (v > 32) {
    return {
      id: 'temp.avg.high-heat',
      severity: 'high',
      category: 'Climate',
      title: 'Average temperature too high',
      summary: `Avg ${fmt(v)}°C is well above the heat-stress threshold.`,
      body: 'Above 30°C pollen viability drops sharply and fruit abort. Sustained >32°C also blocks lycopene synthesis, leaving fruit pale.',
      impact: 'Yield −12% to −25%',
      action: 'Increase ventilation, deploy 30–50% shade, or add evaporative cooling to pull avg below 28°C.',
      icon: 'Thermometer',
      color: 'red',
    }
  }
  if (v < 15) {
    return {
      id: 'temp.avg.high-cold',
      severity: 'high',
      category: 'Climate',
      title: 'Average temperature too low',
      summary: `Avg ${fmt(v)}°C is well below the photosynthetic comfort band.`,
      body: 'Below 15°C photosynthesis slows sharply, fruit set is delayed, and root nutrient uptake (esp. P, Ca) drops.',
      impact: 'Yield −15% to −20%',
      action: 'Raise greenhouse setpoint by 5–7°C with heating curves; consider thermal screens overnight.',
      icon: 'Thermometer',
      color: 'blue',
    }
  }
  if (v > 29) {
    return {
      id: 'temp.avg.medium-heat',
      severity: 'medium',
      category: 'Climate',
      title: 'Avg temperature drifting hot',
      summary: `Avg ${fmt(v)}°C exits the comfort band (22–26°C).`,
      body: 'Mild heat stress reduces flower fertility and slows lycopene buildup.',
      impact: 'Yield −5%',
      action: 'Bump ventilation rate and target 25–27°C average.',
      icon: 'Thermometer',
      color: 'orange',
    }
  }
  if (v < 18) {
    return {
      id: 'temp.avg.medium-cold',
      severity: 'medium',
      category: 'Climate',
      title: 'Avg temperature on the cool side',
      summary: `Avg ${fmt(v)}°C is below the productive window.`,
      body: 'Photosynthesis runs sub-optimally; fruit fill stretches longer.',
      impact: 'Yield −6%',
      action: 'Raise setpoint by 2–3°C, especially overnight.',
      icon: 'Thermometer',
      color: 'orange',
    }
  }
  if (v > 27 || v < 20) {
    return {
      id: 'temp.avg.low',
      severity: 'low',
      category: 'Climate',
      title: 'Avg temperature near edge of optimum',
      summary: `Avg ${fmt(v)}°C — sweet spot is 22–26°C.`,
      body: 'Small drift; not yet limiting but worth tightening if other levers are also off.',
      impact: 'Minor',
      action: 'Tune setpoint toward 24°C average.',
      icon: 'Thermometer',
      color: 'amber',
    }
  }
  return null
}

function evalMinTemperature(v) {
  if (!Number.isFinite(v)) return null
  if (v < 2) {
    return {
      id: 'temp.min.critical',
      severity: 'critical',
      category: 'Climate',
      title: `LETHAL: Min temperature ${fmt(v)}°C — frost imminent`,
      summary: 'Below 2°C frost can form on leaf surfaces; cellular ice rupture kills tissue.',
      body: 'Tomato is frost-intolerant. A single night below 2°C destroys flowering trusses and may kill young plants outright.',
      impact: 'Truss-level or whole-plant loss',
      action: 'Activate frost protection now: heating, row cover, thermal screens. Hold night minimum ≥10°C.',
      icon: 'Thermometer',
      color: 'critical',
    }
  }
  if (v < 12) {
    return {
      id: 'temp.min.high',
      severity: 'high',
      category: 'Climate',
      title: 'Night temperature critically low',
      summary: `Min ${fmt(v)}°C aborts flowers and stalls fruit set.`,
      body: 'Below 12°C pollen tube growth halts; flowers abscise and that truss fails. Repeated cold nights also stunt root development.',
      impact: 'Truss loss, yield −15%',
      action: 'Hold night setpoint ≥15°C with thermal screens or low-temp heating curves.',
      icon: 'Thermometer',
      color: 'blue',
    }
  }
  if (v < 14) {
    return {
      id: 'temp.min.medium',
      severity: 'medium',
      category: 'Climate',
      title: 'Night temperature on the cool side',
      summary: `Min ${fmt(v)}°C trims fruit-set rate.`,
      body: 'Cool nights below 14°C slow assimilate transfer to fruit and reduce set rate.',
      impact: 'Yield −5%',
      action: 'Lift night setpoint toward 16–17°C.',
      icon: 'Thermometer',
      color: 'orange',
    }
  }
  if (v < 16) {
    return {
      id: 'temp.min.low',
      severity: 'low',
      category: 'Climate',
      title: 'Night minimum below optimum',
      summary: `Min ${fmt(v)}°C — ideal is 16–18°C.`,
      body: 'Mild deviation; tighten when other inputs allow.',
      impact: 'Minor',
      action: 'Nudge night minimum up by 1–2°C.',
      icon: 'Thermometer',
      color: 'amber',
    }
  }
  return null
}

function evalMaxTemperature(v) {
  if (!Number.isFinite(v)) return null
  if (v > 40) {
    return {
      id: 'temp.max.critical',
      severity: 'critical',
      category: 'Climate',
      title: `LETHAL: Max temperature ${fmt(v)}°C — heat-injury zone`,
      summary: 'Daytime peaks >40°C cause leaf scorch and pollen denaturation.',
      body: 'Even short spikes above 40°C destroy pollen viability for that day, and sustained peaks accelerate cellular damage. Combined with low humidity, leaf burn appears within hours.',
      impact: 'Day’s flowers lost; cumulative damage if repeated',
      action: 'Add 50%+ shade, mist, or open vents wide. Target peak ≤32°C.',
      icon: 'Thermometer',
      color: 'critical',
    }
  }
  if (v > 34) {
    return {
      id: 'temp.max.high',
      severity: 'high',
      category: 'Climate',
      title: 'Peak temperature causing pollen failure',
      summary: `Max ${fmt(v)}°C exceeds 34°C — pollen sterility threshold.`,
      body: 'Above 34°C pollen viability collapses; that day’s flowers will not set fruit.',
      impact: 'Daily flower loss',
      action: 'Cap daytime peak at 32°C with shading + ventilation.',
      icon: 'Thermometer',
      color: 'red',
    }
  }
  if (v > 30) {
    return {
      id: 'temp.max.medium',
      severity: 'medium',
      category: 'Climate',
      title: 'Peak temperature elevated',
      summary: `Max ${fmt(v)}°C is above the comfort range.`,
      body: 'Sustained peaks >30°C reduce flowering rate and lycopene content.',
      impact: 'Yield −4%',
      action: 'Increase venting around solar noon.',
      icon: 'Thermometer',
      color: 'orange',
    }
  }
  if (v > 28) {
    return {
      id: 'temp.max.low',
      severity: 'low',
      category: 'Climate',
      title: 'Peak temperature near upper edge',
      summary: `Max ${fmt(v)}°C — keep an eye on it.`,
      body: 'Marginal; not yet limiting.',
      impact: 'Minor',
      action: 'Pre-cool morning before solar peak.',
      icon: 'Thermometer',
      color: 'amber',
    }
  }
  return null
}

function evalDiurnal(minT, maxT) {
  if (!Number.isFinite(minT) || !Number.isFinite(maxT)) return null
  const swing = maxT - minT
  if (swing < 0) {
    return {
      id: 'temp.diurnal.invalid',
      severity: 'critical',
      category: 'Climate',
      title: 'Configuration error: max temp < min temp',
      summary: `Max ${fmt(maxT)}°C is lower than min ${fmt(minT)}°C — sensors or inputs inverted.`,
      body: 'This combination is physically impossible; check probe placement, calibration, or input order before acting on the prediction.',
      impact: 'Prediction unreliable',
      action: 'Verify temperature sensors and re-enter consistent values.',
      icon: 'Activity',
      color: 'critical',
    }
  }
  if (swing > 15) {
    return {
      id: 'temp.diurnal.high',
      severity: 'high',
      category: 'Climate',
      title: 'Diurnal swing extreme',
      summary: `${fmt(swing)}°C between min and max stresses the canopy.`,
      body: 'Beyond a 15°C swing, transpiration whiplashes between extremes, causing blossom-end rot and fruit cracking.',
      impact: 'Cracking + BER risk',
      action: 'Smooth the curve: lift night minimum or trim daytime peak to land within a 6–10°C swing.',
      icon: 'Activity',
      color: 'red',
    }
  }
  if (swing > 10) {
    return {
      id: 'temp.diurnal.medium',
      severity: 'medium',
      category: 'Climate',
      title: 'Diurnal swing larger than ideal',
      summary: `${fmt(swing)}°C between min and max — target 6–8°C.`,
      body: 'Wide swings tax plumbing and transport; modest reduction improves fruit uniformity.',
      impact: 'Fruit uniformity',
      action: 'Aim for a 6–8°C day-night swing.',
      icon: 'Activity',
      color: 'orange',
    }
  }
  if (swing < 4) {
    return {
      id: 'temp.diurnal.flat',
      severity: 'medium',
      category: 'Climate',
      title: 'Diurnal swing too flat',
      summary: `Only ${fmt(swing)}°C between min and max.`,
      body: 'Fruit assimilate transfer needs a 6–8°C day-night swing. A flat profile leaves photosynthate stuck in leaves.',
      impact: 'Flowering −8%',
      action: 'Drop night setpoint by 3–4°C while keeping day setpoint stable.',
      icon: 'Activity',
      color: 'orange',
    }
  }
  return null
}

// ============================================================================
// Humidity
// ============================================================================

function evalHumidity(v) {
  if (!Number.isFinite(v)) return null
  if (v > 95) {
    return {
      id: 'humidity.critical-high',
      severity: 'critical',
      category: 'Climate',
      title: `DANGER: Humidity ${fmt(v, 0)}% — disease epidemic risk`,
      summary: 'Saturating humidity (>95%) drives botrytis, late blight, and powdery mildew explosions.',
      body: 'Above 95% RH, leaf surfaces stay wet, transpiration stalls, and Calcium uptake collapses. Spores germinate within hours; entire houses can be lost in days.',
      impact: 'Disease outbreak risk extreme',
      action: 'Open vents, run dehumidifiers, raise pipe temperature. Drive RH below 80% within 4 hours.',
      icon: 'Droplets',
      color: 'critical',
    }
  }
  if (v < 30) {
    return {
      id: 'humidity.critical-low',
      severity: 'critical',
      category: 'Climate',
      title: `DANGER: Humidity ${fmt(v, 0)}% — severe wilt`,
      summary: 'Below 30% RH transpiration outruns root uptake; plants wilt within hours.',
      body: 'Sustained <30% humidity causes stomatal closure, leaf curling, and severe blossom-end rot from collapsed Ca translocation.',
      impact: 'Acute wilt + BER cascade',
      action: 'Mist or fog immediately; close vents, reduce airflow until RH ≥55%.',
      icon: 'Wind',
      color: 'critical',
    }
  }
  if (v > 85) {
    return {
      id: 'humidity.high',
      severity: 'high',
      category: 'Climate',
      title: 'Humidity too high',
      summary: `RH ${fmt(v, 0)}% boosts fungal disease risk.`,
      body: 'Above 85% RH botrytis and powdery mildew spread quickly and transpiration stalls.',
      impact: 'Disease risk +30%',
      action: 'Vent + dehumidify to drop RH below 75% in canopy zone.',
      icon: 'Droplets',
      color: 'red',
    }
  }
  if (v < 50) {
    return {
      id: 'humidity.low',
      severity: 'high',
      category: 'Climate',
      title: 'Humidity too low',
      summary: `RH ${fmt(v, 0)}% can cause blossom-end stress.`,
      body: 'Below 50% RH transpiration outpaces calcium uptake, leading to blossom-end rot in expanding fruit.',
      impact: 'Yield −6%',
      action: 'Mist or fog briefly mid-morning to lift RH into the 55–75% band.',
      icon: 'Wind',
      color: 'orange',
    }
  }
  if (v > 82 || v < 55) {
    return {
      id: 'humidity.medium',
      severity: 'medium',
      category: 'Climate',
      title: 'Humidity drifting from optimum',
      summary: `RH ${fmt(v, 0)}% — sweet spot is 60–80%.`,
      body: 'Off-target humidity nudges fruit quality and disease pressure.',
      impact: 'Minor',
      action: 'Tune ventilation/misting to 65–75% RH.',
      icon: 'Droplets',
      color: 'orange',
    }
  }
  if (v > 80 || v < 60) {
    return {
      id: 'humidity.low-edge',
      severity: 'low',
      category: 'Climate',
      title: 'Humidity near edge of optimum',
      summary: `RH ${fmt(v, 0)}% — fine, but watch.`,
      body: 'Edge value; small adjustments tighten yield.',
      impact: 'Minor',
      action: 'Aim for 65–75% RH band.',
      icon: 'Droplets',
      color: 'amber',
    }
  }
  return null
}

// ============================================================================
// CO2
// ============================================================================

function evalCO2(v) {
  if (!Number.isFinite(v)) return null
  if (v > 1500) {
    return {
      id: 'co2.critical',
      severity: 'critical',
      category: 'CO2',
      title: `DANGER: CO₂ ${fmt(v, 0)} ppm — toxic level`,
      summary: 'Above 1500 ppm CO₂ closes stomata defensively; >5000 ppm is hazardous to humans.',
      body: 'High CO₂ stops photosynthesis gains and stresses plants. Above 1500 ppm leaves curl, growth slows. Worker safety also at risk above 5000 ppm.',
      impact: 'Photosynthesis halts; safety risk',
      action: 'Stop CO₂ injection, vent to outside air. Target 800–1000 ppm.',
      icon: 'Wind',
      color: 'critical',
    }
  }
  if (v > 1200) {
    return {
      id: 'co2.high',
      severity: 'high',
      category: 'CO2',
      title: 'CO₂ above productive ceiling',
      summary: `${fmt(v, 0)} ppm exceeds the 1000-ppm saturation point.`,
      body: 'Beyond 1200 ppm tomato gains plateau; you’re burning gas with no benefit and approaching stress range.',
      impact: 'Wasted CO₂',
      action: 'Throttle injection back to 800–1000 ppm during light hours.',
      icon: 'Wind',
      color: 'red',
    }
  }
  if (v < 400) {
    return {
      id: 'co2.high-low',
      severity: 'high',
      category: 'CO2',
      title: 'CO₂ below ambient — depleted air',
      summary: `${fmt(v, 0)} ppm is below outdoor air; canopy is drawing it down.`,
      body: 'Below 400 ppm photosynthesis is severely carbon-limited; the canopy literally consumes ambient CO₂ faster than it’s replenished.',
      impact: 'Yield −12%',
      action: 'Open vents or start injection to bring CO₂ above 700 ppm.',
      icon: 'Wind',
      color: 'red',
    }
  }
  if (v < 600 || v > 1100) {
    return {
      id: 'co2.medium',
      severity: 'medium',
      category: 'CO2',
      title: 'CO₂ off the sweet spot',
      summary: `${fmt(v, 0)} ppm — target 800–1000 ppm.`,
      body: 'Between 600 and 800 ppm growth is acceptable but leaving 5–10% of biomass on the table.',
      impact: 'Yield −5%',
      action: 'Tune injection toward 850 ppm during peak light.',
      icon: 'Wind',
      color: 'orange',
    }
  }
  if (v < 700 || v > 1000) {
    return {
      id: 'co2.low',
      severity: 'low',
      category: 'CO2',
      title: 'CO₂ near edge of optimum',
      summary: `${fmt(v, 0)} ppm — close but not centered.`,
      body: 'Minor drift; tighten when other levers are aligned.',
      impact: 'Minor',
      action: 'Center on 850 ppm.',
      icon: 'Wind',
      color: 'blue',
    }
  }
  return null
}

// ============================================================================
// Light
// ============================================================================

function evalLight(v) {
  if (!Number.isFinite(v)) return null
  if (v < 1000) {
    return {
      id: 'light.critical',
      severity: 'critical',
      category: 'Light',
      title: `DANGER: Light ${v.toLocaleString()} lux — photosynthesis starved`,
      summary: 'Below 1000 lux respiration exceeds photosynthesis; the plant burns reserves.',
      body: 'Tomato compensation point is around 1000–2000 lux. Sustained light below this drains carbohydrates, halts growth, and triggers leaf abscission.',
      impact: 'Net carbon loss; plant decline',
      action: 'Add supplemental HPS/LED immediately. Aim for 20 000+ lux at canopy.',
      icon: 'Sun',
      color: 'critical',
    }
  }
  if (v > 70000) {
    return {
      id: 'light.high-burn',
      severity: 'high',
      category: 'Light',
      title: 'Light intensity in burn zone',
      summary: `${v.toLocaleString()} lux — risk of leaf scorch and photoinhibition.`,
      body: 'Above 70 000 lux tomato photosystems saturate and excess energy generates reactive oxygen species, bleaching leaves.',
      impact: 'Leaf scorch, brix drop',
      action: 'Deploy 30–50% shade or whitewash glazing.',
      icon: 'Sun',
      color: 'red',
    }
  }
  if (v < 8000) {
    return {
      id: 'light.high-low',
      severity: 'high',
      category: 'Light',
      title: 'Light intensity insufficient',
      summary: `${v.toLocaleString()} lux is far below productive range.`,
      body: 'Tomato saturates near 50 000 lux. Below 8 000 lux growth is severely light-limited and fruit set fails.',
      impact: 'Yield −15%',
      action: 'Add HPS/LED to lift canopy lux above 25 000 for at least 10 h.',
      icon: 'Sun',
      color: 'amber',
    }
  }
  if (v < 15000) {
    return {
      id: 'light.medium',
      severity: 'medium',
      category: 'Light',
      title: 'Light intensity below productive band',
      summary: `${v.toLocaleString()} lux — ideal is 20 000–40 000.`,
      body: 'Daily light integral is short; fruit fill stretches and brix lags.',
      impact: 'Yield −7%',
      action: 'Supplement with grow lights or extend photoperiod.',
      icon: 'Sun',
      color: 'amber',
    }
  }
  if (v < 20000) {
    return {
      id: 'light.low',
      severity: 'low',
      category: 'Light',
      title: 'Light near minimum useful level',
      summary: `${v.toLocaleString()} lux — works but margins are thin.`,
      body: 'Some growth, no surplus. Boost when energy budget allows.',
      impact: 'Minor',
      action: 'Aim for 25 000+ lux peak.',
      icon: 'Sun',
      color: 'amber',
    }
  }
  return null
}

function evalPhotoperiod(v) {
  if (!Number.isFinite(v)) return null
  if (v < 6 || v > 20) {
    return {
      id: 'photoperiod.critical',
      severity: 'critical',
      category: 'Light',
      title: `DANGER: Photoperiod ${fmt(v)} h — circadian disruption`,
      summary: 'Below 6 h or above 20 h disrupts flowering hormones and triggers leaf chlorosis.',
      body: 'Tomato is day-neutral but tolerates 12–14 h. Extreme photoperiods cause hormonal imbalance, leaf yellowing, and stunting.',
      impact: 'Flowering disrupted',
      action: 'Reset to 12–14 h day length.',
      icon: 'Sun',
      color: 'critical',
    }
  }
  if (v < 8 || v > 18) {
    return {
      id: 'photoperiod.high',
      severity: 'high',
      category: 'Light',
      title: 'Photoperiod outside healthy range',
      summary: `${fmt(v)} h is well off the 12–14 h target.`,
      body: 'Short days starve daily light integral; very long days bleach leaves.',
      impact: 'Yield −10%',
      action: 'Adjust lamp schedule toward 12–14 h.',
      icon: 'Sun',
      color: 'amber',
    }
  }
  if (v < 10 || v > 16) {
    return {
      id: 'photoperiod.medium',
      severity: 'medium',
      category: 'Light',
      title: 'Photoperiod off target',
      summary: `${fmt(v)} h — sweet spot is 12–14 h.`,
      body: 'Marginal day length trims daily DLI.',
      impact: 'Yield −5%',
      action: 'Bring lamps into 12–14 h window.',
      icon: 'Sun',
      color: 'amber',
    }
  }
  if (v < 11 || v > 15) {
    return {
      id: 'photoperiod.low',
      severity: 'low',
      category: 'Light',
      title: 'Photoperiod near edge',
      summary: `${fmt(v)} h — close enough.`,
      body: 'Edge of the productive band; consider centering at 13 h.',
      impact: 'Minor',
      action: 'Center on 12.5–13.5 h.',
      icon: 'Sun',
      color: 'amber',
    }
  }
  return null
}

// ============================================================================
// Irrigation
// ============================================================================

function evalIrrigation(v) {
  if (!Number.isFinite(v)) return null
  if (v <= 0) {
    return {
      id: 'irrigation.critical-zero',
      severity: 'critical',
      category: 'Irrigation',
      title: 'DANGER: No irrigation — dehydration imminent',
      summary: '0 mm/day means the canopy is running on stored moisture only.',
      body: 'A bearing tomato canopy transpires 5–10 mm/day. With zero input the plant wilts within 24–48 h, fruit aborts, and recovery is incomplete.',
      impact: 'Wilt, fruit drop, plant decline',
      action: 'Restore irrigation immediately. Start at 5 mm/day in 3–4 splits.',
      icon: 'Droplets',
      color: 'critical',
    }
  }
  if (v > 25) {
    return {
      id: 'irrigation.critical-flood',
      severity: 'critical',
      category: 'Irrigation',
      title: `DANGER: Irrigation ${fmt(v)} mm/day — root flooding`,
      summary: 'Beyond 25 mm/day the root zone goes anoxic; pythium and phytophthora bloom.',
      body: 'Excess water suffocates roots; oxygen stress kills root hairs within hours, and fruit cracking from sudden uptake spikes destroys marketability.',
      impact: 'Root rot, mass cracking',
      action: 'Cut irrigation to 7–10 mm/day; verify drainage and run-off ratio.',
      icon: 'Droplets',
      color: 'critical',
    }
  }
  if (v < 2) {
    return {
      id: 'irrigation.high-low',
      severity: 'high',
      category: 'Irrigation',
      title: 'Irrigation severely deficient',
      summary: `${fmt(v)} mm/day starves canopy transpiration.`,
      body: 'Mature canopies need 5–10 mm/day. Below 2 mm growth stalls and fruit fail to size.',
      impact: 'Yield −20%',
      action: 'Step up to 5–8 mm/day in 3–4 cycles.',
      icon: 'Droplets',
      color: 'orange',
    }
  }
  if (v > 15) {
    return {
      id: 'irrigation.high',
      severity: 'high',
      category: 'Irrigation',
      title: 'Irrigation excessive',
      summary: `${fmt(v)} mm/day risks waterlogging.`,
      body: 'Beyond 12 mm/day root-zone oxygen falls and pythium thrives. Fruit cracking also rises.',
      impact: 'Disease + cracking',
      action: 'Drop to 7–10 mm/day; verify drainage.',
      icon: 'Droplets',
      color: 'red',
    }
  }
  if (v < 3 || v > 12) {
    return {
      id: 'irrigation.medium',
      severity: 'medium',
      category: 'Irrigation',
      title: 'Irrigation off optimal',
      summary: `${fmt(v)} mm/day — target 5–8 mm.`,
      body: 'Not yet stressing the plant, but tighten for predictability.',
      impact: 'Yield −5%',
      action: 'Center on 6–7 mm/day in even splits.',
      icon: 'Droplets',
      color: 'orange',
    }
  }
  if (v < 5 || v > 10) {
    return {
      id: 'irrigation.low',
      severity: 'low',
      category: 'Irrigation',
      title: 'Irrigation near edge',
      summary: `${fmt(v)} mm/day — fine.`,
      body: 'Edge of band; minor tuning helps.',
      impact: 'Minor',
      action: 'Center at 6–7 mm/day.',
      icon: 'Droplets',
      color: 'blue',
    }
  }
  return null
}

// ============================================================================
// Nutrients (N / P / K / ratio)
// ============================================================================

function evalN(v) {
  if (!Number.isFinite(v)) return null
  if (v <= 0) {
    return {
      id: 'n.critical-zero',
      severity: 'critical',
      category: 'Nutrients',
      title: 'DANGER: Zero nitrogen — chlorosis and collapse',
      summary: 'Without N the canopy yellows and protein synthesis halts.',
      body: 'Tomato is N-hungry; sustained zero application causes chlorosis, leaf drop, and yield collapse within 2–3 weeks.',
      impact: 'Crop failure',
      action: 'Restart fertigation: 140–160 kg N/ha equivalent split across the cycle.',
      icon: 'Leaf',
      color: 'critical',
    }
  }
  if (v > 350) {
    return {
      id: 'n.critical-burn',
      severity: 'critical',
      category: 'Nutrients',
      title: `DANGER: Nitrogen ${fmt(v, 0)} kg/ha — salt burn`,
      summary: 'Above 350 kg N/ha root osmotic stress kills root hairs.',
      body: 'Excessive N drives EC up; roots cannot absorb water and leaves desiccate despite ample irrigation. Ammonia toxicity and nitrate leaching follow.',
      impact: 'Root burn, environmental harm',
      action: 'Cut N to 150–180 kg/ha, flush root zone with low-EC water.',
      icon: 'FlaskConical',
      color: 'critical',
    }
  }
  if (v > 280) {
    return {
      id: 'n.high-excess',
      severity: 'high',
      category: 'Nutrients',
      title: 'Nitrogen excessive',
      summary: `${fmt(v, 0)} kg/ha favours leaf over fruit.`,
      body: 'Heavy N drives vegetative growth, delays colouring, and reduces brix at harvest.',
      impact: 'Brix −1.0',
      action: 'Trim N to ≤200 kg/ha; rebalance K higher.',
      icon: 'Leaf',
      color: 'red',
    }
  }
  if (v < 80) {
    return {
      id: 'n.high-low',
      severity: 'high',
      category: 'Nutrients',
      title: 'Nitrogen too low',
      summary: `${fmt(v, 0)} kg/ha undersupplies leaf area.`,
      body: 'Below 80 kg/ha canopy is thin, photosynthetic capacity drops, fruit cannot fill.',
      impact: 'Yield −15%',
      action: 'Lift N toward 140–160 kg/ha through fertigation.',
      icon: 'Leaf',
      color: 'amber',
    }
  }
  if (v < 120 || v > 220) {
    return {
      id: 'n.medium',
      severity: 'medium',
      category: 'Nutrients',
      title: 'Nitrogen drifting from optimum',
      summary: `${fmt(v, 0)} kg/ha — target 140–180.`,
      body: 'Mild deviation; canopy may be slightly thin or pushy.',
      impact: 'Yield −5%',
      action: 'Recenter N around 150 kg/ha.',
      icon: 'Leaf',
      color: 'orange',
    }
  }
  if (v < 140 || v > 200) {
    return {
      id: 'n.low',
      severity: 'low',
      category: 'Nutrients',
      title: 'Nitrogen near edge',
      summary: `${fmt(v, 0)} kg/ha — fine for now.`,
      body: 'Edge value; small adjustment improves balance.',
      impact: 'Minor',
      action: 'Aim for 150 kg/ha.',
      icon: 'Leaf',
      color: 'emerald',
    }
  }
  return null
}

function evalP(v) {
  if (!Number.isFinite(v)) return null
  if (v > 300) {
    return {
      id: 'p.critical',
      severity: 'critical',
      category: 'Nutrients',
      title: `DANGER: Phosphorus ${fmt(v, 0)} kg/ha — micronutrient lockout`,
      summary: 'Excess P precipitates Fe, Zn, and Mn into unavailable forms.',
      body: 'At >300 kg/ha P, micronutrients lock up; chlorosis appears between veins, and root growth suffers.',
      impact: 'Hidden hunger, yield −20%',
      action: 'Halt P additions, flush, restart at 60–80 kg/ha.',
      icon: 'FlaskConical',
      color: 'critical',
    }
  }
  if (v > 200) {
    return {
      id: 'p.high-excess',
      severity: 'high',
      category: 'Nutrients',
      title: 'Phosphorus excessive',
      summary: `${fmt(v, 0)} kg/ha pushes Zn/Fe out of solution.`,
      body: 'Elevated P competes with micronutrient uptake.',
      impact: 'Yield −8%',
      action: 'Cut P to 80–100 kg/ha.',
      icon: 'FlaskConical',
      color: 'red',
    }
  }
  if (v < 20) {
    return {
      id: 'p.high-low',
      severity: 'high',
      category: 'Nutrients',
      title: 'Phosphorus too low',
      summary: `${fmt(v, 0)} kg/ha starves root and flower development.`,
      body: 'Below 20 kg/ha P, roots stunt, flowering slows, and energy transfer (ATP) is restricted.',
      impact: 'Flowering −15%',
      action: 'Raise P to 60–80 kg/ha.',
      icon: 'FlaskConical',
      color: 'amber',
    }
  }
  if (v < 40 || v > 150) {
    return {
      id: 'p.medium',
      severity: 'medium',
      category: 'Nutrients',
      title: 'Phosphorus drifting',
      summary: `${fmt(v, 0)} kg/ha — target 60–100.`,
      body: 'Mild deviation; root and flower performance off optimum.',
      impact: 'Yield −5%',
      action: 'Center P at 70 kg/ha.',
      icon: 'FlaskConical',
      color: 'orange',
    }
  }
  if (v < 50 || v > 120) {
    return {
      id: 'p.low',
      severity: 'low',
      category: 'Nutrients',
      title: 'Phosphorus near edge',
      summary: `${fmt(v, 0)} kg/ha — close.`,
      body: 'Edge value.',
      impact: 'Minor',
      action: 'Aim for 70–80 kg/ha.',
      icon: 'FlaskConical',
      color: 'emerald',
    }
  }
  return null
}

function evalK(v) {
  if (!Number.isFinite(v)) return null
  if (v <= 0) {
    return {
      id: 'k.critical-zero',
      severity: 'critical',
      category: 'Nutrients',
      title: 'DANGER: Zero potassium — fruit quality collapse',
      summary: 'Without K, fruit firmness and lycopene synthesis fail.',
      body: 'K drives water relations and sugar transport. Zero K causes yellowing, weak stems, and unsaleable fruit.',
      impact: 'Crop quality failure',
      action: 'Restart K at 150–200 kg/ha.',
      icon: 'FlaskConical',
      color: 'critical',
    }
  }
  if (v > 350) {
    return {
      id: 'k.critical-burn',
      severity: 'critical',
      category: 'Nutrients',
      title: `DANGER: Potassium ${fmt(v, 0)} kg/ha — Mg/Ca antagonism`,
      summary: 'Excess K blocks Mg and Ca uptake, producing blossom-end rot and interveinal chlorosis.',
      body: 'Above 350 kg/ha K, magnesium deficiency appears as interveinal yellowing and Ca-related disorders multiply.',
      impact: 'BER outbreak',
      action: 'Halt K, supplement Mg and Ca, restart K at 180 kg/ha.',
      icon: 'FlaskConical',
      color: 'critical',
    }
  }
  if (v > 300) {
    return {
      id: 'k.high-excess',
      severity: 'high',
      category: 'Nutrients',
      title: 'Potassium excessive',
      summary: `${fmt(v, 0)} kg/ha competes with Mg and Ca.`,
      body: 'Cation antagonism reduces Mg/Ca uptake.',
      impact: 'BER risk',
      action: 'Cut K to 180–220 kg/ha.',
      icon: 'FlaskConical',
      color: 'red',
    }
  }
  if (v < 80) {
    return {
      id: 'k.high-low',
      severity: 'high',
      category: 'Nutrients',
      title: 'Potassium too low',
      summary: `${fmt(v, 0)} kg/ha undersupplies fruit fill.`,
      body: 'Below 80 kg/ha fruit firmness, brix, and shelf life decline.',
      impact: 'Quality −20%',
      action: 'Lift K to 150–200 kg/ha through fruiting stage.',
      icon: 'FlaskConical',
      color: 'amber',
    }
  }
  if (v < 120 || v > 260) {
    return {
      id: 'k.medium',
      severity: 'medium',
      category: 'Nutrients',
      title: 'Potassium off optimum',
      summary: `${fmt(v, 0)} kg/ha — target 150–220.`,
      body: 'Mild deviation; quality leans soft.',
      impact: 'Yield −4%',
      action: 'Center K at 180 kg/ha.',
      icon: 'FlaskConical',
      color: 'orange',
    }
  }
  if (v < 140 || v > 240) {
    return {
      id: 'k.low',
      severity: 'low',
      category: 'Nutrients',
      title: 'Potassium near edge',
      summary: `${fmt(v, 0)} kg/ha — fine.`,
      body: 'Edge value.',
      impact: 'Minor',
      action: 'Aim for 180 kg/ha.',
      icon: 'FlaskConical',
      color: 'emerald',
    }
  }
  return null
}

function evalNPKRatio(n, p, k) {
  if (!Number.isFinite(n) || !Number.isFinite(p) || !Number.isFinite(k) || n <= 0) return null
  const knRatio = k / n
  const pnRatio = p / n
  if (knRatio < 0.5 || knRatio > 2.0) {
    return {
      id: 'npk.ratio.high',
      severity: 'high',
      category: 'Nutrients',
      title: 'NPK ratio severely off',
      summary: `K/N=${knRatio.toFixed(2)} P/N=${pnRatio.toFixed(2)} (target K/N≈1, P/N≈0.4).`,
      body: 'Heavy imbalance between N and K creates either pushy vegetative growth or weak fruit fill. Tomato fruit quality leans on K being roughly equal to N.',
      impact: 'Fruit quality + balance',
      action: `Trim K toward ~${Math.round(n)} kg/ha and P toward ~${Math.round(n * 0.4)} kg/ha.`,
      icon: 'FlaskConical',
      color: 'red',
    }
  }
  if (knRatio < 0.67 || knRatio > 1.5 || pnRatio < 0.3 || pnRatio > 0.5) {
    return {
      id: 'npk.ratio.medium',
      severity: 'medium',
      category: 'Nutrients',
      title: 'NPK ratio off',
      summary: `K/N=${knRatio.toFixed(2)} P/N=${pnRatio.toFixed(2)} drifts from the 1:0.4:1 ideal.`,
      body: 'Tomato fruit quality and shelf life lean on K. Excess P at vegetative stage suppresses zinc and iron uptake.',
      impact: 'Fruit quality',
      action: `Trim P toward ~${Math.round(n * 0.4)} kg/ha; lift K toward ~${Math.round(n)} kg/ha.`,
      icon: 'FlaskConical',
      color: 'emerald',
    }
  }
  return null
}

// ============================================================================
// Pest
// ============================================================================

function evalPest(v) {
  if (!Number.isFinite(v)) return null
  if (v >= 5) {
    return {
      id: 'pest.critical',
      severity: 'critical',
      category: 'Pest',
      title: 'DANGER: Pest level 5/5 — total loss imminent',
      summary: 'Extreme infestation. Crop is functionally lost without immediate intervention.',
      body: 'At level 5 the canopy is overwhelmed by feeding damage and viral transmission. Yield drops >60% and quarantine measures are needed.',
      impact: 'Crop failure',
      action: 'Quarantine the house. Combine biocontrol (Encarsia, Orius) with targeted insecticide; remove worst-affected plants.',
      icon: 'Bug',
      color: 'critical',
    }
  }
  if (v >= 3) {
    return {
      id: 'pest.high',
      severity: 'high',
      category: 'Pest',
      title: 'Pest pressure severe',
      summary: `Pest level ${fmt(v, 0)}/5 is critical.`,
      body: 'At level 3+, whitefly and thrips rapidly transmit TYLCV and TSWV. Yield losses compound week-over-week.',
      impact: 'Yield −20%+',
      action: 'Deploy biological controls (Encarsia, Orius) and yellow sticky traps within 24 h.',
      icon: 'Bug',
      color: 'red',
    }
  }
  if (v >= 2) {
    return {
      id: 'pest.medium',
      severity: 'medium',
      category: 'Pest',
      title: 'Pest pressure rising',
      summary: `Level ${fmt(v, 0)}/5 — population is taking hold.`,
      body: 'Moderate infestation; without intervention will progress to severe within 1–2 weeks.',
      impact: 'Yield −8%',
      action: 'Scout twice weekly, deploy traps, consider preventive biocontrol release.',
      icon: 'Bug',
      color: 'orange',
    }
  }
  if (v >= 1) {
    return {
      id: 'pest.low',
      severity: 'low',
      category: 'Pest',
      title: 'Pest pressure low but present',
      summary: `Level ${fmt(v, 0)}/5 — keep monitoring.`,
      body: 'Light pressure; nothing to act on yet but watch closely.',
      impact: 'Minor',
      action: 'Maintain trap density and weekly scouting.',
      icon: 'Bug',
      color: 'amber',
    }
  }
  return null
}

// ============================================================================
// pH
// ============================================================================

function evalPh(v) {
  if (!Number.isFinite(v)) return null
  if (v < 4.5) {
    return {
      id: 'ph.critical-acid',
      severity: 'critical',
      category: 'pH',
      title: `DANGER: pH ${fmt(v)} — aluminum toxicity zone`,
      summary: 'Below 4.5 Al³⁺ becomes soluble and damages root tips.',
      body: 'Severely acidic media free aluminium and manganese to toxic levels; roots blacken and die back, plant collapse follows.',
      impact: 'Root death, plant decline',
      action: 'Apply lime or step solution pH up to 6.0 over 24–48 h.',
      icon: 'Gauge',
      color: 'critical',
    }
  }
  if (v > 8.5) {
    return {
      id: 'ph.critical-alkaline',
      severity: 'critical',
      category: 'pH',
      title: `DANGER: pH ${fmt(v)} — iron and trace lockout`,
      summary: 'Above 8.5 Fe, Mn, Zn become unavailable and roots suffer ionic stress.',
      body: 'Strongly alkaline media lock out micronutrients; severe interveinal chlorosis and stunted root growth follow within days.',
      impact: 'Hidden hunger, root injury',
      action: 'Acidify with phosphoric or sulfuric acid; target pH 6.2–6.5.',
      icon: 'Gauge',
      color: 'critical',
    }
  }
  if (v < 5.5 || v > 7.8) {
    return {
      id: 'ph.high',
      severity: 'high',
      category: 'pH',
      title: 'Soil/solution pH out of healthy range',
      summary: `pH ${fmt(v)} — productive band is 6.0–6.8.`,
      body: 'Outside 5.8–7.2 key nutrients (Fe, P, Mn, Ca) lock out and chlorosis, blossom-end rot, or stunted roots follow.',
      impact: 'Nutrient lockout',
      action: v < 5.5
        ? 'Apply lime or raise solution pH stepwise to 6.2–6.5.'
        : 'Acidify with sulfur or phosphoric acid down to 6.2–6.5.',
      icon: 'Gauge',
      color: 'orange',
    }
  }
  if (v < 5.8 || v > 7.2) {
    return {
      id: 'ph.medium',
      severity: 'medium',
      category: 'pH',
      title: 'pH drifting from optimum',
      summary: `pH ${fmt(v)} — target 6.2–6.8.`,
      body: 'Mild deviation; nutrient availability is suboptimal.',
      impact: 'Yield −5%',
      action: 'Adjust solution pH toward 6.5.',
      icon: 'Gauge',
      color: 'orange',
    }
  }
  if (v < 6.0 || v > 7.0) {
    return {
      id: 'ph.low',
      severity: 'low',
      category: 'pH',
      title: 'pH near edge',
      summary: `pH ${fmt(v)} — close to ideal.`,
      body: 'Edge of band.',
      impact: 'Minor',
      action: 'Center on 6.5.',
      icon: 'Gauge',
      color: 'amber',
    }
  }
  return null
}

// ============================================================================
// Variety
// ============================================================================

function evalVariety(variety) {
  const note = VARIETY_NOTES[variety]
  if (!note) return null
  return {
    id: 'variety.note',
    severity: 'info',
    category: 'Variety',
    title: `${variety} profile`,
    summary: note.summary,
    body: note.body,
    impact: 'Profile tip',
    action: note.action,
    icon: 'Leaf',
    color: 'emerald',
  }
}

// ============================================================================
// Cross-field interactions
// ============================================================================

function evalCrossField(f) {
  const out = []
  if (Number.isFinite(f.avgT) && Number.isFinite(f.rh) && f.avgT >= 28 && f.rh >= 85) {
    out.push({
      id: 'cross.fungal',
      severity: 'high',
      category: 'Climate',
      title: 'Fungal disease window — warm + humid',
      summary: `${fmt(f.avgT)}°C with ${fmt(f.rh, 0)}% RH triggers blight and powdery mildew.`,
      body: 'When temperature ≥28°C overlaps with humidity ≥85%, late blight, botrytis, and powdery mildew spore germination spikes within hours.',
      impact: 'Disease outbreak risk',
      action: 'Vent + dehumidify; preventive fungicide if resistant disease present.',
      icon: 'Droplets',
      color: 'red',
    })
  }
  if (Number.isFinite(f.n) && Number.isFinite(f.k) && f.n >= 220 && f.k <= 130) {
    out.push({
      id: 'cross.npk-vegetative',
      severity: 'medium',
      category: 'Nutrients',
      title: 'High N + low K = vegetative imbalance',
      summary: `N=${fmt(f.n, 0)}, K=${fmt(f.k, 0)} skews toward leaf, away from fruit.`,
      body: 'Strong N drive without matching K builds a thick canopy that struggles to set and fill fruit. Brix lags and shelf life shortens.',
      impact: 'Yield −7%, brix lower',
      action: `Lift K toward ~${Math.round(f.n)} kg/ha so K/N ≈ 1.`,
      icon: 'Leaf',
      color: 'emerald',
    })
  }
  if (Number.isFinite(f.co2) && Number.isFinite(f.lux) && f.co2 >= 1000 && f.lux < 15000) {
    out.push({
      id: 'cross.co2-light',
      severity: 'low',
      category: 'CO2',
      title: 'CO₂ enrichment wasted under low light',
      summary: `${fmt(f.co2, 0)} ppm CO₂ paired with ${f.lux.toLocaleString()} lux — light is the bottleneck.`,
      body: 'Below ~15 000 lux, light is the limiting input; extra CO₂ above ambient cannot be utilised and just costs gas.',
      impact: 'CO₂ cost waste',
      action: 'Lift light first (supplemental lamps), or trim CO₂ to ambient until lux is up.',
      icon: 'Wind',
      color: 'blue',
    })
  }
  if (f.variety === 'Cherry' && Number.isFinite(f.n) && f.n >= 200) {
    out.push({
      id: 'cross.cherry-n',
      severity: 'medium',
      category: 'Nutrients',
      title: 'Cherry variety + high N — cracking risk',
      summary: `Cherry varieties at N ${fmt(f.n, 0)} kg/ha tend to crack from rapid uptake.`,
      body: 'Cherry skins are thin; high-N cultivation accelerates fruit growth past skin elasticity, causing concentric or radial cracks.',
      impact: 'Marketability −15%',
      action: 'Trim N to 130–160 kg/ha for Cherry; tighten irrigation evenness.',
      icon: 'Leaf',
      color: 'orange',
    })
  }
  return out
}

// ============================================================================
// Yield context fallback
// ============================================================================

function evalYieldContext(predictedYield, currentTips) {
  const hasMajor = currentTips.some(s =>
    s.severity === 'critical' || s.severity === 'high' || s.severity === 'medium'
  )
  if (Number.isFinite(predictedYield) && predictedYield < 12 && !currentTips.some(s => s.severity === 'critical' || s.severity === 'high')) {
    return {
      id: 'yield.below-target-balanced',
      severity: 'info',
      category: 'Status',
      title: `Yield ${predictedYield.toFixed(2)} kg/m² below target`,
      summary: 'No single critical bottleneck — likely a combined-environment effect.',
      body: 'Prediction is in the low-yield class (<12 kg/m²) yet individual inputs aren’t flagged. Variety choice or compounding mid-tier deviations may explain it.',
      impact: 'Below target',
      action: 'Tighten the tips below as a bundle and re-run.',
      icon: 'Activity',
      color: 'slate',
    }
  }
  if (!hasMajor) {
    const yieldText = Number.isFinite(predictedYield) ? `${predictedYield.toFixed(2)} kg/m²` : 'within target'
    return {
      id: 'balanced.ok',
      severity: 'info',
      category: 'Status',
      title: 'Conditions balanced',
      summary: `No major bottleneck detected. Forecast ${yieldText}.`,
      body: 'Environmental, nutrient, and pest controls are within healthy ranges. Maintain current setpoints and re-check after each truss.',
      impact: 'On track',
      action: 'Hold the current recipe and monitor weekly.',
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

export function analyzeYieldInput(form, predictedYield) {
  if (!form || typeof form !== 'object') {
    return { suggestions: [], counts: { ...EMPTY_COUNTS } }
  }

  const f = {
    avgT: num(form.avgTemperatureC),
    minT: num(form.minTemperatureC),
    maxT: num(form.maxTemperatureC),
    rh: num(form.humidityPercent),
    co2: num(form.co2Ppm),
    lux: num(form.lightIntensityLux),
    photo: num(form.photoperiodHours),
    irr: num(form.irrigationMm),
    n: num(form.fertilizerNKgHa),
    p: num(form.fertilizerPKgHa),
    k: num(form.fertilizerKKgHa),
    pest: num(form.pestSeverity),
    pH: num(form.pH),
    variety: form.variety,
  }

  const tips = []
  const push = t => { if (t) tips.push(t) }
  const pushAll = ts => { if (ts && ts.length) tips.push(...ts) }

  push(evalAvgTemperature(f.avgT))
  push(evalMinTemperature(f.minT))
  push(evalMaxTemperature(f.maxT))
  push(evalDiurnal(f.minT, f.maxT))
  push(evalHumidity(f.rh))
  push(evalCO2(f.co2))
  push(evalLight(f.lux))
  push(evalPhotoperiod(f.photo))
  push(evalIrrigation(f.irr))
  push(evalN(f.n))
  push(evalP(f.p))
  push(evalK(f.k))
  push(evalNPKRatio(f.n, f.p, f.k))
  push(evalPest(f.pest))
  push(evalPh(f.pH))
  push(evalVariety(f.variety))
  pushAll(evalCrossField(f))
  push(evalYieldContext(predictedYield, tips))

  tips.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])

  const counts = tips.reduce(
    (acc, s) => ({ ...acc, [s.severity]: (acc[s.severity] || 0) + 1 }),
    { ...EMPTY_COUNTS }
  )

  return { suggestions: tips, counts }
}

export function deriveBottleneck(form) {
  if (!form || typeof form !== 'object') return null
  const pest = num(form.pestSeverity)
  const co2 = num(form.co2Ppm)
  const pH = num(form.pH)
  if (Number.isFinite(pest) && pest >= 3) {
    return { label: 'Pest Level', desc: 'Critical pest levels detected.', color: 'red' }
  }
  if (Number.isFinite(co2) && co2 < 600) {
    return { label: 'CO2 Level', desc: 'Low CO2 is limiting photosynthesis.', color: 'blue' }
  }
  if (Number.isFinite(pH) && (pH < 5.8 || pH > 7.2)) {
    return { label: 'Soil pH', desc: 'pH imbalance is affecting nutrient uptake.', color: 'orange' }
  }
  return { label: 'Balanced', desc: 'Metabolic rates are within a healthy range.', color: 'emerald' }
}

export function deriveYieldClass(predictedYield) {
  const v = num(predictedYield)
  if (!Number.isFinite(v)) return null
  if (v < 12) return 'Low'
  if (v < 20) return 'Stable'
  return 'High'
}

