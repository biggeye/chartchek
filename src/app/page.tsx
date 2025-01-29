import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect('/chat')
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-20 items-center">
      <nav className="w-full flex justify-center border-b border-b-zinc-800 h-16">
        <div className="w-full max-w-4xl flex justify-between items-center p-3 text-sm">
          <div />
          <div>
            <Link
              href="/login"
              className="py-2 px-4 rounded-md no-underline bg-btn-background hover:bg-btn-background-hover"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      <div className="animate-in flex-1 flex flex-col gap-20 opacity-0 max-w-4xl px-3">
        <main className="flex-1 flex flex-col gap-6">
          <h1 className="text-6xl font-bold">Welcome to ChartChek AI</h1>
          <p className="text-2xl">
            Your intelligent assistant for analyzing medical charts and documentation.
          </p>
          <div className="flex flex-col gap-8 text-zinc-600 dark:text-zinc-400">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="flex gap-2 items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-500"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Advanced AI Analysis</span>
              </div>
              <div className="flex gap-2 items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-500"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                </svg>
                <span>Secure & Private</span>
              </div>
              <div className="flex gap-2 items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-500"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8.5a4 4 0 0 0-6.5 3.5c0 2 3 3 3 4.5h1" />
                  <line x1="12" y1="19" x2="12" y2="19.01" />
                </svg>
                <span>24/7 Assistant Support</span>
              </div>
              <div className="flex gap-2 items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-500"
                >
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
                <span>Improved Efficiency</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mt-8">
            <Link
              href="/login"
              className="flex-1 text-center py-3 px-6 rounded-md no-underline bg-green-500 hover:bg-green-600 text-white font-medium text-lg"
            >
              Get Started
            </Link>
            <a
              href="#learn-more"
              className="flex-1 text-center py-3 px-6 rounded-md border border-zinc-800 hover:bg-zinc-900 font-medium text-lg"
            >
              Learn More
            </a>
          </div>
        </main>
      </div>

      <footer className="w-full border-t border-t-zinc-800 p-8 flex justify-center text-center text-xs">
        <p>
          Powered by{' '}
          <a
            href="https://supabase.com"
            target="_blank"
            className="font-bold hover:underline"
            rel="noreferrer"
          >
            Supabase
          </a>
          {' + '}
          <a
            href="https://openai.com"
            target="_blank"
            className="font-bold hover:underline"
            rel="noreferrer"
          >
            OpenAI
          </a>
        </p>
      </footer>
    </div>
  )
}
