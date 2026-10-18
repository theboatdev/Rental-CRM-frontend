import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reserve, checkIn, cancel, availability, duration, today, addDays } from './bookings.mjs';
const start = today();
const end = addDays(start, 3);
const data = () => ({ currentUser: { name: 'Demo Staff' }, vehicles: [{ id: 'v1', plateNumber: 'TEST-1', dailyRate: 100, depositAmount: 50, status: 'AVAILABLE', mileage: 123 }], renters: [{ id: 'r1', profileId: 'SR-0146', fullName: 'Demo Renter', phone: '000', rentalsCount: 0 }], rentals: [], payments: [] });
const input = { vehiclePlate: 'TEST-1', renterId: 'SR-0146', startDate: start, endDate: end, dailyRate: 100, paidAmount: 25 };
test('reservation records the advance once without changing vehicle availability or earned rentals', () => {
  const original = data(); const result = reserve(original, input);
  assert.equal(result.booking.totalAmount, 300);
  assert.equal(result.booking.status, 'RESERVED');
  assert.equal(result.data.vehicles[0].status, 'AVAILABLE');
  assert.equal(result.data.renters[0].rentalsCount, 0);
  assert.equal(result.data.payments[0].amount, 25);
  assert.equal(result.data.payments[0].rentalCode, result.booking.code);
  assert.equal(original.rentals.length, 0);
});
test('overlapping reservations are rejected; adjacent return/pickup dates are allowed', () => {
  const result = reserve(data(), input);
  assert.throws(() => reserve(result.data, input), /Conflicts/);
  assert.equal(availability(result.data, 'TEST-1', end, addDays(end, 1)), '');
});
test('maintenance, invalid dates and invalid advances are rejected', () => {
  const initial = data(); initial.vehicles[0].status = 'MAINTENANCE';
  assert.throws(() => reserve(initial, input), /maintenance/);
  assert.throws(() => duration(end, start), /Return date/);
  assert.throws(() => reserve(data(), { ...input, paidAmount: -1 }), /valid rates/);
  assert.throws(() => reserve(data(), { ...input, paidAmount: 351 }), /Advance exceeds/);
});
test('guest registration and reservation are atomic and preserve unverified documents', () => {
  const guest = { fullName: 'Test Guest', phone: '000', documents: [{ type: 'Passport', number: 'TEST', verified: false }] };
  const result = reserve(data(), input, guest);
  assert.equal(result.booking.renterId, result.data.renters[0].profileId);
  assert.equal(result.data.renters[0].source, 'Self-Registered (Online)');
  assert.equal(result.data.renters[0].documents[0].verified, false);
  assert.equal(result.data.payments.length, 0);
  assert.equal(result.booking.paidAmount, 0);
  assert.equal(result.booking.bookingSource, 'Online Self-Registration');
});
test('check-in updates vehicle, rental and renter once, preserving payments', () => {
  const result = reserve(data(), input);
  const next = checkIn(result.data, result.booking.id);
  assert.equal(next.vehicles[0].status, 'RENTED');
  assert.equal(next.rentals[0].status, 'ACTIVE');
  assert.equal(next.rentals[0].startMileage, 123);
  assert.equal(next.renters[0].rentalsCount, 1);
  assert.equal(next.payments.length, 1);
  assert.ok(next.rentals[0].pickupInspection.timestamp);
  assert.throws(() => checkIn(next, result.booking.id), /no longer/);
});
test('future handover and occupied vehicles cannot check in', () => {
  const future = reserve(data(), { ...input, startDate: end, endDate: addDays(end, 3) });
  assert.throws(() => checkIn(future.data, future.booking.id), /within the reserved dates/);
  const result = reserve(data(), input); result.data.vehicles[0].status = 'RENTED';
  assert.throws(() => checkIn(result.data, result.booking.id), /Return the current/);
});
test('cancellation releases dates while retaining payment audit history', () => {
  const result = reserve(data(), input); const next = cancel(result.data, result.booking.id);
  assert.equal(next.rentals[0].status, 'CANCELLED');
  assert.equal(next.payments[0].amount, 25);
  assert.equal(next.vehicles[0].status, 'AVAILABLE');
  assert.equal(availability(next, 'TEST-1', start, end), '');
  assert.throws(() => cancel(next, result.booking.id), /Only pending/);
});
