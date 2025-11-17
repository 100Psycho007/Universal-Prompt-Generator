import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
      <footer className="border-t border-neutral-200 bg-neutral-50 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-neutral-600">
          <p>
            &copy; 2024 Universal IDE Prompt Generator. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
