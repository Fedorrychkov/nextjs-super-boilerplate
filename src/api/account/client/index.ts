import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

export type SessionPublicItemModel = {
  id: string
  deviceLabel: string
  loginAt: string | null
  lastSeenAt: string | null
  expiresAt: string | null
  isCurrent: boolean
}

export type SessionAdminItemModel = SessionPublicItemModel & {
  ip: string | null
  userAgent: string | null
}

export class ClientSessionApi {
  private readonly client: AxiosInstance

  constructor() {
    this.client = new Request().apiClient
  }

  async listSessions(): Promise<{ enabled: boolean; list: SessionPublicItemModel[] }> {
    const response = await this.client.get('/api/v1/auth/sessions')

    return response.data
  }

  async revokeSession(id: string): Promise<{ ok: boolean }> {
    const response = await this.client.delete(`/api/v1/auth/sessions/${id}`)

    return response.data
  }

  async revokeOtherSessions(): Promise<{ ok: boolean; revoked: number }> {
    const response = await this.client.delete('/api/v1/auth/sessions', { params: { exceptCurrent: 1 } })

    return response.data
  }

  async listUserSessionsAdmin(userId: string): Promise<{ enabled: boolean; list: SessionAdminItemModel[] }> {
    const response = await this.client.get(`/api/v1/user/sessions/${userId}`)

    return response.data
  }

  async revokeUserSessionAdmin(userId: string, sessionId: string): Promise<{ ok: boolean }> {
    const response = await this.client.delete(`/api/v1/user/sessions/${userId}/${sessionId}`)

    return response.data
  }

  async revokeAllUserSessionsAdmin(userId: string): Promise<{ ok: boolean }> {
    const response = await this.client.delete(`/api/v1/user/sessions/${userId}`)

    return response.data
  }
}

export type OnboardingStepStateModel = {
  id: 'profile' | 'mfa' | 'push'
  completed: boolean
  optional?: boolean
}

export type OnboardingStateModel = {
  enabled: boolean
  dismissed: boolean
  version: number
  steps: OnboardingStepStateModel[]
  pendingCount: number
  complete: boolean
}

export class ClientOnboardingApi {
  private readonly client: AxiosInstance

  constructor() {
    this.client = new Request().apiClient
  }

  async getState(): Promise<OnboardingStateModel> {
    const response = await this.client.get('/api/v1/user/onboarding')

    return response.data
  }

  async completeStep(stepId: OnboardingStepStateModel['id']): Promise<OnboardingStateModel & { ok: boolean }> {
    const response = await this.client.patch('/api/v1/user/onboarding', { action: 'complete', stepId })

    return response.data
  }

  async dismiss(): Promise<OnboardingStateModel & { ok: boolean }> {
    const response = await this.client.patch('/api/v1/user/onboarding', { action: 'dismiss' })

    return response.data
  }
}
