const dns = require('dns');

const domains = [
  'stg-auth.id.onr.org.br',
  'hml-auth.id.onr.org.br',
  'homologacao-auth.id.onr.org.br',
  'auth.stg.id.onr.org.br',
  'auth.hml.id.onr.org.br',
  'auth.id.onr.org.br'
];

domains.forEach(domain => {
  dns.lookup(domain, (err, address) => {
    if (err) console.log(`${domain}: ERROR`);
    else console.log(`${domain}: ${address}`);
  });
});
