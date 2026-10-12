import { ArgumentsHost, BadRequestException, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

// Postgres's codes for a value it can't read as its column's type: text that
// isn't a uuid, an enum value or a number (22P02), and a date that is
// malformed (22007) or out of range (22008).
const MALFORMED_VALUE = new Set(['22P02', '22007', '22008']);

/**
 * Answers `400` when the database can't read a value the client sent, such as
 * an id that isn't a uuid, wherever it came from: path, query or body. Any
 * other error is handled as Nest handles it by default.
 */
@Catch(QueryFailedError)
export class MalformedInputFilter extends BaseExceptionFilter {
  catch(err: QueryFailedError, host: ArgumentsHost) {
    const { code } = err.driverError as { code?: string };
    super.catch(
      code && MALFORMED_VALUE.has(code)
        ? new BadRequestException(err.message)
        : err,
      host,
    );
  }
}
