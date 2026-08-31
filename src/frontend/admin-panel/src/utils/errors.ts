import axios from 'axios'

type LoginErrorCopy = {
  failed: string
  networkError: string
  invalidCredentials: string
}

export function getErrorDetail(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (!error.response && error.message === 'Network Error') {
      return fallback
    }
  }
  if (error instanceof Error) return error.message
  return fallback
}

/** Map login API errors to user-facing copy (EN/VI via `login` messages). */
export function getLoginErrorMessage(error: unknown, copy: LoginErrorCopy): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return copy.networkError
    }
    const detail = error.response.data?.detail
    if (detail === 'Invalid credentials') {
      return copy.invalidCredentials
    }
    if (typeof detail === 'string') return detail
    if (error.response.status === 401) return copy.invalidCredentials
  }
  if (error instanceof Error && error.message === 'Network Error') {
    return copy.networkError
  }
  if (error instanceof Error) return error.message
  return copy.failed
}
