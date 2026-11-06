
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import api from '../lib/api'

const defaultPreferences = {
  lowStockAlerts: true,
  compactTable: false,
  confirmStockChanges: true,
}

const PreferencesContext = createContext(null)

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [preferencesLoading, setPreferencesLoading] = useState(true)

  const refreshPreferences = useCallback(async () => {
    try {
      const response = await api.get('/settings/preferences')
      const savedPreferences =
        response.data.preferences ?? response.data

      setPreferences((current) => ({
        ...current,
        ...savedPreferences,
      }))

      return savedPreferences
    } catch (error) {
      console.error('Unable to load preferences:', error)
      return null
    } finally {
      setPreferencesLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshPreferences()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [refreshPreferences])

  const savePreferences = useCallback(async (nextPreferences) => {
    const response = await api.patch(
      '/settings/preferences',
      nextPreferences,
    )

    const savedPreferences =
      response.data.preferences ?? response.data

    setPreferences((current) => ({
      ...current,
      ...savedPreferences,
    }))

    return savedPreferences
  }, [])

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        preferencesLoading,
        setPreferences,
        refreshPreferences,
        savePreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  )
}

// This hook stays alongside its provider to preserve the context API.
// eslint-disable-next-line react-refresh/only-export-components
export function usePreferences() {
  const context = useContext(PreferencesContext)

  if (!context) {
    throw new Error(
      'usePreferences must be used inside PreferencesProvider',
    )
  }

  return context
}
