import { Request } from '@lib/request'
import { AxiosHeaders, AxiosInstance } from 'axios'

import { AuthUserSnapshot } from '~/api/user'

import { LoginEmailDto, RegisterByAdminDto, RegisterDto, SignUpCompleteDto } from '../types'

export class ClientAuthApi {
  private readonly client: AxiosInstance

  constructor(origin?: string, options?: { headers?: Record<string, string> }) {
    const config = origin ? { baseURL: origin, ...(options?.headers && { headers: options.headers }) } : undefined
    this.client = new Request(config).apiClient
  }

  async verifyToken(headers: AxiosHeaders, accessToken: string): Promise<{ user: AuthUserSnapshot }> {
    const response = await this.client.post('/api/v1/auth/verify-token', { accessToken }, { headers: headers as Record<string, string> })

    return response.data
  }

  async registerByAdmin(body: RegisterByAdminDto): Promise<{ success: true; message: string; user: AuthUserSnapshot }> {
    const response = await this.client.post('/api/v1/auth/register-by-admin', body)

    return response.data
  }

  async login(
    body: LoginEmailDto,
  ): Promise<{ success: true; user: AuthUserSnapshot } | { success: true; requiresMfa: true; mfaType: string; challengeId: string }> {
    const response = await this.client.post('/api/v1/auth/login', body)

    return response.data
  }

  async loginMfa(body: { challengeId: string; code: string }): Promise<{
    success: boolean
    user: AuthUserSnapshot
    mfa?: { usedBackupCode: boolean }
  }> {
    const response = await this.client.post('/api/v1/auth/login/mfa', body)

    return response.data
  }

  async mfaStatus(): Promise<{ mfaEnabled: boolean }> {
    const response = await this.client.get('/api/v1/auth/mfa/status')

    return response.data
  }

  async mfaSetup(): Promise<{
    otpauthUrl: string
    secret: string
    backupCodes: string[]
  }> {
    const response = await this.client.post('/api/v1/auth/mfa/setup')

    return response.data
  }

  async mfaConfirm(body: { code: string }): Promise<{ success: boolean }> {
    const response = await this.client.post('/api/v1/auth/mfa/confirm', body)

    return response.data
  }

  async mfaDisable(body: { password: string; code?: string }): Promise<{ success: boolean }> {
    const response = await this.client.post('/api/v1/auth/mfa/disable', body)

    return response.data
  }

  async refreshToken(): Promise<{ success: string }> {
    const response = await this.client.post('/api/v1/auth/refresh')

    return response.data
  }

  async logout(): Promise<void> {
    const response = await this.client.post('/api/v1/auth/logout')

    return response.data
  }

  async profile(): Promise<AuthUserSnapshot> {
    const response = await this.client.get('/api/v1/auth/profile')

    return response.data
  }

  async signUpRequest(
    body: RegisterDto,
    headers?: AxiosHeaders,
  ): Promise<
    | {
        success: true
        nextStep: 'verify'
        message: string
        devCode?: string
      }
    | {
        success: true
        nextStep: 'logged_in'
        message: string
        user: AuthUserSnapshot
      }
  > {
    const response = await this.client.post('/api/v1/auth/sign-up/request', body, { headers })

    return response.data
  }

  async signUpComplete(
    body: SignUpCompleteDto,
    headers?: AxiosHeaders,
  ): Promise<{
    success: boolean
    message: string
    user: AuthUserSnapshot
  }> {
    const response = await this.client.post('/api/v1/auth/sign-up/complete', body, { headers })

    return response.data
  }
}
