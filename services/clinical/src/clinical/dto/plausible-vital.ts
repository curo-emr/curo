import {
  buildMessage,
  ValidateBy,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

/**
 * The readings a vital sign can take, by LOINC code, in the unit it's stored
 * in. The same ranges as `plausible` in @curo/web/clinical's VITAL_FIELDS,
 * which the nurse form checks before saving: wide enough for any patient,
 * narrow enough to catch a typo or the wrong unit.
 */
const PLAUSIBLE_VITALS = new Map<unknown, readonly [number, number]>([
  ['8480-6', [50, 260]], // systolic blood pressure, mmHg
  ['8462-4', [20, 160]], // diastolic blood pressure, mmHg
  ['8867-4', [20, 250]], // heart rate, /min
  ['2708-6', [50, 100]], // oxygen saturation, %
  ['8310-5', [30, 45]], // body temperature, °C
  ['9279-1', [4, 60]], // respiratory rate, /min
  ['8302-2', [30, 250]], // body height, cm
  ['29463-7', [1, 350]], // body weight, kg
]);

/** The plausible range of the vital sign the validated object's `code` names. */
const rangeOf = (args?: ValidationArguments) =>
  PLAUSIBLE_VITALS.get((args?.object as { code?: unknown }).code);

/**
 * A reading within the plausible range of the vital sign the object's `code`
 * names. Other observations are taken as given.
 */
export function IsPlausibleVital(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isPlausibleVital',
      validator: {
        validate: (value: unknown, args) => {
          const range = rangeOf(args);
          return (
            !range ||
            (typeof value === 'number' &&
              value >= range[0] &&
              value <= range[1])
          );
        },
        defaultMessage: buildMessage((each, args) => {
          const [min, max] = rangeOf(args) ?? [];
          return `${each}$property must be between ${min} and ${max} for this vital sign`;
        }, options),
      },
    },
    options,
  );
}
