/**
 * Basic tests for logger utility
 */

import { logger, LogLevel } from '../logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should log info messages with structured format', () => {
    logger.info('Test message', { eventId: 'evt_123', eventType: 'payment.captured' });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    
    expect(logOutput.level).toBe(LogLevel.INFO);
    expect(logOutput.message).toBe('Test message');
    expect(logOutput.eventId).toBe('evt_123');
    expect(logOutput.eventType).toBe('payment.captured');
    expect(logOutput.timestamp).toBeDefined();
  });

  it('should log security warnings', () => {
    logger.security('Signature verification failed', { signatureProvided: false });

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const logOutput = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
    
    expect(logOutput.level).toBe(LogLevel.SECURITY);
    expect(logOutput.message).toBe('Signature verification failed');
  });

  it('should log errors with full details', () => {
    const error = new Error('Database connection failed');
    logger.error('Processing failed', { 
      eventId: 'evt_456',
      error: error.message,
      stack: error.stack 
    });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    
    expect(logOutput.level).toBe(LogLevel.ERROR);
    expect(logOutput.message).toBe('Processing failed');
    expect(logOutput.eventId).toBe('evt_456');
    expect(logOutput.error).toBe('Database connection failed');
  });
});
