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
    const response = context.switchToHttp().getResponse();
    const { method } = request;
    const url = request.originalUrl || request.url;
    const trackedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    const shouldTrack =
      trackedMethods.includes(method.toUpperCase()) ||
      (method.toUpperCase() === 'POST' && url.includes('/auth/login'));

    if (!shouldTrack) {
      return next.handle();
    }

    const username =
      (request.headers['x-username'] as string) ||
      (request as any)?.user?.username ||
      request.body?.username ||
      null;

    const sanitizedBody = this.sanitizePayload(request.body);
    const params = request.params;
    const query = request.query;

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.logsService
            .create({
              level: 'info',
              action: `${method} ${url}`,
              message: 'Operation completed',
              details: JSON.stringify({
                params,
                query,
              }),
              payload: sanitizedBody,
              userId: username || undefined,
              username: username || undefined,
              method,
              path: url,
              statusCode: response?.statusCode ?? 200,
              ipAddress: (request.ip || request.headers['x-forwarded-for']) as string,
              userAgent: request.headers['user-agent'],
            })
            .catch(() => {
              // ignore logging exceptions
            });
        },
        error: (error) => {
          this.logsService
            .create({
              level: 'error',
              action: `${method} ${url}`,
              message: error?.message || 'Operation failed',
              details: JSON.stringify({
                params,
                query,
                error: error?.message,
              }),
              payload: sanitizedBody,
              userId: username || undefined,
              username: username || undefined,
              method,
              path: url,
              statusCode: response?.statusCode ?? 500,
              ipAddress: (request.ip || request.headers['x-forwarded-for']) as string,
              userAgent: request.headers['user-agent'],
            })
            .catch(() => {
              // ignore logging exceptions
            });
        },
      }),
    );
  }

  private sanitizePayload(body: any) {
    if (!body || typeof body !== 'object') return undefined;
    const forbiddenKeys = ['password', 'confirmPassword', 'token', 'secret'];
    const clone: Record<string, any> = {};
    Object.keys(body).forEach((key) => {
      if (forbiddenKeys.includes(key.toLowerCase())) {
        clone[key] = '[REDACTED]';
      } else if (body[key] instanceof Buffer) {
        clone[key] = '[BINARY_DATA]';
      } else if (typeof body[key] === 'object') {
        clone[key] = this.sanitizePayload(body[key]);
      } else {
        clone[key] = body[key];
      }
    });
    return clone;
  }
}

