import env from '@/config/env'
import { useAuthStore } from '@/stores/auth.store'

const API_BASE_URL = env.apiUrl

export async function apiRequest(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const { accessToken } = useAuthStore.getState()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (response.status === 401) {
    try {
      await useAuthStore.getState().refreshToken()

      const { accessToken: newAccessToken } = useAuthStore.getState()

      if (newAccessToken) {
        headers['Authorization'] = `Bearer ${newAccessToken}`
      }

      const retryResponse = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
        credentials: 'include',
      })

      return retryResponse
    } catch {
      return response
    }
  }

  return response
}

export async function apiGet<T>(url: string): Promise<T> {
  const response = await apiRequest(url, { method: 'GET' })

  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.statusText}`)
  }

  return response.json()
}

export async function apiPost<T>(url: string, data: unknown): Promise<T> {
  const response = await apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`POST ${url} failed: ${response.statusText}`)
  }

  return response.json()
}

export async function apiPut<T>(url: string, data: unknown): Promise<T> {
  const response = await apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`PUT ${url} failed: ${response.statusText}`)
  }

  return response.json()
}

export async function apiDelete<T>(url: string): Promise<T> {
  const response = await apiRequest(url, { method: 'DELETE' })

  if (!response.ok) {
    throw new Error(`DELETE ${url} failed: ${response.statusText}`)
  }

  return response.json()
}
