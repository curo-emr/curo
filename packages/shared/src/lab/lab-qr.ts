// What the lab's QR codes encode. Clinical prints them and the lab service
// reads them back, so both formats are defined here, once.
//
// - A sample label goes on a specimen tube. It names one lab order and, on a
//   panel, one test in it. The lab the order was sent to scans it to receive
//   the sample.
// - A visit slip goes to the patient. It names the visit, so whichever lab the
//   patient (or their samples) reaches can find the tests sent to it.
//
// The seed imports this file directly, so it must stay free of imports.

/** A test inside a panel order, as its sample label names it. */
export interface LabelledTest {
  code: string;
  index: number;
}

export type LabQrTarget =
  | { kind: 'sample'; orderId: string; testCode?: string; testIndex?: number }
  | { kind: 'visit'; encounterId: string };

const base = () => process.env.GATEWAY_URL || 'http://localhost:3000';

/** The URL on a sample label: the order's, or one test's in a panel. */
export function labSampleUrl(orderId: string, test?: LabelledTest): string {
  const url = `${base()}/lab/orders/${orderId}`;
  return test
    ? `${url}?test=${encodeURIComponent(test.code)}&i=${test.index}`
    : url;
}

/** The URL on a visit's lab slip. */
export function labVisitUrl(encounterId: string): string {
  return `${base()}/lab/visits/${encounterId}`;
}

/**
 * Reads the data scanned from a sample label or a visit slip, whatever host or
 * path prefix it was printed with. A bare id, typed in by hand, is read as an
 * order.
 */
export function parseLabQr(raw: string): LabQrTarget {
  const [path, qs] = raw.trim().split('?');
  const segs = path.split('/').filter(Boolean);
  const after = (name: string) => {
    const i = segs.lastIndexOf(name);
    return i >= 0 ? segs[i + 1] : undefined;
  };

  const encounterId = after('visits');
  if (encounterId) return { kind: 'visit', encounterId };

  const orderId = after('orders') ?? segs[segs.length - 1] ?? '';
  const params = new URLSearchParams(qs ?? '');
  const testCode = params.get('test') ?? undefined;
  const i = params.get('i');
  return {
    kind: 'sample',
    orderId,
    ...(testCode != null && { testCode }),
    ...(i != null && { testIndex: parseInt(i, 10) }),
  };
}
