/**
 * Structured logger utility for webhook processing
 * Provides consistent logging format with context
 */

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY',
}

interface LogContext {
  eventId?: string;
  eventType?: string;
  orderId?: string;
  orderNumber?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  timestamp?: string;
  error?: any;
  [key: string]: any;
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };
    return JSON.stringify(logEntry);
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatLog(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog(LogLevel.WARN, message, context));
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatLog(LogLevel.ERROR, message, context));
  }

  security(message: string, context?: LogContext): void {
    console.warn(this.formatLog(LogLevel.SECURITY, message, context));
  }
}

export const logger = new Logger();
