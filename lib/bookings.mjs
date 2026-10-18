export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
export function addDays(date, days) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
export function duration(start, end) {
  const days = (Date.parse(end) - Date.parse(start)) / 86400000;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || !Number.isInteger(days) || days <= 0) throw new Error('Return date must be after pickup date.');
  return days;
}
export function availability(data, plate, start, end, excludeId) {
  const vehicle = data.vehicles.find(v => v.plateNumber === plate);
  if (!vehicle) return 'Select a vehicle.';
  if (vehicle.status === 'MAINTENANCE') return 'This vehicle is in maintenance.';
  const clash = data.rentals.find(r => r.id !== excludeId && r.vehiclePlate === plate && ['ACTIVE', 'RESERVED'].includes(r.status) && r.startDate < end && r.endDate > start);
  return clash ? `Conflicts with ${clash.code} (${clash.startDate} to ${clash.endDate}).` : '';
}
export function reserve(data, input, guest) {
  const days = duration(input.startDate, input.endDate);
  if (input.startDate < today()) throw new Error('Pickup date cannot be in the past.');
  const conflict = availability(data, input.vehiclePlate, input.startDate, input.endDate);
  if (conflict) throw new Error(conflict);
  const vehicle = data.vehicles.find(v => v.plateNumber === input.vehiclePlate);
  const id = globalThis.crypto.randomUUID();
  const renter = guest ? { ...guest, id: `rnt-${id}`, profileId: `SR-${String(Math.max(145, ...data.renters.map(r => Number(r.profileId.replace('SR-', '')) || 0)) + 1).padStart(4, '0')}`, rentalsCount: 0, source: 'Self-Registered (Online)' } : data.renters.find(r => r.profileId === input.renterId);
  if (!renter?.fullName?.trim() || !renter?.phone?.trim()) throw new Error('Select a renter with a name and phone number.');
  const dailyRate = Number(guest ? vehicle.dailyRate : input.dailyRate);
  const depositAmount = Number(input.depositAmount ?? vehicle.depositAmount);
  const paidAmount = Number(guest ? 0 : input.paidAmount || 0);
  if (![dailyRate, depositAmount, paidAmount].every(n => Number.isFinite(n) && n >= 0) || dailyRate <= 0) throw new Error('Enter valid rates and payment amounts.');
  if (paidAmount > days * dailyRate + depositAmount) throw new Error('Advance exceeds rental total and security deposit.');
  const booking = { id: `rent-${id}`, code: `BK-${new Date().getFullYear()}-${id.slice(0, 8).toUpperCase()}`, vehiclePlate: vehicle.plateNumber, renterId: renter.profileId, renterName: renter.fullName, renterPhone: renter.phone, days, dailyRate, totalAmount: days * dailyRate, depositAmount, paidAmount, startDate: input.startDate, endDate: input.endDate, notes: input.notes || '', bookingSource: guest ? 'Online Self-Registration' : 'Manual Staff Booking', status: 'RESERVED', pickupInspection: null, dropInspection: null };
  const payment = { id: `pmt-${id}`, receiptNo: `ADV-${id.slice(0, 8).toUpperCase()}`, date: today(), rentalCode: booking.code, renterName: renter.fullName, amount: paidAmount, method: input.paymentMethod || 'Cash (LKR)', type: 'Booking Advance', receivedBy: data.currentUser.name };
  return { booking, data: { ...data, renters: guest ? [renter, ...data.renters] : data.renters, rentals: [booking, ...data.rentals], payments: paidAmount ? [payment, ...data.payments] : data.payments } };
}
export function checkIn(data, id) {
  const rental = data.rentals.find(r => r.id === id);
  if (rental?.status !== 'RESERVED') throw new Error('This reservation is no longer awaiting pickup.');
  const vehicle = data.vehicles.find(v => v.plateNumber === rental.vehiclePlate);
  if (!vehicle || vehicle.status !== 'AVAILABLE') throw new Error('Return the current rental or finish maintenance before handover.');
  if (today() < rental.startDate || today() >= rental.endDate) throw new Error('Check-in must be within the reserved dates.');
  const conflict = availability(data, rental.vehiclePlate, rental.startDate, rental.endDate, id);
  if (conflict) throw new Error(conflict);
  return { ...data, rentals: data.rentals.map(r => r.id === id ? { ...r, status: 'ACTIVE', startMileage: vehicle.mileage, pickupInspection: { timestamp: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo' }) + ' SLST', verifiedBy: data.currentUser.name, points: ['Demo six-point handover inspection'] } } : r), vehicles: data.vehicles.map(v => v.id === vehicle.id ? { ...v, status: 'RENTED', currentRenterId: rental.renterId } : v), renters: data.renters.map(r => r.profileId === rental.renterId ? { ...r, rentalsCount: (r.rentalsCount || 0) + 1 } : r) };
}
export function cancel(data, id) {
  const rental = data.rentals.find(r => r.id === id);
  if (rental?.status !== 'RESERVED') throw new Error('Only pending reservations can be cancelled.');
  return { ...data, rentals: data.rentals.map(r => r.id === id ? { ...r, status: 'CANCELLED' } : r) };
}
