import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LogsService } from '../../logs/logs.service';
import { Request } from 'express';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private logsService: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, params, query } = request;
    const user = (request as any).user;

    const action = `${method} ${url}`;
    const userId = user?.userId || user?.id || null;

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Log successful operations
          this.logsService.create({
            level: 'info',
            action: action,
            message: `Operation successful: ${method} ${url}`,
            details: JSON.stringify({
              params,
              query,
              body: method === 'POST' || method === 'PATCH' ? body : undefined,
            }),
            userId: userId?.toString(),
            ipAddress: request.ip || request.headers['x-forwarded-for'] as string,
            userAgent: request.headers['user-agent'],
          }).catch(() => {
            // Silently fail if logging fails
          });
        },
        error: (error) => {
          // Log errors
          this.logsService.create({
            level: 'error',
            action: action,
            message: `Operation failed: ${error.message}`,
            details: JSON.stringify({
              error: error.message,
              stack: error.stack,
              params,
              query,
            }),
            userId: userId?.toString(),
            ipAddress: request.ip || request.headers['x-forwarded-for'] as string,
            userAgent: request.headers['user-agent'],
          }).catch(() => {
            // Silently fail if logging fails
          });
        },
      }),
    );
  }
}

