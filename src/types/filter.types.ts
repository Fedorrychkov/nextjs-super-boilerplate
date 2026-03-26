import { Option } from '~/components/ui'

export type FilterOption = {
  value: any
  disabled?: boolean
  filterType?: 'default' | 'feed'
  options?: { value: any; label: string; labelLocalizationKey?: string }[] | null
  type?: 'number' | 'string' | 'boolean'
  selectedOptions?: Option[] | null
  maxSelected?: number | null
}
