'use client'

import { useMutation } from 'react-query'

import { ClientUserApi, UpdateUserDto } from '~/api/user'
import { useT } from '~/providers'

export const useUpdateByAdminMutation = () => {
  const t = useT()
  const updateByAdminMutation = useMutation(async (dto: UpdateUserDto) => {
    const api = new ClientUserApi()

    if (!dto.id) {
      throw new Error(t('user.errors.idRequired'))
    }

    const response = await api.updateUser(dto.id, dto)

    return response
  })

  return { updateByAdminMutation }
}
