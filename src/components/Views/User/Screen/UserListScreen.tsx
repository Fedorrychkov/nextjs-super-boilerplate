'use client'

import { AxiosError } from 'axios'
import { FilterIcon, PlusIcon, XIcon } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'

import { RegisterByAdminDto } from '~/api/auth/types'
import { UpdateUserDto, UserModel } from '~/api/user'
import { TableDefaultSkeleton } from '~/components/Blocks/Table'
import { TitleWithBadge } from '~/components/Blocks/TitleWithBadge'
import { CustomTooltip } from '~/components/Blocks/Tooltip'
import { StickyContainer } from '~/components/Containers'
import { useDefaultFilters } from '~/components/Filters/useDefaultFilters'
import { PaginationSkeleton } from '~/components/List'
import { usePagination } from '~/components/List/usePagination'
import { Badge, Button, Typography } from '~/components/ui'
import { useStickyContainer } from '~/hooks/useStickyContainer'
import { useSwitch } from '~/hooks/useSwitch'
import { useAuth, useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useRegisterByAdminMutation } from '~/query/auth'
import { useUpdateByAdminMutation } from '~/query/user'
import { useUsersListQuery } from '~/query/user/query/useUserListQuery'
import { Logger } from '~/utils/logger'

import { DefaultUsersFilters, UsersFilter } from '../Filters'
import { columns } from '../List/constants'
import { RegisterByAdminUserDialog, UpdateByAdminUserDialog } from '../Modal'
import { USERS_PARAM_NAMES } from '../paramNames'

const PaginationLazy = lazy(() => import('~/components/List').then((mod) => ({ default: mod.Pagination })))
const UserListTableLazy = lazy(() => import('../List/UserListTable').then((mod) => ({ default: mod.UserListTable })))

const logger = new Logger(['UserListScreen', '[src/components/Views/User/Screen/UserListScreen.tsx]'])

