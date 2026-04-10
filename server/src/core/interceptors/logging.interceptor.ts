import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const startTime = performance.now();

    Logger.log(`---> ${req.method} to '${req.originalUrl}'`);

    return next.handle().pipe(
      tap({
        next: () => {
          const elapsedTime = performance.now() - startTime;
          Logger.log(`<--- ${req.method} to '${req.originalUrl}' - ${res.statusCode} after ${Math.ceil(elapsedTime)}ms`);
        },
        error: (err: any) => {
          const elapsedTime = performance.now() - startTime;
          const statusCode = err.status ?? res.statusCode;
          Logger.log(`<--- ${req.method} to '${req.originalUrl}' - ${statusCode} after ${Math.ceil(elapsedTime)}ms`);
        },
      }),
    );
  }
}
