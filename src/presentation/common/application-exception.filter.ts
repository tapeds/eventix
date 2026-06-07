import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApplicationError } from '../../common/application/errors/application.error';

@Catch()
export class ApplicationExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    // Let Nest's own HTTP exceptions (e.g. BadRequestException) pass through.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json(exception.getResponse());
      return;
    }

    if (exception instanceof ApplicationError) {
      const status = ApplicationExceptionFilter.statusFor(exception.code);
      response
        .status(status)
        .json({ code: exception.code, message: exception.message });
      return;
    }

    // Domain invariants throw plain Error → treat as a bad request.
    if (exception instanceof Error) {
      response
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: exception.message });
      return;
    }

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Internal server error' });
  }

  private static statusFor(code: string): number {
    if (code.endsWith('_NOT_FOUND')) {
      return HttpStatus.NOT_FOUND;
    }
    if (code.endsWith('_ALREADY_EXISTS')) {
      return HttpStatus.CONFLICT;
    }
    return HttpStatus.BAD_REQUEST;
  }
}
