import { parseLabQr } from './lab-qr';

const ORDER_ID = '6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b';
const ORDER_URL = `http://localhost:3000/lab/orders/${ORDER_ID}`;

describe('parseLabQr', () => {
  it('reads the order from an order-level label', () => {
    expect(parseLabQr(ORDER_URL)).toEqual({ orderId: ORDER_ID });
  });

  it('reads the order and the test from a per-test label', () => {
    expect(parseLabQr(`${ORDER_URL}?test=58410-2&i=1`)).toEqual({
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
    ).toEqual({ orderId: ORDER_ID });
  });

  it('reads a bare order id typed in by hand', () => {
    expect(parseLabQr(ORDER_ID)).toEqual({ orderId: ORDER_ID });
  });
});
