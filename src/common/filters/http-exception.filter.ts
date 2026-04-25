import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// HTTP status -> 스펙 error code 매핑 (P07_API_Specification 공통 Error Code 표 기준)
const STATUS_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  500: 'INTERNAL_ERROR',
  501: 'NOT_IMPLEMENTED',
};

interface ErrorEnvelope {
  success: false;
  data: null;
  error: { code: string; message: string };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = STATUS_CODE_MAP[500];
    let message = '서버 내부 오류가 발생했습니다.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = STATUS_CODE_MAP[status] ?? `HTTP_${status}`;

      const resBody = exception.getResponse();
      if (typeof resBody === 'string') {
        message = resBody;
      } else if (resBody && typeof resBody === 'object') {
        const m = (resBody as Record<string, unknown>).message;
        if (Array.isArray(m)) {
          // class-validator 가 반환하는 string[] 케이스
          message = m.filter((v): v is string => typeof v === 'string').join(', ');
        } else if (typeof m === 'string') {
          message = m;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error on ${req.method} ${req.url}: ${exception.message}`, exception.stack);
    }

    const body: ErrorEnvelope = { success: false, data: null, error: { code, message } };
    res.status(status).json(body);
  }
}
