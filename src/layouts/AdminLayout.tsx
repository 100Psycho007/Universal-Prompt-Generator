import React from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-neutral-200 bg-neutral-50">
        <div className="p-4">
          <h2 className="text-lg font-bold text-neutral-900">Admin Panel</h2>
          <nav className="mt-4 space-y-2">
            <p className="text-sm text-neutral-500">
              Navigation coming soon...
            </p>
          </nav>
        </div>
      </aside>
      <main className="flex-1">
        <div className="border-b border-neutral-200 bg-white p-4">
          <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
