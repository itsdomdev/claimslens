import type { ReactNode } from 'react'

interface LayoutProps {
  topBar: ReactNode
  input: ReactNode
  progress: ReactNode
  mainContent: ReactNode
  sidebar: ReactNode
  dashboard: ReactNode
}

export default function Layout({ topBar, input, progress, mainContent, sidebar, dashboard }: LayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-gray-950 text-gray-100">
      {/* Top bar */}
      <header className="border-b border-gray-800 px-4 py-3 md:px-6">
        {topBar}
      </header>

      {/* Input area */}
      <section className="border-b border-gray-800 px-4 py-4 md:px-6">
        {input}
      </section>

      {/* Progress */}
      <div className="px-4 md:px-6">
        {progress}
      </div>

      {/* Main content: text overlay + sidebar */}
      <main className="flex flex-1 flex-col md:flex-row">
        <div className="flex-1 overflow-auto border-r border-gray-800 p-4 md:p-6">
          {mainContent}
        </div>
        <aside className="w-full border-t border-gray-800 md:w-[35%] md:border-t-0 md:max-w-md overflow-auto">
          {sidebar}
        </aside>
      </main>

      {/* Dashboard */}
      <footer className="border-t border-gray-800 px-4 py-3 md:px-6">
        {dashboard}
      </footer>
    </div>
  )
}
