function toNumber(value) {
  const numberValue = parseFloat(value)
  if (Number.isFinite(numberValue)) {
    return numberValue
  }
  return NaN
}

function clamp(value, min, max) {
  if (value < min) return min
  if (value > max) return max
  return value
}

function roundValue(value, digits) {
  const usedDigits = digits === undefined ? 2 : digits
  const factor = Math.pow(10, usedDigits)
  return Math.round(value * factor) / factor
}

function addUniqueNumber(list, value, digits) {
  if (!Number.isFinite(value)) return
  const rounded = roundValue(value, digits)
  for (let i = 0; i < list.length; i += 1) {
    if (list[i] === rounded) return
  }
  list.push(rounded)
}

function makeChangeText(label, oldValue, newValue, formatValue) {
  return label + ' ' + formatValue(oldValue) + ' -> ' + formatValue(newValue)
}

function makeOptions(currentValue, values, label, formatValue) {
  const uniqueValues = []
  for (let i = 0; i < values.length; i += 1) {
    addUniqueNumber(uniqueValues, values[i], 2)
  }

  const options = []
  for (let i = 0; i < uniqueValues.length; i += 1) {
    const value = uniqueValues[i]
    options.push({
      value,
      isCurrent: value === roundValue(currentValue, 2),
      change: makeChangeText(label, currentValue, value, formatValue),
    })
  }
  return options
}

function combineOptions(groups, index, currentValues, currentChanges, result) {
  if (index >= groups.length) {
    result.push({
      values: currentValues,
      changes: currentChanges,
    })
    return
  }

  const group = groups[index]
  for (let i = 0; i < group.options.length; i += 1) {
    const option = group.options[i]
    const nextValues = Object.assign({}, currentValues)
    nextValues[group.key] = option.value

    const nextChanges = currentChanges.slice()
    if (!option.isCurrent) {
      nextChanges.push(option.change)
    }

    combineOptions(groups, index + 1, nextValues, nextChanges, result)
  }
}

function buildCombinations(groups) {
  const result = []
  combineOptions(groups, 0, {}, [], result)
  return result
}

function countChangedValues(values, baseValues) {
  const keys = Object.keys(baseValues)
  let count = 0
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]
    if (values[key] !== baseValues[key]) {
      count += 1
    }
  }
  return count
}

function removeDuplicateCandidates(candidates, getKey) {
  const result = []
  const seen = {}
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i]
    const key = getKey(candidate)
    if (!seen[key]) {
      seen[key] = true
      result.push(candidate)
    }
  }
  return result
}

function copyObject(source) {
  return Object.assign({}, source)
}

function copyPayloadWithValues(payload, values) {
  const nextPayload = copyObject(payload)
  const keys = Object.keys(values)
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]
    nextPayload[key] = values[key]
  }
  return nextPayload
}

function formatPercent(value) {
  return String(roundValue(value, 0)) + '%'
}

function formatCelsius(value) {
  return String(roundValue(value, 1)) + ' C'
}

function formatPpm(value) {
  return String(roundValue(value, 0)) + ' ppm'
}

function formatLux(value) {
  return String(roundValue(value, 0)) + ' lux'
}

function formatHours(value) {
  return String(roundValue(value, 1)) + ' h'
}

function formatMm(value) {
  return String(roundValue(value, 1)) + ' mm'
}

function formatKgHa(value) {
  return String(roundValue(value, 0)) + ' kg/ha'
}

function formatPlain(value) {
  return String(roundValue(value, 1))
}

export function buildTimeSeriesPayload(form, changedEnvironment) {
  const environment = {
    tAirMean: toNumber(form.tAirMean),
    rhMean: toNumber(form.rhMean),
    co2Mean: toNumber(form.co2Mean),
    parLampDaily: toNumber(form.parLampDaily),
    lightOnHoursDaily: toNumber(form.lightOnHoursDaily),
  }

  const changes = changedEnvironment || {}
  const changeKeys = Object.keys(changes)
  for (let i = 0; i < changeKeys.length; i += 1) {
    const key = changeKeys[i]
    environment[key] = changes[key]
  }

  return {
    startDay: parseInt(form.startDay, 10),
    maturityDay: parseInt(form.maturityDay, 10),
    ec: form.ec,
    light: form.light,
    environment,
  }
}

