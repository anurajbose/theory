import { describe, it, expect } from 'vitest';
import {
  tenantRoom, userRoom, emitToUser, emitToTenant, closeRealtime,
} from '../src/realtime/io';

describe('realtime tenant scoping', () => {
  it('rooms are namespaced by tenant / user', () => {
    expect(tenantRoom('abc')).toBe('t:abc');
    expect(userRoom('u1')).toBe('u:u1');
  });

  it('emit helpers are safe no-ops before init (never throw, never global)', () => {
    expect(() => emitToUser('t1', 'u1', 'x', {})).not.toThrow();
    expect(() => emitToTenant('t1', 'x', {})).not.toThrow();
    expect(() => emitToUser('', '', 'x', {})).not.toThrow();
  });

  it('closeRealtime is idempotent / safe when not started', async () => {
    await expect(closeRealtime()).resolves.toBeUndefined();
    await expect(closeRealtime()).resolves.toBeUndefined();
  });
});
