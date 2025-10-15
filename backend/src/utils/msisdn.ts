const MSISDN_REGEX = /^(?:\+256|0)(7\d{8})$/;

export const normalizeMsisdn = (input: string): string => {
  const trimmed = input.replace(/\s+/g, '');
  const match = MSISDN_REGEX.exec(trimmed);
  if (!match) {
    throw new Error('Invalid Ugandan MSISDN');
  }
  return `256${match[1]}`;
};
