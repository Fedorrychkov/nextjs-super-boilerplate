import { useMutation } from 'react-query'

import { ClientAuthApi } from '~/api/auth'
import { RegisterByAdminDto } from '~/api/auth/types'

export const useRegisterByAdminMutation = () => {
  const registerByAdminMutation = useMutation(async (dto: RegisterByAdminDto) => {
    const api = new ClientAuthApi()

    const response = await api.registerByAdmin(dto)

    return response
  })

  return { registerByAdminMutation }
}
