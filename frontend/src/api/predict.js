async function readErrorMessage(res) {
  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const data = await res.json()
    return data?.message || data?.detail || `Server error ${res.status}`
  }

  const text = await res.text()
  return text || `Server error ${res.status}`
}

export async function predictGrowth(payload) {
  const res = await fetch('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  return res.json()
}

export async function predictTimeSeries(payload) {
  const res = await fetch('/api/predict/timeseries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  return res.json()
}

export async function predictIntegrated(payload) {
  const res = await fetch('/api/predict/integrated', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  return res.json()
}
