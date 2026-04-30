declare global {
  interface Window {
    __ENV__?: {
      VITE_API_URL?: string
      VITE_API_BASE_URL?: string
      VITE_APP_NAME?: string
      VITE_ENABLE_ANALYTICS?: string | boolean
    }
  }
}

function getRuntimeEnv() {
  if (typeof window === 'undefined') {
    return {}
  }

  return window.__ENV__ ?? {}
}

const runtimeEnv = getRuntimeEnv()

const fallbackApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const runtimeApiUrl = runtimeEnv.VITE_API_URL ?? null
const apiUrl = (runtimeApiUrl || fallbackApiUrl).replace(/\/+$/, '')

const fallbackApiBase =
  import.meta.env.VITE_API_BASE_URL || `${fallbackApiUrl}/api/v1`
const runtimeApiBase = runtimeEnv.VITE_API_BASE_URL ?? null
const apiBaseUrl = (runtimeApiBase || `${apiUrl}/api/v1`).replace(/\/+$/, '')

const fallbackAppName = import.meta.env.VITE_APP_NAME || 'NAPI Águas'
const appName = runtimeEnv.VITE_APP_NAME || fallbackAppName

const analyticsRaw =
  runtimeEnv.VITE_ENABLE_ANALYTICS ?? import.meta.env.VITE_ENABLE_ANALYTICS ?? 'true'
const enableAnalytics =
  analyticsRaw === true || String(analyticsRaw).toLowerCase() === 'true'

const env = {
  apiUrl,
  apiBaseUrl,
  appName,
  enableAnalytics,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const

export type RuntimeEnv = typeof env

export default env
