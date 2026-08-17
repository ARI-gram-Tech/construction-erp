import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Same backend as the web app (Phase 1). On a physical device, replace
// localhost with your machine's LAN IP so the phone can reach it.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api'

export const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