export function buildYieldCandidates(payload) {
  const baseValues = {
    avgTemperatureC: roundValue(payload.avgTemperatureC, 1),
    minTemperatureC: roundValue(payload.minTemperatureC, 1),
    maxTemperatureC: roundValue(payload.maxTemperatureC, 1),
    humidityPercent: roundValue(payload.humidityPercent, 0),
    co2Ppm: roundValue(payload.co2Ppm, 0),
    lightIntensityLux: roundValue(payload.lightIntensityLux, 0),
    photoperiodHours: roundValue(payload.photoperiodHours, 1),
    irrigationMm: roundValue(payload.irrigationMm, 1),
    fertilizerNKgHa: roundValue(payload.fertilizerNKgHa, 0),
    fertilizerPKgHa: roundValue(payload.fertilizerPKgHa, 0),
    fertilizerKKgHa: roundValue(payload.fertilizerKKgHa, 0),
    pestSeverity: roundValue(payload.pestSeverity, 0),
    pH: roundValue(payload.pH, 1),
  }

  const fieldMeta = {
    avgTemperatureC: { label: 'Avg temperature', format: formatCelsius },
    minTemperatureC: { label: 'Min temperature', format: formatCelsius },
    maxTemperatureC: { label: 'Max temperature', format: formatCelsius },
    humidityPercent: { label: 'Humidity', format: formatPercent },
    co2Ppm: { label: 'CO2', format: formatPpm },
    lightIntensityLux: { label: 'Light', format: formatLux },
    photoperiodHours: { label: 'Photoperiod', format: formatHours },
    irrigationMm: { label: 'Irrigation', format: formatMm },
    fertilizerNKgHa: { label: 'N', format: formatKgHa },
    fertilizerPKgHa: { label: 'P', format: formatKgHa },
    fertilizerKKgHa: { label: 'K', format: formatKgHa },
    pestSeverity: { label: 'Pest level', format: formatPlain },
    pH: { label: 'pH', format: formatPlain },
  }

  const targetValues = {
    avgTemperatureC: 24,
    minTemperatureC: 18,
    maxTemperatureC: 28,
    humidityPercent: 70,
    co2Ppm: 900,
    lightIntensityLux: 42000,
    photoperiodHours: 12,
    irrigationMm: 7,
    fertilizerNKgHa: 160,
    fertilizerPKgHa: 70,
    fertilizerKKgHa: 180,
    pestSeverity: 0,
    pH: 6.5,
  }

  function makeCandidate(label, values) {
    const changes = []
    const roundedValues = {}
    const keys = Object.keys(values)
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i]
      const value = roundValue(values[key], key === 'pH' || key.includes('Temperature') || key === 'photoperiodHours' || key === 'irrigationMm' ? 1 : 0)
      roundedValues[key] = value
      if (value !== baseValues[key]) {
        const meta = fieldMeta[key]
        changes.push(makeChangeText(meta.label, baseValues[key], value, meta.format))
      }
    }
    if (changes.length === 0) return null
    return {
      label,
      payload: copyPayloadWithValues(payload, roundedValues),
      changes,
      changeCount: changes.length,
    }
  }

  const candidates = []

  const scenarioValues = [
    ['Climate target', {
      avgTemperatureC: targetValues.avgTemperatureC,
      minTemperatureC: targetValues.minTemperatureC,
      maxTemperatureC: targetValues.maxTemperatureC,
      humidityPercent: targetValues.humidityPercent,
    }],
    ['Light and carbon target', {
      co2Ppm: targetValues.co2Ppm,
      lightIntensityLux: targetValues.lightIntensityLux,
      photoperiodHours: targetValues.photoperiodHours,
    }],
    ['Nutrient target', {
      fertilizerNKgHa: targetValues.fertilizerNKgHa,
      fertilizerPKgHa: targetValues.fertilizerPKgHa,
      fertilizerKKgHa: targetValues.fertilizerKKgHa,
      pH: targetValues.pH,
    }],
    ['Water and pest target', {
      irrigationMm: targetValues.irrigationMm,
      pestSeverity: targetValues.pestSeverity,
    }],
    ['Full advisor target', targetValues],
  ]

  const oneStepKeys = Object.keys(targetValues)
  for (let i = 0; i < oneStepKeys.length; i += 1) {
    const key = oneStepKeys[i]
    const candidate = makeCandidate(`${fieldMeta[key].label} target`, { [key]: targetValues[key] })
    if (candidate) candidates.push(candidate)
  }

  for (let i = 0; i < scenarioValues.length; i += 1) {
    const candidate = makeCandidate(scenarioValues[i][0], scenarioValues[i][1])
    if (candidate) candidates.push(candidate)
  }

  return removeDuplicateCandidates(candidates, function getKey(candidate) {
    return JSON.stringify(candidate.payload)
  })
}

