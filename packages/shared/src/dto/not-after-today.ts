import {
  buildMessage,
  ValidateBy,
  type ValidationOptions,
} from 'class-validator';
import { clinicDate } from '../config/clinic-time';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/**
 * A date (YYYY-MM-DD, or an ISO date-time read by its date) no later than
 * today on the clinic's calendar, e.g. a birth date. Whether it is a date at
 * all is left to `@IsDateString()`.
 */
export function IsNotAfterToday(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isNotAfterToday',
      validator: {
        validate: (value: unknown) =>
          typeof value !== 'string' ||
          !ISO_DATE.test(value) ||
          value.slice(0, 10) <= clinicDate(),
        defaultMessage: buildMessage(
          (each) => `${each}$property can't be after today`,
          options,
        ),
      },
    },
    options,
  );
}
