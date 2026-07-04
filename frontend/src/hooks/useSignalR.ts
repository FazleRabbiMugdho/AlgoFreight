import { useEffect, useRef, useCallback, useState } from 'react';
import {
  HubConnectionBuilder,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr';
import type { ConnectionState, SignalRDispatchPayload } from '../types';

const HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL ?? 'http://localhost:5228/hubs/dispatch';

type EventHandler = (...args: unknown[]) => void;

export function useSignalR() {
  const connectionRef = useRef<HubConnection | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const [connectionState, setConnectionState] = useState<ConnectionState>('Disconnected');
  const [lastDispatchEvent, setLastDispatchEvent] = useState<SignalRDispatchPayload | null>(null);

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.onclose(() => {
      setConnectionState('Disconnected');
    });

    connection.onreconnecting(() => {
      setConnectionState('Reconnecting');
    });

    connection.onreconnected(() => {
      setConnectionState('Connected');
    });

    const startConnection = async () => {
      try {
        setConnectionState('Connecting');
        await connection.start();
        setConnectionState('Connected');
      } catch {
        setConnectionState('Disconnected');
        setTimeout(startConnection, 5000);
      }
    };

    startConnection();

    return () => {
      connection.stop();
      connectionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection) return;

    const handler = (...args: unknown[]) => {
      const payload = args[0] as SignalRDispatchPayload;
      setLastDispatchEvent(payload);
      const handlers = handlersRef.current.get('DispatchCompleted');
      if (handlers) {
        handlers.forEach((h) => h(payload));
      }
    };

    connection.on('DispatchCompleted', handler);

    return () => {
      connection.off('DispatchCompleted', handler);
    };
  }, []);

  const subscribe = useCallback((event: string, handler: EventHandler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);

    return () => {
      handlersRef.current.get(event)?.delete(handler);
    };
  }, []);

  return {
    connectionState,
    lastDispatchEvent,
    subscribe,
    clearLastDispatchEvent: () => setLastDispatchEvent(null),
  };
}
