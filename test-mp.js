import axios from 'axios';

const payload = {
  items: [
    {
      title: `Licença de 30 dias - Sistema ONR`,
      quantity: 1,
      unit_price: 10,
      currency_id: 'BRL'
    }
  ],
  payer: {
    email: 'test@test.com'
  },
  back_urls: {
    success: `http://localhost:3000/billing?status=success`,
    failure: `http://localhost:3000/billing?status=failure`,
    pending: `http://localhost:3000/billing?status=pending`
  },
  auto_return: 'approved',
  external_reference: '123'
};

console.log(JSON.stringify(payload, null, 2));
