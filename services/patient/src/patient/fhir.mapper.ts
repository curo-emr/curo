import { Patient, Condition, Observation } from '@curo/shared/database';
import { AllergyIntolerance } from '../entities/allergy-intolerance.entity';

// Roles that receive a minimized patient projection (data minimization).
// Pharmacy & lab only need identity for dispensing / specimen labeling — not
// NIC, blood type, contact, address, insurance, emergency contact, nationality,
// occupation or tags.
const MINIMIZED_ROLES = new Set(['PHARMACIST', 'LAB_STAFF']);

export function toFhirPatient(p: Patient, role?: string) {
  if (role && MINIMIZED_ROLES.has(role)) {
    return {
      resourceType: 'Patient',
      id: p.id,
      meta: { lastUpdated: p.updatedAt },
      identifier: [
        p.personalHealthNumber && {
          use: 'official',
          system: 'urn:curo:phn',
          value: p.personalHealthNumber,
        },
        { system: 'urn:curo:patient-code', value: p.patientCode },
      ].filter(Boolean),
      active: p.active,
      name: [
        {
          use: 'official',
          family: p.lastName,
          given: [p.firstName, p.middleName].filter(Boolean),
        },
      ],
      gender: p.gender,
      birthDate: p.birthDate,
    };
  }
  return {
    resourceType: 'Patient',
    id: p.id,
    meta: { lastUpdated: p.updatedAt },
    identifier: [
      p.personalHealthNumber && {
        use: 'official',
        system: 'urn:curo:phn',
        value: p.personalHealthNumber,
      },
      { system: 'urn:curo:patient-code', value: p.patientCode },
      p.nic && { system: 'urn:curo:nic', value: p.nic },
      p.passportNumber && {
        system: 'urn:curo:passport',
        value: p.passportNumber,
      },
    ].filter(Boolean),
    active: p.active,
    name: [
      {
        use: 'official',
        family: p.lastName,
        given: [p.firstName, p.middleName].filter(Boolean),
      },
    ],
    gender: p.gender,
    birthDate: p.birthDate,
    telecom: [
      p.phone && { system: 'phone', value: p.phone, use: 'mobile' },
      p.email && { system: 'email', value: p.email },
    ].filter(Boolean),
    address:
      p.addressLine1 || p.city
        ? [
            {
              line: [p.addressLine1, p.addressLine2].filter(Boolean),
              city: p.city,
              state: p.state,
              postalCode: p.postalCode,
              country: p.country,
            },
          ]
        : [],
    maritalStatus: p.maritalStatus
      ? {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
              code: p.maritalStatus,
            },
          ],
        }
      : undefined,
    contact: p.emergencyContactName
      ? [
          {
            name: { text: p.emergencyContactName },
            telecom: [{ system: 'phone', value: p.emergencyContactPhone }],
            relationship: [{ text: p.emergencyContactRelationship }],
          },
        ]
      : [],
    extension: [
      { url: 'urn:curo:bloodType', valueString: p.bloodType },
      p.nationality && {
        url: 'urn:curo:nationality',
        valueString: p.nationality,
      },
      p.occupation && { url: 'urn:curo:occupation', valueString: p.occupation },
      ...(p.tags ?? []).map((tag) => ({
        url: 'urn:curo:tag',
        valueString: tag,
      })),
      p.insuranceProvider && {
        url: 'urn:curo:insurance',
        extension: [
          { url: 'provider', valueString: p.insuranceProvider },
          { url: 'policyNumber', valueString: p.insurancePolicyNumber },
          { url: 'groupNumber', valueString: p.insuranceGroupNumber },
          p.insuranceExpiryDate && {
            url: 'expiryDate',
            valueDate: p.insuranceExpiryDate,
          },
          p.insuranceHolderName && {
            url: 'holderName',
            valueString: p.insuranceHolderName,
          },
          p.insuranceRelationship && {
            url: 'relationship',
            valueString: p.insuranceRelationship,
          },
        ].filter(Boolean),
      },
    ].filter(Boolean),
  };
}

export function toFhirAllergy(a: AllergyIntolerance) {
  return {
    resourceType: 'AllergyIntolerance',
    id: a.id,
    patient: { reference: `Patient/${a.patientId}` },
    recorder: { reference: `Practitioner/${a.practitionerId}` },
    type: a.type,
    criticality: a.criticality,
    code: { coding: [{ code: a.code, display: a.display }] },
    category: a.category ? [a.category] : undefined,
    clinicalStatus: { coding: [{ code: a.clinicalStatus || 'active' }] },
    verificationStatus: {
      coding: [{ code: a.verificationStatus || 'confirmed' }],
    },
    onsetDateTime: a.onsetDate,
    reaction: a.reactions || [],
    note: a.note ? [{ text: a.note }] : undefined,
    recordedDate: a.createdAt,
  };
}

export function toFhirCondition(c: Condition) {
  return {
    resourceType: 'Condition',
    id: c.id,
    subject: { reference: `Patient/${c.patientId}` },
    asserter: { reference: `Practitioner/${c.practitionerId}` },
    encounter: c.encounterId
      ? { reference: `Encounter/${c.encounterId}` }
      : undefined,
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: c.clinicalStatus,
        },
      ],
    },
    verificationStatus: {
      coding: [{ code: c.verificationStatus || 'confirmed' }],
    },
    category: c.category ? [{ coding: [{ code: c.category }] }] : undefined,
    severity: c.severity ? { coding: [{ code: c.severity }] } : undefined,
    code: {
      coding: [
        {
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: c.code,
          display: c.display,
        },
      ],
    },
    onsetDateTime: c.onsetDate,
    abatementDateTime: c.abatementDate,
    note: c.note ? [{ text: c.note }] : undefined,
    recordedDate: c.createdAt,
  };
}

export function toFhirObservation(o: Observation) {
  return {
    resourceType: 'Observation',
    id: o.id,
    status: o.status,
    category: o.category ? [{ coding: [{ code: o.category }] }] : undefined,
    code: { coding: [{ code: o.code, display: o.display }] },
    subject: { reference: `Patient/${o.patientId}` },
    performer: [{ reference: `Practitioner/${o.practitionerId}` }],
    encounter: o.encounterId
      ? { reference: `Encounter/${o.encounterId}` }
      : undefined,
    effectiveDateTime: o.effectiveDateTime,
    valueQuantity:
      o.valueQuantity != null
        ? {
            value: Number(o.valueQuantity),
            unit: o.valueUnit,
          }
        : undefined,
    valueString: o.valueString,
    interpretation: o.interpretation
      ? [{ coding: [{ code: o.interpretation }] }]
      : undefined,
    referenceRange:
      o.referenceRangeLow || o.referenceRangeHigh
        ? [
            {
              low: o.referenceRangeLow
                ? { value: parseFloat(o.referenceRangeLow) }
                : undefined,
              high: o.referenceRangeHigh
                ? { value: parseFloat(o.referenceRangeHigh) }
                : undefined,
              text: o.referenceRangeText,
            },
          ]
        : undefined,
    component: o.components,
  };
}
