import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { MoonIcon, SunIcon } from 'lucide-react';
interface LayoutProps {
  children: React.ReactNode;
}
export const Layout: React.FC<LayoutProps> = ({
  children
}) => {
  const {
    theme,
    toggleTheme
  } = useTheme();
  return <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Worship Dashboard</h1>
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            {theme === 'light' ? <MoonIcon size={20} /> : <SunIcon size={20} />}
          </button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>;
};