export function buildTimeSeriesCandidates(form) {
  const basePayload = buildTimeSeriesPayload(form)
  const baseValues = {
    tAirMean: roundValue(basePayload.environment.tAirMean, 1),
    rhMean: roundValue(basePayload.environment.rhMean, 1),
    co2Mean: roundValue(basePayload.environment.co2Mean, 0),
    parLampDaily: roundValue(basePayload.environment.parLampDaily, 0),
    lightOnHoursDaily: roundValue(basePayload.environment.lightOnHoursDaily, 1),
  }

  const groups = [
    {
      key: 'tAirMean',
      options: makeOptions(baseValues.tAirMean, [
        clamp(baseValues.tAirMean - 2, 18, 28),
        baseValues.tAirMean,
        clamp(baseValues.tAirMean + 2, 18, 28),
        24,
      ], 'Air temp', formatCelsius),
    },
    {
      key: 'rhMean',
      options: makeOptions(baseValues.rhMean, [
        clamp(baseValues.rhMean - 5, 45, 85),
        baseValues.rhMean,
        clamp(baseValues.rhMean + 5, 45, 85),
        70,
      ], 'Humidity', formatPercent),
    },
    {
      key: 'co2Mean',
      options: makeOptions(baseValues.co2Mean, [
        clamp(baseValues.co2Mean - 100, 300, 900),
        baseValues.co2Mean,
        clamp(baseValues.co2Mean + 100, 300, 900),
        clamp(baseValues.co2Mean + 200, 300, 900),
      ], 'CO2', formatPpm),
    },
    {
      key: 'parLampDaily',
      options: makeOptions(baseValues.parLampDaily, [
        clamp(baseValues.parLampDaily * 0.9, 0, 1200),
        baseValues.parLampDaily,
        clamp(baseValues.parLampDaily * 1.1, 0, 1200),
        clamp(baseValues.parLampDaily * 1.2, 0, 1200),
      ], 'Lamp PAR', formatPlain),
    },
    {
      key: 'lightOnHoursDaily',
      options: makeOptions(baseValues.lightOnHoursDaily, [
        clamp(baseValues.lightOnHoursDaily - 1, 0, 14),
        baseValues.lightOnHoursDaily,
        clamp(baseValues.lightOnHoursDaily + 1, 0, 14),
      ], 'Light hours', formatHours),
    },
  ]

  const combinations = buildCombinations(groups)
  const candidates = []

  for (let i = 0; i < combinations.length; i += 1) {
    const combination = combinations[i]
    const changedCount = countChangedValues(combination.values, baseValues)
    if (changedCount === 0) continue

    candidates.push({
      label: 'Best conservative combination',
      payload: buildTimeSeriesPayload(form, combination.values),
      changes: combination.changes,
      changeCount: changedCount,
    })
  }

  return removeDuplicateCandidates(candidates, function getKey(candidate) {
    return JSON.stringify(candidate.payload.environment)
  })
}

export function mapTimeSeriesPredictions(predictions) {
  const rows = predictions || []
  const mapped = []

  for (let i = 0; i < rows.length; i += 1) {
    const point = rows[i]
    mapped.push({
      day: point.days_after_transplant,
      plantHeightCm: point.plant_height_cm,
      numLeaves: point.num_leaves,
    })
  }

  return mapped
}

export function summarizeTrajectory(points) {
  const rows = points || []
  if (rows.length < 2) return null

  const first = rows[0]
  const last = rows[rows.length - 1]
  const days = Math.max(1, last.day - first.day)
  const heightDelta = last.plantHeightCm - first.plantHeightCm
  const leafDelta = last.numLeaves - first.numLeaves

  return {
    startDay: first.day,
    endDay: last.day,
    finalHeight: last.plantHeightCm,
    finalLeaves: last.numLeaves,
    heightDelta,
    leafDelta,
    score: heightDelta + leafDelta * 2,
    days,
  }
}

export function buildTimeSeriesComparison(currentPoints, recommendedPoints) {
  const currentRows = currentPoints || []
  const recommendedRows = recommendedPoints || []
  const comparison = []

  for (let i = 0; i < currentRows.length; i += 1) {
    const point = currentRows[i]
    let recommended = null

    for (let j = 0; j < recommendedRows.length; j += 1) {
      if (recommendedRows[j].day === point.day) {
        recommended = recommendedRows[j]
        break
      }
    }

    comparison.push({
      day: point.day,
      currentHeight: point.plantHeightCm,
      recommendedHeight: recommended ? recommended.plantHeightCm : null,
      currentLeaves: point.numLeaves,
      recommendedLeaves: recommended ? recommended.numLeaves : null,
    })
  }

  return comparison
}
