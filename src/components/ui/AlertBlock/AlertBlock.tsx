import { Bell, CircleAlert, CircleCheck, MessageSquareWarning, ShieldAlert, TriangleAlert } from 'lucide-react'

import { NotifyType } from '~/providers/notify/types'

import { Alert, AlertIcon, AlertTitle } from '../alert-1'

type Props = {
  notify: {
    id?: number
    type: NotifyType
    closable?: boolean
    message: React.ReactNode
  }
  onClose?: (id?: number) => void
}

export const AlertBlock = (props: Props) => {
  const { notify, onClose } = props

  return (
    <Alert onClose={() => onClose?.(notify.id)} appearance="light" variant={notify.type} close={notify.closable}>
      <AlertIcon>
        {!notify.type && <CircleAlert />}
        {notify.type === 'success' && <CircleCheck />}
        {notify.type === 'warning' && <ShieldAlert />}
        {notify.type === 'info' && <Bell />}
        {notify.type === 'secondary' && <CircleAlert />}
        {notify.type === 'primary' && <MessageSquareWarning />}
        {notify.type === 'destructive' && <TriangleAlert />}
        {notify.type === 'mono' && <CircleAlert />}
      </AlertIcon>
      <AlertTitle>{notify.message}</AlertTitle>
    </Alert>
  )
}
