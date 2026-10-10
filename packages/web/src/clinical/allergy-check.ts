import type { Allergy } from "../fhir/allergy";

// Flags recorded allergies that may apply to a drug, from the drug's name. It only
// ever warns: a name it doesn't recognise (a brand, or a class not listed here)
// is not flagged, so no screen may say a drug is allergy-free.

/**
 * Drug classes whose members can cross-react, so an allergy to one is a warning
 * for all. `allergy` matches an allergy recorded as the class itself ("Penicillin",
 * "Sulfa", "NSAIDs"); `member` matches a drug of the class by its generic name.
 */
const CROSS_REACTING_CLASSES = [
  {
    label: "a penicillin",
    allergy: /penicillin/,
    member: /\b(\w*cillin|penicillin)\b/,
  },
  {
    label: "a cephalosporin",
    allergy: /cephalosporin/,
    member: /\bce(f|ph)\w+/,
  },
  {
    label: "a sulfonamide",
    allergy: /\bsul(f|ph)/,
    member: /\bsul(f|ph)a\w*|\bco-trimoxazole\b/,
  },
  {
    label: "an NSAID",
    allergy: /\bnsaid|salicylate/,
    member: /\b(aspirin|\w*fenac|\w*profen|naproxen|\w*oxicam|\w*coxib|indomet(h)?acin|mefenamic|ketorolac)\b/,
  },
] as const;

/** A recorded allergy that may apply to a drug: to the drug itself, or to a class it belongs to. */
export interface AllergyAlert {
  allergy: Allergy;
  /** Set when the match is by class, e.g. "a penicillin". */
  drugClass?: string;
}

/** The patient's allergies that may apply to the drug named `drugName`, e.g. "Amoxicillin 250mg Capsule". */
export function allergyAlerts(drugName: string, allergies: readonly Allergy[]): AllergyAlert[] {
  const drug = drugName.toLowerCase();
  const drugClasses = CROSS_REACTING_CLASSES.filter(c => c.member.test(drug));
  return allergies.flatMap(allergy => {
    const substance = allergy.substance.trim().toLowerCase();
    if (!substance) return [];
    if (drug.includes(substance)) return [{ allergy }];
    const shared = drugClasses.find(c => c.allergy.test(substance) || c.member.test(substance));
    return shared ? [{ allergy, drugClass: shared.label }] : [];
  });
}

/** One line for a warning, e.g. "Allergic to Penicillin (rash). Amoxicillin 250mg is a penicillin." */
export function describeAllergyAlert({ allergy, drugClass }: AllergyAlert, drugName: string): string {
  const reaction = allergy.reaction ? ` (${allergy.reaction})` : "";
  const why = drugClass ? ` ${drugName} is ${drugClass}.` : "";
  return `Allergic to ${allergy.substance}${reaction}.${why}`;
}
