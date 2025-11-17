import { MainLayout } from '@/layouts';

export default function Home() {
  return (
    <MainLayout>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 px-4">
        <div className="max-w-2xl text-center">
          <h1 className="mb-4 text-5xl font-bold text-neutral-900">
            Universal IDE Prompt Generator
          </h1>
          <p className="mb-8 text-xl text-neutral-600">
            Generate optimized prompts for Universal IDE integration with
            AI-powered assistance
          </p>

          <div className="mb-12 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">
              Welcome to Your Development Environment
            </h2>
            <p className="mb-6 text-neutral-600">
              This is a production-ready Next.js application with:
            </p>
            <ul className="grid grid-cols-1 gap-3 text-left md:grid-cols-2">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Next.js 14+ with TypeScript</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>TailwindCSS + ShadCN UI</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Supabase Integration</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>ESLint + Prettier</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>API Utilities</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Docker Support</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <a
              href="https://nextjs.org/docs"
              className="rounded-lg bg-neutral-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-neutral-800"
            >
              Next.js Docs
            </a>
            <a
              href="https://supabase.com/docs"
              className="rounded-lg border border-neutral-300 bg-white px-6 py-3 font-semibold text-neutral-900 transition-colors hover:bg-neutral-50"
            >
              Supabase Docs
            </a>
          </div>

          <div className="mt-12 pt-8">
            <p className="text-sm text-neutral-500">
              Check the README.md for setup instructions and available scripts.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
