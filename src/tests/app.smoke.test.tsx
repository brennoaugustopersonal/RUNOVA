// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '../App';
import { BottomNav } from '../components/BottomNav';

const store: Record<string, string> = {};

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  },
});

describe('App (smoke)', () => {
  beforeEach(() => {
    localStorage.clear();
    // Todas as APIs externas são gratuitas e opcionais: o app precisa
    // renderizar mesmo quando elas falham (modo offline).
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza a tela inicial sem erros', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByRole('heading', { name: 'RUNOVA' })).toBeDefined();
    expect(screen.getByText('Desempenho Geral')).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeDefined();
  });

  it('mostra o estado vazio do histórico quando não há corridas', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('Nenhuma corrida registrada ainda')).toBeDefined();
  });

  it('expõe o botão de iniciar corrida e o de configurações', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByRole('button', { name: 'Iniciar nova corrida' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Abrir perfil e configurações' })).toBeDefined();
  });
});

describe('BottomNav', () => {
  // Regressão: os hooks ficavam depois de `if (isRunActive) return null`,
  // então iniciar uma corrida derrubava o React com
  // "Rendered fewer hooks than expected".
  it('alterna entre visível e oculto sem quebrar a ordem dos hooks', () => {
    const noop = () => {};
    const { rerender, container } = render(
      <BottomNav activeTab="home" setActiveTab={noop} onOpenSetup={noop} isRunActive={false} />
    );
    expect(container.querySelector('nav')).not.toBeNull();

    expect(() =>
      rerender(
        <BottomNav activeTab="home" setActiveTab={noop} onOpenSetup={noop} isRunActive />
      )
    ).not.toThrow();
    expect(container.querySelector('nav')).toBeNull();

    expect(() =>
      rerender(
        <BottomNav activeTab="stats" setActiveTab={noop} onOpenSetup={noop} isRunActive={false} />
      )
    ).not.toThrow();
    expect(container.querySelector('nav')).not.toBeNull();
  });
});
