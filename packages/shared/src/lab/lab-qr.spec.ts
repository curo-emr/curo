import { labSampleUrl, labVisitUrl, parseLabQr } from './lab-qr';

const ORDER_ID = '6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b';
const ENCOUNTER_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const ORDER_URL = `http://localhost:3000/lab/orders/${ORDER_ID}`;

describe('parseLabQr', () => {
  it('reads the order from an order-level label', () => {
    expect(parseLabQr(ORDER_URL)).toEqual({
      kind: 'sample',
      orderId: ORDER_ID,
    });
  });

  it('reads the order and the test from a per-test label', () => {
    expect(parseLabQr(`${ORDER_URL}?test=58410-2&i=1`)).toEqual({
      kind: 'sample',
      orderId: ORDER_ID,
      testCode: '58410-2',
      testIndex: 1,
    });
  });

  it('decodes a test code that was URL-encoded on the label', () => {
    const code = 'HbA1c (IFCC)';
    expect(
      parseLabQr(`${ORDER_URL}?test=${encodeURIComponent(code)}&i=0`),
    ).toMatchObject({ testCode: code, testIndex: 0 });
  });

  it('reads the order whatever host or path prefix the label was printed with', () => {
    expect(
      parseLabQr(`https://curo.example/api/lab/orders/${ORDER_ID}/`),
    ).toEqual({ kind: 'sample', orderId: ORDER_ID });
  });

  it('reads a bare order id typed in by hand', () => {
    expect(parseLabQr(` ${ORDER_ID} `)).toEqual({
      kind: 'sample',
      orderId: ORDER_ID,
    });
  });

  it('reads the visit from a visit slip', () => {
    expect(
      parseLabQr(`http://localhost:3000/lab/visits/${ENCOUNTER_ID}`),
    ).toEqual({ kind: 'visit', encounterId: ENCOUNTER_ID });
  });
});

describe('the printed URLs', () => {
  it('read back as what they were printed for', () => {
    expect(parseLabQr(labSampleUrl(ORDER_ID))).toEqual({
      kind: 'sample',
      orderId: ORDER_ID,
    });
    expect(
      parseLabQr(labSampleUrl(ORDER_ID, { code: 'HbA1c (IFCC)', index: 2 })),
    ).toEqual({
      kind: 'sample',
      orderId: ORDER_ID,
      testCode: 'HbA1c (IFCC)',
      testIndex: 2,
    });
    expect(parseLabQr(labVisitUrl(ENCOUNTER_ID))).toEqual({
      kind: 'visit',
      encounterId: ENCOUNTER_ID,
    });
  });
});
