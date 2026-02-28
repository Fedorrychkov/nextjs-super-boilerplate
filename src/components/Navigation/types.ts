import { JSX } from 'react'

export type NavItem = {
  title: string
  url: string
  icon: JSX.Element
  disabled?: boolean
}
