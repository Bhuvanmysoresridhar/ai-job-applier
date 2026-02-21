import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  const login = async (email, password) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    const res = await axios.post(`${API_BASE}/api/auth/login`, form)
    const { access_token, user_id, full_name } = res.data
    localStorage.setItem('token', access_token)
    setToken(access_token)
    setUser({ id: user_id, full_name, email })
    return res.data
  }

  const signup = async (email, full_name, password) => {
    const res = await axios.post(`${API_BASE}/api/auth/signup`, { email, full_name, password })
    const { access_token, user_id } = res.data
    localStorage.setItem('token', access_token)
    setToken(access_token)
    setUser({ id: user_id, full_name, email })
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, API_BASE }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
