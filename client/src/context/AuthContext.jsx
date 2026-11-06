
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data.user)
      return response.data.user
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadUser = async () => {
      try {
        const response = await api.get('/auth/me')
        if (!cancelled) setUser(response.data.user)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadUser()

    return () => {
      cancelled = true
    }
  }, [])

  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials)
    setUser(response.data.user)
    return response.data.user
  }

    const register = async (details) => {
    const response = await api.post('/auth/register', details)
    setUser(response.data.user)
    return response.data.user
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// This hook must remain exported here to preserve the existing AuthContext API.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
