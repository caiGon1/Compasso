import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      try { if (localStorage.getItem('compasso-theme')) return; } catch {}
      const next = media.matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#101a17' : '#296653');
    try { localStorage.setItem('compasso-theme', next); } catch {}
    setTheme(next);
  }
  return <button type="button" className="theme-toggle" aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'} aria-pressed={theme === 'dark'} onClick={toggle}>{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>;
}
