import { TicketCode } from './ticket-code.vo';

describe('TicketCode value object', () => {
  it('throws when constructed empty', () => {
    expect(() => new TicketCode('')).toThrow('TicketCode cannot be empty');
    expect(() => new TicketCode('   ')).toThrow('TicketCode cannot be empty');
  });

  it('normalizes the code to upper case', () => {
    expect(new TicketCode('tkt-abc123').value).toBe('TKT-ABC123');
  });

  it('generates a prefixed code', () => {
    expect(TicketCode.generate().value).toMatch(/^TKT-[0-9A-F]{12}$/);
  });

  it('generates a unique code each time', () => {
    expect(TicketCode.generate().value).not.toBe(TicketCode.generate().value);
  });
});
