import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = checking, null = not logged in, object = logged in
  const [user, setUser] = useState(undefined)

  const refresh = useCallback(async () => {
    try {
      const result = await api.me()
      if (result?.code === 200) {
        setUser(result.content)
        return result.content
      }
      setUser(null)
      return null
    } catch {
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const handler = () => setUser(null)
    window.addEventListener('xxl-auth-expired', handler)
    return () => window.removeEventListener('xxl-auth-expired', handler)
  }, [])

  return <AuthContext.Provider value={{ user, setUser, refresh }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
