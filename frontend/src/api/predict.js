export async function predictGrowth(payload) {
  const res = await fetch('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const data = await res.json()
      const message = data?.message || data?.detail
      throw new Error(message || `Server error ${res.status}`)
    }

    const text = await res.text()
    throw new Error(text || `Server error ${res.status}`)
  }

  return res.json()
}
