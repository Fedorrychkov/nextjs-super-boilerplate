import { Typography } from '~/components/ui/Typography/Typography'

export default function TooManyRequests() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black flex-col gap-4">
      <Typography variant="Body/L/Regular">429 - Too Many Requests</Typography>
      <Typography variant="Body/M/Regular">Please try again later.</Typography>
      <Typography variant="Body/M/Semibold" asTag="a" href="/">
        Go to home
      </Typography>
    </div>
  )
}
