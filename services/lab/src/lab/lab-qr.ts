/** What a lab label's QR code points at: an order and, on a per-test label, one of its tests. */
export interface LabQrTarget {
  orderId: string;
  testCode?: string;
  testIndex?: number;
}

/**
 * Reads the data scanned from a lab label. Labels encode an order-level URL
 * (.../lab/orders/:id) or a per-test URL (.../lab/orders/:id?test=<code>&i=<index>);
 * a bare order id is read as the order.
 */
export function parseLabQr(raw: string): LabQrTarget {
  const [path, qs] = raw.split('?');
  const segs = path.split('/').filter(Boolean);
  const ordersIdx = segs.indexOf('orders');
  const orderId =
    ordersIdx >= 0 && segs[ordersIdx + 1]
      ? segs[ordersIdx + 1]
      : segs[segs.length - 1];
  let testCode: string | undefined;
  let testIndex: number | undefined;
  if (qs) {
    const sp = new URLSearchParams(qs);
    testCode = sp.get('test') ?? undefined;
    const i = sp.get('i');
    testIndex = i != null ? parseInt(i, 10) : undefined;
  }
  return { orderId, testCode, testIndex };
}
