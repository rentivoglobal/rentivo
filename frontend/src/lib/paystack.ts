import { paystackPublicKey } from './config';

function loadPaystack(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Paystack.'));
    document.body.appendChild(script);
  });
}

export async function openPaystackCheckout(options: {
  email: string;
  amountKobo: number;
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<{ reference: string }> {
  if (!paystackPublicKey) {
    throw new Error('Paystack public key is not configured.');
  }
  await loadPaystack();
  return new Promise((resolve, reject) => {
    const handler = (window.PaystackPop as unknown as {
      setup: (config: Record<string, unknown>) => { openIframe: () => void };
    }).setup({
      key: paystackPublicKey,
      email: options.email,
      amount: options.amountKobo,
      currency: 'NGN',
      ref: options.reference,
      metadata: options.metadata,
      callback: (response: { reference: string }) => resolve({ reference: response.reference }),
      onClose: () => reject(new Error('Payment window closed.'))
    });
    handler.openIframe();
  });
}
