import React from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ThemeProvider } from './context/ThemeContext';
export function App() {
  return <ThemeProvider>
      <Layout>
        <Dashboard />
      </Layout>
    </ThemeProvider>;
}