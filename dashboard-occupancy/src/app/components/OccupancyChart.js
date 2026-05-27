"use client";


import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

export default function OccupancyChart({ history = [] }) {
  const chartData = history.map((item) => {
    let timeLabel = "";
    try {
      const date = new Date(item.timestamp);
      timeLabel = date.toLocaleTimeString("pt-BR", {
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      timeLabel = item.timestamp || "";
    }
    return {
      time: timeLabel,
      pessoas: item.people_count,
      timestamp: item.timestamp,
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card rounded-lg p-3 shadow-lg border border-card-border">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-sm font-bold text-primary">
            {payload[0].value} pessoa(s)
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 animate-fade-in">
        <h3 className="text-lg font-bold mb-4">Ocupação ao Longo do Tempo</h3>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aguardando dados...</p>
          <p className="text-xs text-muted-foreground/60 mt-1">O gráfico será exibido após os primeiros eventos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      <h3 className="text-lg font-bold mb-6">Ocupação ao Longo do Tempo</h3>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" opacity={0.5} />
            <XAxis
              dataKey="time"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--card-border)" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--card-border)" }}
              label={{
                value: "Pessoas",
                angle: -90,
                position: "insideLeft",
                style: { fill: "var(--muted-foreground)", fontSize: 11 },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="pessoas"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#occupancyGradient)"
              dot={{ fill: "var(--primary)", strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: "var(--primary)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
