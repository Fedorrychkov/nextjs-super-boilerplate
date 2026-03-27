'use client'

import { PencilIcon } from 'lucide-react'

import { UserModel, UserRole, UserStatus } from '~/api/user'
import { CopyContainer } from '~/components/Blocks/CopyContainer'
import { CustomTable, TableDefaultSkeleton } from '~/components/Blocks/Table'
import { CustomTooltip } from '~/components/Blocks/Tooltip'
import { Badge, Button, TableCell, TableRow, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { cn } from '~/utils/cn'
import { time } from '~/utils/time'

import { USERS_PARAM_NAMES } from '../paramNames'
import { columns } from './constants'

type Props = {
  isLoading?: boolean
  data?: UserModel[]
  onSelect?: (user: UserModel) => void
}

export const UserListTable = ({ isLoading, data, onSelect }: Props) => {
  const t = useT()

  return (
    <CustomTable
      Row={({ item, columnKeys }) => {
        return (
          <TableRow key={item.id}>
            {columnKeys?.includes('id') && (
              <TableCell className="font-medium">
                <div className="flex flex-col gap-3 items-start justify-start">
                  <div className="flex flex-row gap-2 items-center justify-start">
                    <CopyContainer content={item.id}>
                      <Typography variant="Body/XS/Semibold" className="max-w-[40px] truncate">
                        {item.id}
                      </Typography>
                    </CopyContainer>
                  </div>
                  <div className="flex flex-row gap-2 items-center justify-start">
                    {onSelect && (
                      <Button variant="outline" size="icon" onClick={() => onSelect(item)}>
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                    )}
                    <CustomTooltip
                      content={
                        <div>
                          <CopyContainer content={item.id}>
                            <Typography variant="Body/L/Semibold">{item.id}</Typography>
                          </CopyContainer>
                          <Typography variant="Body/XS/Regular">{item.email}</Typography>
                        </div>
                      }
                      enableInfoIcon
                    >
                      <CopyContainer content={item.email}>
                        <Typography variant="Body/XS/Semibold" className="max-w-[120px] truncate">
                          {item.email}
                        </Typography>
                      </CopyContainer>
                    </CustomTooltip>
                  </div>
                </div>
              </TableCell>
            )}
            {columnKeys?.includes('role') && (
              <TableCell className="whitespace-nowrap">
                <div className="flex flex-col gap-2 items-start justify-start">
                  <Badge
                    className={cn(
                      'whitespace-nowrap',
                      item.role === UserRole.ADMIN && 'bg-yellow-500 text-white',
                      item.role === UserRole.USER && 'bg-green-500 text-white',
                      item.role === UserRole.EDITOR && 'bg-red-500 text-white',
                    )}
                  >
                    {item.role ? t(`user.roles.${item.role}`) : '-'}
                  </Badge>
                </div>
              </TableCell>
            )}
            {columnKeys?.includes('status') && (
              <TableCell className="whitespace-nowrap">
                <div className="flex flex-col gap-2 items-start justify-start">
                  <Badge
                    className={cn(
                      'whitespace-nowrap',
                      item.status === UserStatus.ACTIVE && 'bg-green-500 text-white',
                      item.status === UserStatus.BLOCKED && 'bg-red-500 text-white',
                    )}
                  >
                    {item.status ? t(`user.statuses.${item.status}`) : '-'}
                  </Badge>
                </div>
              </TableCell>
            )}
            {columnKeys?.includes('time') && (
              <TableCell className="whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-col gap-1">
                    {[
                      { key: 'createdAt', label: t('common.createdAt'), value: item.createdAt },
                      { key: 'updatedAt', label: t('common.updatedAt'), value: item.updatedAt },
                    ].map((value, index) => (
                      <div key={index} className="flex flex-col gap-1">
                        <Typography variant="Body/XS/Semibold">{t(`user.fields.${value.key as keyof typeof USERS_PARAM_NAMES}`) ?? value.label}</Typography>
                        <Typography variant="Body/XS/Regular">{value.value ? time(value.value).format('DD/MM/YYYY HH:mm') : '-'}</Typography>
                      </div>
                    ))}
                  </div>
                </div>
              </TableCell>
            )}
          </TableRow>
        )
      }}
      Skeleton={TableDefaultSkeleton}
      columns={columns}
      isLoading={isLoading}
      data={data}
    />
  )
}
