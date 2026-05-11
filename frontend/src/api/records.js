async function requestRecord(path, options = {}) {
  const res = await fetch(path, options)

  if (!res.ok) {
    const text = await res.text()
    if (res.status === 404) {
      throw new Error('Record or user not found')
    }
    throw new Error(text || `Server error ${res.status}`)
  }

  if (res.status === 204) {
    return null
  }

  return res.json()
}

export function createRecord(payload) {
  return requestRecord('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function listRecords(userId) {
  return requestRecord(`/api/records?userId=${encodeURIComponent(userId)}`)
}

export function renameRecord(recordId, userId, recordName) {
  return requestRecord(
    `/api/records/${encodeURIComponent(recordId)}?userId=${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordName }),
    }
  )
}

export function deleteRecord(recordId, userId) {
  return requestRecord(
    `/api/records/${encodeURIComponent(recordId)}?userId=${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  )
}
