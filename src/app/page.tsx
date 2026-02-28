import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image className="dark:invert" src="/next.svg" alt="Next.js logo" width={100} height={20} priority />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">Minimal Production Ready Next.js Boilerplate</h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{' '}
            <a
              href="https://github.com/Fedorrychkov/nextjs-super-boilerplate"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              GitHub Repository
            </a>{' '}
            or the{' '}
            <a
              href="https://github.com/Fedorrychkov/nextjs-super-boilerplate/blob/main/article/article_en.md"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              About boilerplate
            </a>{' '}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[320px]"
            href="/ui-kit"
            rel="noopener noreferrer"
          >
            <Image className="dark:invert" src="/vercel.svg" alt="Vercel logomark" width={16} height={16} />
            Open UI Kit
          </Link>
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-foreground transition-colors hover:scale-105 hover:text-foreground/90 md:w-[320px]"
            href="/profile"
            rel="noopener noreferrer"
          >
            Try auth
          </Link>
        </div>
      </main>
    </div>
  )
}
