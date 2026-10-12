import { ArgumentsHost, HttpServer, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { MalformedInputFilter } from './malformed-input.filter';

const queryFailed = (code: string, message: string) =>
  new QueryFailedError(
    'SELECT 1',
    [],
    Object.assign(new Error(message), { code }),
  );

/** Runs the filter on `err` and returns the status and body it replied with. */
function reply(err: QueryFailedError) {
  const adapter = { isHeadersSent: () => false, reply: jest.fn() };
  const host = {
    getArgByIndex: () => ({}),
    switchToHttp: () => ({ getResponse: () => ({}) }),
  } as unknown as ArgumentsHost;
  new MalformedInputFilter(adapter as unknown as HttpServer).catch(err, host);
  const [, body, status] = adapter.reply.mock.calls[0] as [
    unknown,
    { message: string },
    number,
  ];
  return { status, body };
}

describe('MalformedInputFilter', () => {
  beforeAll(() => jest.spyOn(Logger.prototype, 'error').mockImplementation());
  afterAll(() => jest.restoreAllMocks());

  it.each([
    ['22P02', 'invalid input syntax for type uuid: "x"'],
    ['22007', 'invalid input syntax for type date: "x"'],
    ['22008', 'date/time field value out of range: "2026-02-30"'],
  ])(
    'answers 400 with the reason when Postgres cannot read a value (%s)',
    (code, message) => {
      expect(reply(queryFailed(code, message))).toEqual({
        status: 400,
        body: expect.objectContaining({ message }) as unknown,
      });
    },
  );

  it('leaves any other database error a 500', () => {
    expect(reply(queryFailed('22012', 'division by zero'))).toEqual({
      status: 500,
      body: { statusCode: 500, message: 'Internal server error' },
    });
  });
});