export const UserListScreen = () => {
  const [isOpened, { toggle }] = useSwitch(false)
  const [isUpdateOpened, { toggle: toggleUpdate }] = useSwitch(false)
  const [selectedUser, setSelectedUser] = useState<UserModel | null>(null)

  const { notify } = useNotify()
  const { authUser } = useAuth()
  const t = useT()
  const headerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const paginationRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

  useStickyContainer({
    isEnabled: true,
    elementRef: headerRef,
    rootRef: containerRef,
  })
  useStickyContainer({
    isEnabled: true,
    elementRef: paginationRef,
    rootRef: containerRef,
    direction: 'bottom',
  })

  const {
    isFilterOpen,
    toggleFilter,
    handleClearFilters,
    filters,
    debouncedFilters,
    setFilters,
    handleChangePeriod,
    period,
    isPeriodEnabled,
    settledFiltersCount,
  } = useDefaultFilters<Record<string, unknown>>({
    ref: filtersRef,
    defaultFilterValues: { status: null, role: null, sortBy: null, sortOrder: null },
    filterValues: DefaultUsersFilters,
  })

  const { page, setPage, offset } = usePagination({ limit: 25 })

  const { data, isLoading, refetch } = useUsersListQuery(
    { limit: 25, offset, startOfDateIso: period?.fromDate, endOfDateIso: period?.toDate, ...debouncedFilters },
    isPeriodEnabled,
  )

  const { registerByAdminMutation } = useRegisterByAdminMutation()
  const { updateByAdminMutation } = useUpdateByAdminMutation()

  const handleAddUser = async (dto: RegisterByAdminDto) => {
    try {
      const result = await registerByAdminMutation.mutateAsync(dto)

      if (result?.success) {
        refetch()

        notify(t('user.messages.userRegisteredSuccessfully'), 'success')
      }

      return {
        user: result?.user,
      }
    } catch (error) {
      logger.error(error)

      notify(t('user.errors.failedToCreateUser'), 'warning')
    }
  }

  const handleSelectUser = (user: UserModel) => {
    setSelectedUser(user)
    toggleUpdate()
  }

  const handleUpdateUser = async (dto: Partial<UpdateUserDto>) => {
    try {
      await updateByAdminMutation.mutateAsync(dto)

      notify(t('user.messages.userUpdateDialog.userUpdatedSuccessfully'), 'success')

      setSelectedUser(null)

      refetch()

      return { success: true, message: t('user.messages.userUpdateDialog.userUpdatedSuccessfully') }
    } catch (error) {
      logger.error(error)

      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('user.errors.failedToUpdateUser'), 'warning')
      } else {
        notify(t('user.errors.failedToUpdateUser'), 'warning')
      }
    }
  }

  return (
    <div className="flex flex-col gap-4" ref={containerRef}>
      <div className="flex flex-col gap-4">
        <StickyContainer ref={headerRef} className="flex flex-row gap-4 items-center justify-between md:px-8 md:py-4 py-2 px-1">
          <TitleWithBadge title={t('navigation.users')} badgeContent={<Typography variant="Body/XS/Regular">{data?.count ?? 0}</Typography>} />
          <div className="flex md:flex-row flex-col items-end md:items-center gap-2">
            <div className="flex flex-row gap-2">
              <RegisterByAdminUserDialog isOpen={isOpened} toggle={toggle} onSubmit={handleAddUser} isLoading={isLoading}>
                <CustomTooltip content={<Typography variant="Body/XS/Regular">{t('article.ui.createNewArticle')}</Typography>}>
                  <Button variant="outline" size="sm-md" className="flex items-center gap-2" onClick={toggle}>
                    <div className="relative flex items-center gap-2">
                      <PlusIcon className="md:w-4 md:h-4 w-2 h-2 shrink-0 text-neutral-600 bg-neutral-600/10 rounded-full" />
                      <Typography variant="Body/XS/Semibold">{t('common.addNew')}</Typography>
                    </div>
                  </Button>
                </CustomTooltip>
              </RegisterByAdminUserDialog>
              <CustomTooltip content={<Typography variant="Body/XS/Regular">{isFilterOpen ? 'Hide filters' : 'Show filters'}</Typography>}>
                <Button variant={isFilterOpen ? 'default' : 'outline'} size="sm-md" className="flex items-center gap-2" onClick={toggleFilter}>
                  <div className="relative">
                    <FilterIcon className="md:w-4 md:h-4 w-2 h-2" />
                    <Badge variant="default" className="absolute -top-4 -right-4">
                      {settledFiltersCount}
                    </Badge>
                  </div>
                </Button>
              </CustomTooltip>
              <CustomTooltip content={<Typography variant="Body/XS/Regular">{t('common.clearFilters')}</Typography>}>
                {settledFiltersCount > 0 && (
                  <Button variant="outline" size="sm-md" className="flex items-center gap-2" onClick={handleClearFilters}>
                    <XIcon className="md:w-4 md:h-4 w-2 h-2" />
                  </Button>
                )}
              </CustomTooltip>
            </div>
          </div>
        </StickyContainer>
      </div>
      <UsersFilter
        ref={filtersRef}
        isFilterOpen={isFilterOpen}
        isLoading={isLoading}
        filters={filters}
        defaultFilterValues={DefaultUsersFilters}
        paramNames={USERS_PARAM_NAMES}
        setFilters={setFilters}
        t={t}
        handleChangePeriod={handleChangePeriod}
      />
      {isLoading ? (
        <TableDefaultSkeleton size={columns.length} />
      ) : (
        <Suspense fallback={<TableDefaultSkeleton size={columns.length} />}>
          <UserListTableLazy data={data?.list} isLoading={isLoading} onSelect={handleSelectUser} />
        </Suspense>
      )}
      {isLoading ? (
        <PaginationSkeleton />
      ) : (
        <Suspense fallback={<PaginationSkeleton />}>
          <StickyContainer direction="top" ref={paginationRef} className="flex flex-row gap-4 items-center justify-between md:px-8 md:py-4 py-2 px-1">
            <PaginationLazy currentPage={page} pages={data?.pages ?? 0} onChange={setPage} />
          </StickyContainer>
        </Suspense>
      )}

      {selectedUser && isUpdateOpened && (
        <UpdateByAdminUserDialog
          user={selectedUser}
          disabled={selectedUser.id === authUser?.id}
          isOpen={isUpdateOpened}
          toggle={toggleUpdate}
          onSubmit={handleUpdateUser}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
