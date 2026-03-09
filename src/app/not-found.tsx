import { Typography } from '~/components/ui'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black flex-col gap-4">
      <Typography variant="Body/L/Regular">404 - Page Not Found</Typography>
      <Typography variant="Body/M/Semibold" asTag="a" href="/">
        Go to home
      </Typography>
    </div>
  )
}
