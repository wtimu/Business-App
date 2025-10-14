const forge = require('node-forge');
const fs = require('fs');

// Generate a keypair
const keys = forge.pki.rsa.generateKeyPair(2048);

// Create a certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [{
  name: 'commonName',
  value: 'localhost'
}, {
  name: 'countryName',
  value: 'UG'
}, {
  shortName: 'ST',
  value: 'Central'
}, {
  name: 'localityName',
  value: 'Kampala'
}, {
  name: 'organizationName',
  value: 'Adtim Technologies (U) Ltd'
}];

cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.sign(keys.privateKey);

// Convert to PEM format
const certPem = forge.pki.certificateToPem(cert);
const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

// Write to files
fs.writeFileSync('cert.pem', certPem);
fs.writeFileSync('key.pem', keyPem);

console.log('Valid SSL certificates created successfully!');