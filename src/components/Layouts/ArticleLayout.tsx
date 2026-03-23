export const ArticleLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6 tiptap [& img]:max-w-full [& img]:max-h-full">
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between bg-white px-16 py-32 dark:bg-black sm:items-start">
          {children}
        </main>
      </div>
    </div>
  )
}
