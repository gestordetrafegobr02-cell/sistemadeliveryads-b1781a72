import test from 'node:test';
import assert from 'node:assert/strict';
import { isWithinScheduledHoursAt, type OpeningHours } from './storeHours.ts';

test('keeps a store open after midnight when the previous weekday closes overnight', () => {
  const hours: OpeningHours = {
    monday: { open: '22:00', close: '02:00' },
  };

  assert.equal(isWithinScheduledHoursAt(hours, 2, 1, 0), true);
  assert.equal(isWithinScheduledHoursAt(hours, 2, 2, 0), true);
  assert.equal(isWithinScheduledHoursAt(hours, 2, 2, 1), false);
});

test('handles the overnight interval on its starting weekday', () => {
  const hours: OpeningHours = {
    friday: { open: '23:00', close: '03:00' },
  };

  assert.equal(isWithinScheduledHoursAt(hours, 5, 23, 0), true);
  assert.equal(isWithinScheduledHoursAt(hours, 5, 23, 59), true);
  assert.equal(isWithinScheduledHoursAt(hours, 5, 3, 1), false);
});

test('keeps regular schedules inclusive at opening and closing boundaries', () => {
  const hours: OpeningHours = {
    wednesday: { open: '09:00', close: '18:00' },
  };

  assert.equal(isWithinScheduledHoursAt(hours, 3, 9, 0), true);
  assert.equal(isWithinScheduledHoursAt(hours, 3, 12, 30), true);
  assert.equal(isWithinScheduledHoursAt(hours, 3, 18, 0), true);
  assert.equal(isWithinScheduledHoursAt(hours, 3, 18, 1), false);
});

test('rejects malformed time values and invalid clock inputs', () => {
  const hours: OpeningHours = {
    thursday: { open: '25:00', close: '28:00' },
  };

  assert.equal(isWithinScheduledHoursAt(hours, 4, 12, 0), false);
  assert.equal(isWithinScheduledHoursAt(hours, 4, 24, 0), false);
});

test('treats a missing weekday schedule as closed unless yesterday is still overnight', () => {
  const hours: OpeningHours = {
    sunday: { open: '22:00', close: '02:00' },
  };

  assert.equal(isWithinScheduledHoursAt(hours, 1, 1, 30), true);
  assert.equal(isWithinScheduledHoursAt(hours, 1, 10, 0), false);
});
