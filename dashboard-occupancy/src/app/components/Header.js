"use client";

/**
 * Header - Cabeçalho do dashboard
 *
 * Exibe o título do sistema, indicador de conexão
 * WebSocket e toggle de tema dark/light.
 */

import ThemeToggle from "./ThemeToggle";

export default function Header({ connected }) {
  return (
    <header className="sticky top-0 z-50 glass-card border-b border-card-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo e Título */}
          <div className="flex items-center gap-3">
            {/* Ícone IoT */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                IoT Occupancy
              </h1>
              <p className="text-xs text-muted-foreground">
                Monitoramento em Tempo Real
              </p>
            </div>
          </div>

          {/* Status + Theme Toggle */}
          <div className="flex items-center gap-4">
            {/* Indicador de Conexão */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-card-border">
              <span
                className={`status-indicator ${
                  connected ? "status-on" : "status-off"
                }`}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {connected ? "Conectado" : "Desconectado"}
              </span>
            </div>

            {/* Toggle de Tema */}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
