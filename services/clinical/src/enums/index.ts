export enum EncounterStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in-progress',
  ON_HOLD = 'onhold',
  DISCHARGED = 'discharged',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ENTERED_IN_ERROR = 'entered-in-error',
}

export enum TaskStatus {
  DRAFT = 'draft',
  REQUESTED = 'requested',
  RECEIVED = 'received',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}
