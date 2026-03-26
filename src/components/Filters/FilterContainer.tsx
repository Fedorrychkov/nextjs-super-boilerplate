import { Period, ReusablePeriodField } from '~/components/Filters'
import { Button, Input, Typography } from '~/components/ui'
import type { AppMessageKey, TFunction } from '~/lib/i18n'
import { FilterOption } from '~/types'
import { cn } from '~/utils/cn'

export type FilterContainerProps<T> = {
  className?: string
  isFilterOpen: boolean
  isLoading: boolean
  defaultFilterValues: Record<keyof T, FilterOption>
  filters: Record<keyof T, unknown>
  paramNames: Record<keyof T, string>
  defaultPeriod?: Period
  availablePeriods?: Period[]
  setFilters: React.Dispatch<React.SetStateAction<Record<keyof T, unknown>>>
  handleChangePeriod: (from?: string, to?: string) => void
  t: TFunction
}

export const FilterContainer = <T,>(props: FilterContainerProps<T>, ref: React.ForwardedRef<HTMLDivElement | null>) => {
  const {
    className,
    isFilterOpen,
    isLoading,
    filters,
    setFilters,
    handleChangePeriod,
    defaultFilterValues,
    paramNames,
    defaultPeriod = Period.perAllTime,
    availablePeriods,
    t,
  } = props

  const handleSetFilters =
    (key: keyof T, option?: { value: any; label: string } | null) => (e?: React.MouseEvent<HTMLButtonElement> | React.ChangeEvent<HTMLInputElement>) => {
      setFilters((filters) => {
        if (option) {
          const isSelected = filters[key as keyof T] === option?.value

          if (isSelected) {
            return { ...filters, [key as keyof T]: defaultFilterValues[key as keyof T].value }
          }

          const newFilters = { ...filters }
          newFilters[key as keyof T] = option.value

          return newFilters
        }

        if (e?.target && 'value' in e?.target && (e?.target?.value || e?.target?.value === '')) {
          const value = Number.isNaN(Number(e.target.value)) || e.target.value === '' ? null : Number(e.target.value)

          return { ...filters, [key as keyof T]: value }
        }

        return filters
      })
    }

  return (
    <div ref={ref} className={cn('flex flex-col rounded-md gap-4 bg-slate-100 p-2', className, isFilterOpen ? 'flex' : 'hidden')}>
      <Typography variant="Body/M/Semibold">{t('common.filters')}</Typography>
      <div className="flex flex-col gap-2">
        <Typography variant="Body/S/Regular">{t('common.byDate')}</Typography>
        <ReusablePeriodField
          defaultPeriod={defaultPeriod}
          isLoading={isLoading}
          onChangePeriod={handleChangePeriod}
          availablePeriods={availablePeriods}
          t={t}
        />
      </div>
      {Object.keys(defaultFilterValues).map((key) => (
        <div className="flex flex-col gap-2" key={key}>
          <Typography variant="Body/S/Regular">{paramNames[key as keyof T]}</Typography>

          <div className="flex flex-row gap-2 flex-wrap" key={key}>
            {defaultFilterValues[key as keyof T].options?.length ? (
              <>
                {defaultFilterValues[key as keyof T].options?.map((option) => (
                  <Button
                    variant={filters[key as keyof T] === option.value ? 'default' : 'outline'}
                    onClick={handleSetFilters(key as keyof T, option)}
                    key={[key, option.label].join('-')}
                  >
                    {option.labelLocalizationKey ? t(option.labelLocalizationKey as AppMessageKey) : option.label}
                  </Button>
                ))}
              </>
            ) : (
              <>
                {defaultFilterValues[key as keyof T].type === 'number' && (
                  <Input type="text" min={0} max={200} value={filters[key as keyof T]?.toString() ?? ''} onChange={handleSetFilters(key as keyof T, null)} />
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
