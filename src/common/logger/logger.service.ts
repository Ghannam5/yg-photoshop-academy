import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: any, context?: string) {
    console.log(`[${context || 'App'}] ${message}`);
  }
  error(message: any, trace?: string, context?: string) {
    console.error(`[${context || 'App'}] ${message}`, trace);
  }
  warn(message: any, context?: string) {
    console.warn(`[${context || 'App'}] ${message}`);
  }
  debug(message: any, context?: string) {
    console.debug(`[${context || 'App'}] ${message}`);
  }
  verbose(message: any, context?: string) {
    console.log(`[VERBOSE][${context || 'App'}] ${message}`);
  }
}
