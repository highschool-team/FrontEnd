import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/index.js'

const AuthContext = createContext(null)

const ROLE_MAP = {
  TECHLEAD: 'techlead',
  PARTLEAD: 'partlead',
  MEMBER: 'member',
  DEVOPS: 'devops',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('user')
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        setUser(parsed)
        setIsAuthenticated(true)
      } catch {
        localStorage.clear()
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password })
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)

    const mappedUser = {
      id: data.user.id,
      email: data.user.email,
      role: ROLE_MAP[data.user.role] ?? data.user.role.toLowerCase(),
      team_id: data.user.team_id,
    }
    localStorage.setItem('user', JSON.stringify(mappedUser))
    setUser(mappedUser)
    setIsAuthenticated(true)
    return mappedUser
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout/')
    } catch {
      // ignore errors on logout
    }
    localStorage.clear()
    setUser(null)
    setIsAuthenticated(false)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
