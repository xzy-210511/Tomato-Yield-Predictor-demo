async function postAuth(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    if (res.status === 409) {
      throw new Error('User already exists')
    }
    if (res.status === 401) {
      throw new Error('Invalid credentials')
    }
    throw new Error(text || `Server error ${res.status}`)
  }

  return res.json()
}

export function loginUser(payload) {
  return postAuth('/api/auth/login', payload)
}

export function registerUser(payload) {
  return postAuth('/api/auth/register', payload)
}
