import { AllergyIntoleranceCriticality } from '../enums';
import type { AllergyIntolerance } from '../entities/allergy-intolerance.entity';
import type {
  ReactionSeverity,
  UpdateAllergyDto,
} from './dto/create-allergy.dto';

const RETIRED = new Set(['inactive', 'resolved']);

/**
 * Whether the patient still has the allergy. A missing or unknown status counts
 * as current: hiding a real allergy is far worse than showing a stale one.
 */
export const isCurrentAllergy = (
  a: Pick<AllergyIntolerance, 'clinicalStatus'>,
) => !RETIRED.has(a.clinicalStatus);

/** The FHIR reaction the `reactions` column holds (one per allergy here). */
type Reaction = {
  manifestation?: { text?: string }[];
  severity?: ReactionSeverity;
};

/**
 * The columns an allergy request sets, copied field by field so a request can
 * never set ids, the patient or the recorder. On a change, `existing` keeps the
 * parts of the reaction the request leaves out.
 */
export function allergyColumns(
  dto: UpdateAllergyDto,
  existing?: AllergyIntolerance,
): Partial<AllergyIntolerance> {
  const columns: Partial<AllergyIntolerance> = {};
  if (dto.type) columns.type = dto.type;
  if (dto.code !== undefined) columns.code = dto.code;
  if (dto.display !== undefined) columns.display = dto.display;
  if (dto.category !== undefined) columns.category = dto.category;
  if (dto.clinicalStatus) columns.clinicalStatus = dto.clinicalStatus;
  if (dto.note !== undefined) columns.note = dto.note;
  if (dto.onsetDate !== undefined) columns.onsetDate = dto.onsetDate;

  if (dto.reaction !== undefined || dto.severity) {
    const [previous] = (existing?.reactions ?? []) as Reaction[];
    const text = dto.reaction ?? previous?.manifestation?.[0]?.text;
    const severity = dto.severity ?? previous?.severity;
    const reaction: Reaction = {
      ...(text && { manifestation: [{ text }] }),
      ...(severity && { severity }),
    };
    columns.reactions = text || severity ? [reaction] : [];
  }

  const criticality =
    dto.criticality ??
    (dto.severity === 'severe'
      ? AllergyIntoleranceCriticality.HIGH
      : dto.severity && AllergyIntoleranceCriticality.LOW);
  if (criticality) columns.criticality = criticality;

  return columns;
}
