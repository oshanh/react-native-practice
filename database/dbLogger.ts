import { useEffect, useState } from 'react';

export interface DBLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: string;
}

class DBLogger {
  private logs: DBLog[] = [];
  private listeners: Array<(logs: DBLog[]) => void> = [];
  private readonly maxLogs = 500;

  // Intercept console methods
  private readonly originalConsoleLog = console.log;
  private readonly originalConsoleWarn = console.warn;
  private readonly originalConsoleError = console.error;

  constructor() {
    this.interceptConsoleLogs();
  }

  private interceptConsoleLogs() {
    console.log = (...args: any[]) => {
      this.originalConsoleLog(...args);
      const message = args[0];
      if (typeof message === 'string' && message.includes('[DB]')) {
        this.addLog('info', this.formatMessage(args));
      }
    };

    console.warn = (...args: any[]) => {
      this.originalConsoleWarn(...args);
      const message = args[0];
      if (typeof message === 'string' && message.includes('[DB]')) {
        this.addLog('warn', this.formatMessage(args));
      }
    };

    console.error = (...args: any[]) => {
      this.originalConsoleError(...args);
      const message = args[0];
      if (typeof message === 'string' && (message.includes('[DB]') || message.includes('database') || message.includes('Database'))) {
        this.addLog('error', this.formatMessage(args));
      }
    };
  }

  private formatMessage(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  private addLog(level: DBLog['level'], message: string, details?: string) {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });

    const log: DBLog = { timestamp, level, message, details };
    
    this.logs.push(log);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.notifyListeners();
  }

  public log(level: DBLog['level'], message: string, details?: string) {
    this.addLog(level, message, details);
  }

  public getLogs(): DBLog[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  public subscribe(listener: (logs: DBLog[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener([...this.logs]);
    }
  }
}

// Singleton instance
const dbLogger = new DBLogger();

// React hook to use the logger
export function useDBLogs() {
  const [logs, setLogs] = useState<DBLog[]>(dbLogger.getLogs());

  useEffect(() => {
    const unsubscribe = dbLogger.subscribe(setLogs);
    return unsubscribe;
  }, []);

  return {
    logs,
    clearLogs: () => dbLogger.clearLogs(),
    addLog: (level: DBLog['level'], message: string, details?: string) => 
      dbLogger.log(level, message, details),
  };
}

export { dbLogger };
