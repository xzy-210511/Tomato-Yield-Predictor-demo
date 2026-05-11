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
    humidityPercent: roundValue(payload.humidityPercent, 0),
    co2Ppm: roundValue(payload.co2Ppm, 0),
    lightIntensityLux: roundValue(payload.lightIntensityLux, 0),
    photoperiodHours: roundValue(payload.photoperiodHours, 1),
    irrigationMm: roundValue(payload.irrigationMm, 1),
    fertilizerNKgHa: roundValue(payload.fertilizerNKgHa, 0),
    fertilizerPKgHa: roundValue(payload.fertilizerPKgHa, 0),
    fertilizerKKgHa: roundValue(payload.fertilizerKKgHa, 0),
    pH: roundValue(payload.pH, 1),
  }

  const groups = [
    {
      key: 'humidityPercent',
      options: makeOptions(baseValues.humidityPercent, [
        clamp(baseValues.humidityPercent - 5, 40, 85),
        baseValues.humidityPercent,
        clamp(baseValues.humidityPercent + 5, 40, 85),
        70,
      ], 'Humidity', formatPercent),
    },
    {
      key: 'co2Ppm',
      options: makeOptions(baseValues.co2Ppm, [
        clamp(baseValues.co2Ppm - 100, 300, 1000),
        baseValues.co2Ppm,
        clamp(baseValues.co2Ppm + 100, 300, 1000),
        clamp(baseValues.co2Ppm + 200, 300, 1000),
      ], 'CO2', formatPpm),
    },
    {
      key: 'lightIntensityLux',
      options: makeOptions(baseValues.lightIntensityLux, [
        clamp(baseValues.lightIntensityLux * 0.9, 0, 60000),
        baseValues.lightIntensityLux,
        clamp(baseValues.lightIntensityLux * 1.1, 0, 60000),
        clamp(baseValues.lightIntensityLux * 1.2, 0, 60000),
      ], 'Light', formatLux),
    },
    {
      key: 'photoperiodHours',
      options: makeOptions(baseValues.photoperiodHours, [
        clamp(baseValues.photoperiodHours - 1, 0, 14),
        baseValues.photoperiodHours,
        clamp(baseValues.photoperiodHours + 1, 0, 14),
      ], 'Photoperiod', formatHours),
    },
    {
      key: 'irrigationMm',
      options: makeOptions(baseValues.irrigationMm, [
        clamp(baseValues.irrigationMm - 1, 0, 20),
        baseValues.irrigationMm,
        clamp(baseValues.irrigationMm + 1, 0, 20),
      ], 'Irrigation', formatMm),
    },
    {
      key: 'fertilizerNKgHa',
      options: makeOptions(baseValues.fertilizerNKgHa, [
        clamp(baseValues.fertilizerNKgHa - 15, 140, 220),
        baseValues.fertilizerNKgHa,
        clamp(baseValues.fertilizerNKgHa + 15, 140, 220),
      ], 'N', formatKgHa),
    },
    {
      key: 'fertilizerPKgHa',
      options: makeOptions(baseValues.fertilizerPKgHa, [
        clamp(baseValues.fertilizerPKgHa - 10, 45, 120),
        baseValues.fertilizerPKgHa,
        clamp(baseValues.fertilizerPKgHa + 10, 45, 120),
      ], 'P', formatKgHa),
    },
    {
      key: 'fertilizerKKgHa',
      options: makeOptions(baseValues.fertilizerKKgHa, [
        clamp(baseValues.fertilizerKKgHa - 15, 140, 255),
        baseValues.fertilizerKKgHa,
        clamp(baseValues.fertilizerKKgHa + 15, 140, 255),
      ], 'K', formatKgHa),
    },
    {
      key: 'pH',
      options: makeOptions(baseValues.pH, [
        clamp(baseValues.pH - 0.2, 5.5, 7.2),
        baseValues.pH,
        clamp(baseValues.pH + 0.2, 5.5, 7.2),
        6.5,
      ], 'pH', formatPlain),
    },
  ]

  const combinations = buildCombinations(groups)
  const candidates = []

  for (let i = 0; i < combinations.length; i += 1) {
    const combination = combinations[i]
    const changedCount = countChangedValues(combination.values, baseValues)
    if (changedCount === 0) continue

    candidates.push({
      label: 'Best full-grid combination',
      payload: copyPayloadWithValues(payload, combination.values),
      changes: combination.changes,
      changeCount: changedCount,
    })
  }

  return removeDuplicateCandidates(candidates, function getKey(candidate) {
    return JSON.stringify(candidate.payload)
  })
}

export function buildTimeSeriesCandidates(form) {
  const basePayload = buildTimeSeriesPayload(form)
  const baseValues = {
    rhMean: roundValue(basePayload.environment.rhMean, 1),
    co2Mean: roundValue(basePayload.environment.co2Mean, 0),
    parLampDaily: roundValue(basePayload.environment.parLampDaily, 0),
    lightOnHoursDaily: roundValue(basePayload.environment.lightOnHoursDaily, 1),
  }

  const groups = [
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
