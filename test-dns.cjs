const dns = require('dns');

const domains = [
  'stg-auth.id.onr.org.br',
  'stg-id.onr.org.br',
  'id-stg.onr.org.br',
  'hml-id.onr.org.br',
  'id-hml.onr.org.br',
  'homologacao-id.onr.org.br',
  'id.stg.onr.org.br',
  'id.hml.onr.org.br',
  'id.homologacao.onr.org.br',
  'auth.onr.org.br',
  'stg.auth.onr.org.br',
  'hml.auth.onr.org.br',
  'homologacao.auth.onr.org.br',
  'auth-stg.onr.org.br',
  'auth-hml.onr.org.br',
  'auth-homologacao.onr.org.br'
];

domains.forEach(domain => {
  dns.lookup(domain, (err, address) => {
    if (err) console.log(`${domain}: ERROR`);
    else console.log(`${domain}: ${address}`);
  });
});
