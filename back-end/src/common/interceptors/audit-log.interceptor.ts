import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
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
      'anonymous';

    const sanitizedBody = this.sanitizePayload(request.body);

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Simple console logging instead of database logging
          console.log(`✅ [AUDIT] ${method} ${url} - Success - User: ${username}`);
        },
        error: (error) => {
          // Simple console logging for errors
          console.log(`❌ [AUDIT] ${method} ${url} - Error: ${error?.message} - User: ${username}`);
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

