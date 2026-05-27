"use client";

import { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import Header from "./components/Header";
import RoomCard from "./components/RoomCard";
import OccupancyChart from "./components/OccupancyChart";
import EventTable from "./components/EventTable";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const fetchInitialData = useCallback(async () => {
    try {
      const roomsRes = await fetch(`${BACKEND_URL}/api/rooms`);
      const roomsData = await roomsRes.json();
      if (roomsData.success) {
        setRooms(roomsData.data);
        if (roomsData.data.length > 0 && !selectedRoom) {
          setSelectedRoom(roomsData.data[0].room);
        }
      }
    } catch (error) {
      console.error("[Dashboard] Erro ao buscar dados iniciais:", error);
    }
  }, [selectedRoom]);

  const fetchRoomEvents = useCallback(async (roomId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/events?limit=30`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.data.events);
      }
    } catch (error) {
      console.error("[Dashboard] Erro ao buscar eventos:", error);
    }
  }, []);

  const fetchHistory = useCallback(async (roomId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/history?limit=50`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.data.history);
      }
    } catch (error) {
      console.error("[Dashboard] Erro ao buscar histórico:", error);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();

    const socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.log("[WS] Conectado ao backend");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[WS] Desconectado do backend");
      setConnected(false);
    });

    socket.on("initial-state", (data) => {
      console.log("[WS] Estado inicial recebido:", data);
      if (data && data.length > 0) {
        setRooms(data);
        if (!selectedRoom) {
          setSelectedRoom(data[0].room);
        }
      }
    });

    socket.on("occupancy-update", (data) => {
      console.log("[WS] Atualização recebida:", data);

      setRooms((prevRooms) => {
        const existingIndex = prevRooms.findIndex((r) => r.room === data.room);
        const updatedRoom = {
          room: data.room,
          people_count: data.people_count,
          light: data.light,
          last_event: data.event,
          last_timestamp: data.timestamp,
        };

        if (existingIndex >= 0) {
          const newRooms = [...prevRooms];
          newRooms[existingIndex] = updatedRoom;
          return newRooms;
        } else {
          return [...prevRooms, updatedRoom];
        }
      });

      setEvents((prevEvents) => {
        const newEvent = {
          id: data.id || Date.now(),
          room: data.room,
          event: data.event,
          people_count: data.people_count,
          light: data.light,
          timestamp: data.timestamp,
        };
        return [newEvent, ...prevEvents].slice(0, 30);
      });

      setHistory((prevHistory) => {
        const newPoint = {
          people_count: data.people_count,
          timestamp: data.timestamp,
        };
        return [...prevHistory, newPoint].slice(-50);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedRoom) {
      fetchRoomEvents(selectedRoom);
      fetchHistory(selectedRoom);
    }
  }, [selectedRoom, fetchRoomEvents, fetchHistory]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header connected={connected} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Salas</p>
            <p className="text-2xl font-bold text-primary">{rooms.length}</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: "100ms" }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Pessoas</p>
            <p className="text-2xl font-bold text-accent">
              {rooms.reduce((sum, r) => sum + (r.people_count || 0), 0)}
            </p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: "200ms" }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Salas Ocupadas</p>
            <p className="text-2xl font-bold text-success">
              {rooms.filter((r) => r.people_count > 0).length}
            </p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: "300ms" }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Luzes Ligadas</p>
            <p className="text-2xl font-bold text-warning">
              {rooms.filter((r) => r.light === "ON").length}
            </p>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            Salas Monitoradas
          </h2>
          {rooms.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center animate-fade-in">
              <div className="animate-pulse-soft">
                <p className="text-4xl mb-4">📡</p>
                <p className="text-muted-foreground font-medium">Aguardando dados do sensor...</p>
                <p className="text-xs text-muted-foreground/60 mt-2">
                  Certifique-se de que o ESP32 e o broker MQTT estão ativos
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div
                  key={room.room}
                  onClick={() => setSelectedRoom(room.room)}
                  className={`cursor-pointer transition-all duration-300 rounded-2xl
                    ${selectedRoom === room.room ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:scale-[1.02]"}`}
                >
                  <RoomCard room={room} />
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OccupancyChart history={history} />
          <EventTable events={events} />
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-card-border">
        IoT Occupancy Dashboard • ESP32 + MQTT + Node.js + Next.js
      </footer>
    </div>
  );
}
