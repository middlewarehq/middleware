import { checkDomainWithRegex } from '../domainCheck';

describe('checkDomainWithRegex', () => {
  const validDomains = [
    'http://example.com',
    'https://example.com',
    'https://sub.example.co.uk',
    'http://example.io:8080',
    'https://example.io:8080',
    'https://example.com/',
    'https://123domain.net',
    'http://my-domain.org'
  ];

  test.each(validDomains)('returns true for %s', (domain) => {
    expect(checkDomainWithRegex(domain)).toBe(true);
  });

  const invalidDomains = [
    'example.com',
    'ftp://example.com',
    'http:/example.com',
    'https//example.com',
    'https://-example.com',
    'https://example-.com',
    'https://example',
    'https://.com',
    'https://example:toolongtsadasds',
    'https://example.com:999999',
    'https://example .com',
    'https://example.com/ path',
    '',
    'https://',
    'https:///'
  ];

  test.each(invalidDomains)('returns false for %s', (domain) => {
    expect(checkDomainWithRegex(domain)).toBe(false);
  });
});
