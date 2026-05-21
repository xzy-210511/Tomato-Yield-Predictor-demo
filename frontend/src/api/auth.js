async function postAuth(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    if (res.status === 409) {
      throw new Error('Unable to create account with these details')
    }
    if (res.status === 401) {
      throw new Error('Invalid username or password')
    }
    let message = `Server error ${res.status}`
    try {
      const data = text ? JSON.parse(text) : null
      message = data?.message || message
    } catch {
      message = `Server error ${res.status}`
    }
    throw new Error(message)
  }

  return res.json()
}

export function loginUser(payload) {
  return postAuth('/api/auth/login', payload)
}

export function registerUser(payload) {
  return postAuth('/api/auth/register', payload)
}
