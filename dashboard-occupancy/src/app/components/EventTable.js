"use client";

export default function EventTable({ events = [] }) {
  const formatDateTime = (timestamp) => {
    if (!timestamp) return "—";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
    } catch { return timestamp; }
  };

  if (events.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 animate-fade-in">
        <h3 className="text-lg font-bold mb-4">Eventos Recentes</h3>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum evento registrado ainda</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Os eventos aparecerão aqui em tempo real</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Eventos Recentes</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
          {events.length} evento(s)
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl max-h-[300px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Sala</th>
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Evento</th>
              <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pessoas</th>
              <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Luz</th>
              <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Horário</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => (
              <tr key={event.id || index} className="border-b border-card-border/50 hover:bg-muted/50 transition-colors duration-200">
                <td className="py-3 px-4"><span className="font-mono font-bold">{event.room}</span></td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${event.event === "entrada" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                    {event.event === "entrada" ? "↙ Entrada" : "↗ Saída"}
                  </span>
                </td>
                <td className="py-3 px-4 text-center"><span className="font-mono font-bold text-primary">{event.people_count}</span></td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`status-indicator ${event.light === "ON" ? "status-on" : "status-off"}`} style={{ width: "8px", height: "8px" }} />
                    <span className={`text-xs font-bold ${event.light === "ON" ? "text-success" : "text-danger"}`}>{event.light}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right"><span className="text-xs text-muted-foreground font-mono">{formatDateTime(event.timestamp)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
