"use client";

/**
 * RoomCard - Card de informações da sala
 *
 * Exibe o contador de pessoas, estado da iluminação,
 * último evento e timestamp. Atualiza em tempo real.
 */

export default function RoomCard({ room }) {
  const {
    room: roomId,
    people_count = 0,
    light = "OFF",
    last_event,
    last_timestamp,
  } = room;

  const isLightOn = light === "ON";
  const isOccupied = people_count > 0;

  /**
   * Formata o timestamp para exibição legível
   */
  const formatTime = (timestamp) => {
    if (!timestamp) return "—";
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  /**
   * Traduz o tipo de evento
   */
  const getEventLabel = (event) => {
    switch (event) {
      case "entrada":
        return "Entrada";
      case "saida":
        return "Saída";
      default:
        return "—";
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in hover:shadow-xl transition-all duration-300 group">
      {/* Header do Card */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Ícone da Sala */}
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500
              ${
                isOccupied
                  ? "bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20"
                  : "bg-muted"
              }`}
          >
            <svg
              className={`w-6 h-6 ${
                isOccupied ? "text-white" : "text-muted-foreground"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold">Sala {roomId}</h2>
            <p className="text-xs text-muted-foreground">
              {isOccupied ? "Ocupada" : "Vazia"}
            </p>
          </div>
        </div>

        {/* Badge de Status */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300
            ${
              isOccupied
                ? "bg-success/15 text-success"
                : "bg-muted text-muted-foreground"
            }`}
        >
          {isOccupied ? "ATIVA" : "INATIVA"}
        </span>
      </div>

      {/* Contador Central */}
      <div className="text-center py-6 mb-6 rounded-xl bg-muted/50">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">
          Pessoas na sala
        </p>
        <span
          className={`text-6xl font-extrabold tracking-tight transition-all duration-500
            ${
              isOccupied
                ? "text-primary"
                : "text-muted-foreground"
            }`}
        >
          {people_count}
        </span>
      </div>

      {/* Informações */}
      <div className="space-y-3">
        {/* Status da Luz */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 ${
                isLightOn ? "text-warning" : "text-muted-foreground"
              }`}
              fill={isLightOn ? "currentColor" : "none"}
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
            <span className="text-sm font-medium">Iluminação</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`status-indicator ${
                isLightOn ? "status-on" : "status-off"
              }`}
            />
            <span
              className={`text-sm font-bold ${
                isLightOn ? "text-success" : "text-danger"
              }`}
            >
              {isLightOn ? "ON" : "OFF"}
            </span>
          </div>
        </div>

        {/* Último Evento */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span className="text-sm font-medium">Último evento</span>
          </div>
          <span
            className={`text-sm font-bold ${
              last_event === "entrada" ? "text-success" : "text-danger"
            }`}
          >
            {getEventLabel(last_event)}
          </span>
        </div>

        {/* Hora */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium">Horário</span>
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {formatTime(last_timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}
