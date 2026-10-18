'use client';

import { useState, useEffect, useId, cloneElement, Children } from 'react';
import { useStore } from '../context/StoreContext';
import { today, addDays, availability } from '../lib/bookings.mjs';

export const buttonClass = 'px-4 py-2 bg-[#0A0A0C] text-white text-xs font-mono hover:bg-[#FF4F00] disabled:opacity-40';
export function Field({ label, children }) {
  const id = useId();
  return <div className="block text-xs font-mono space-y-1"><label htmlFor={id} className="text-[#6E7381]">{label}</label>{Children.toArray(children).map((child, index) => index === 0 ? cloneElement(child, { id }) : child)}</div>;
}
export const inputClass = 'w-full p-2 border border-black/20 bg-white text-sm text-black';
export function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-label={title} className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"><div className="flex justify-between gap-4 mb-5"><h2 className="text-xl font-bold">{title}</h2><button aria-label="Close dialog" onClick={onClose} className="text-xl px-2">×</button></div>{children}</section></div>;
}
function DocumentPreview({ label, multiple = false }) {
  const [files, setFiles] = useState([]);
  useEffect(() => () => files.forEach(file => URL.revokeObjectURL(file.url)), [files]);
  return <Field label={label}><input type="file" accept="image/*,application/pdf" multiple={multiple} onChange={e => setFiles(Array.from(e.target.files).map(file => ({ name: file.name, image: file.type.startsWith('image/'), url: URL.createObjectURL(file) })))} className={inputClass} />{files.map(file => <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="block text-xs underline">{file.image && <img src={file.url} alt={file.name} className="max-h-24 object-contain" />}{file.name}</a>)}</Field>;
}
export function BookingForm({ guest, initial = {}, onComplete }) {
  const store = useStore();
  const [form, setForm] = useState({ vehiclePlate: initial.vehiclePlate || store.vehicles.find(v => v.status !== 'MAINTENANCE')?.plateNumber || '', renterId: store.renters[0]?.profileId || '', startDate: initial.startDate || today(), endDate: addDays(initial.startDate || today(), 3), dailyRate: '', depositAmount: '', paidAmount: 0, paymentMethod: 'Cash (LKR)', notes: '', flightInfo: '' });
  const [error, setError] = useState('');
  const vehicle = store.vehicles.find(v => v.plateNumber === form.vehiclePlate);
  const days = Math.max(0, (Date.parse(form.endDate) - Date.parse(form.startDate)) / 86400000) || 0;
  const rate = guest ? vehicle?.dailyRate || 0 : Number(form.dailyRate || vehicle?.dailyRate || 0);
  const deposit = Number(form.depositAmount === '' ? vehicle?.depositAmount || 0 : form.depositAmount);
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  const dateField = (name, label) => <Field label={label}><input required type="date" name={name} value={form[name]} min={name === 'startDate' ? today() : addDays(form.startDate || today(), 1)} onChange={change} className={inputClass} /></Field>;
  return <form className="space-y-4" onSubmit={e => {
    e.preventDefault(); setError('');
    try { onComplete(store.createReservation({ ...form, dailyRate: rate, depositAmount: deposit, notes: [form.flightInfo, form.notes].filter(Boolean).join(' · ') }, guest)); } catch (err) { setError(err.message); }
  }}>
    {!guest && <Field label="Client profile"><select required name="renterId" value={form.renterId} onChange={change} className={inputClass}>{store.renters.map(r => <option key={r.id} value={r.profileId}>{r.profileId} — {r.fullName}</option>)}</select></Field>}
    <div className="grid grid-cols-2 gap-3">{dateField('startDate', 'Pickup date')}{dateField('endDate', 'Return date')}</div>
    <fieldset className="space-y-2"><legend className="text-xs font-mono mb-2">Choose a vehicle · LKR per day</legend><div className="grid sm:grid-cols-2 gap-2">{store.vehicles.map(v => {
      const reason = days <= 0 ? 'Choose valid dates' : availability(store, v.plateNumber, form.startDate, form.endDate);
      return <label key={v.id} className={`p-3 border flex gap-3 items-start ${reason ? 'opacity-50 bg-gray-50' : form.vehiclePlate === v.plateNumber ? 'border-[#FF4F00] bg-orange-50' : 'border-black/15'}`}><input type="radio" required name="vehiclePlate" value={v.plateNumber} checked={form.vehiclePlate === v.plateNumber} disabled={!!reason} onChange={e => setForm({ ...form, vehiclePlate: e.target.value, dailyRate: '', depositAmount: '' })} /><span className="text-xs"><strong>{v.make} {v.model}</strong><br />{v.plateNumber} · {v.dailyRate.toLocaleString()}<br /><span>{reason || 'Available for these dates'}</span></span></label>;
    })}</div></fieldset>
    {!guest && <div className="grid grid-cols-2 gap-3"><Field label="Daily rate (LKR)"><input type="number" min="1" required name="dailyRate" value={form.dailyRate === '' ? vehicle?.dailyRate || '' : form.dailyRate} onChange={change} className={inputClass} /></Field><Field label="Security deposit (LKR)"><input type="number" min="0" required name="depositAmount" value={deposit} onChange={change} className={inputClass} /></Field></div>}
    {!guest && <div className="grid grid-cols-2 gap-3"><Field label="Advance collected (LKR)"><input type="number" min="0" required name="paidAmount" value={form.paidAmount} onChange={change} className={inputClass} /></Field><Field label="Payment method"><select name="paymentMethod" value={form.paymentMethod} onChange={change} className={inputClass}><option>Cash (LKR)</option><option>Bank Transfer</option><option>Credit Card</option></select></Field></div>}
    {guest && <Field label="Flight and airport delivery details"><input name="flightInfo" value={form.flightInfo} onChange={change} className={inputClass} /></Field>}
    <Field label="Special requests / notes"><textarea name="notes" value={form.notes} onChange={change} className={inputClass} /></Field>
    <div className="p-4 bg-gray-50 border text-sm space-y-1"><p>{days} days × LKR {rate.toLocaleString()} = <strong>LKR {(days * rate).toLocaleString()}</strong></p><p>Refundable security deposit: LKR {deposit.toLocaleString()}</p></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={!vehicle || days <= 0 || !!availability(store, form.vehiclePlate, form.startDate, form.endDate)} className={buttonClass}>Confirm early booking</button>
  </form>;
}

export function GuestPortal({ onClose }) {
  const [step, setStep] = useState(1);
  const [guest, setGuest] = useState(null);
  const [tourist, setTourist] = useState(false);
  const [booking, setBooking] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const input = (name, label, type = 'text', required = false) => <Field label={label}><input name={name} type={type} required={required} defaultValue={guest?.[name] || ''} className={inputClass} /></Field>;
  const voucher = booking ? `Hello Shenaly Rent a Car! Please confirm reservation ${booking.code}.\nProfile: ${booking.renterId}\nName: ${booking.renterName}\nVehicle: ${booking.vehiclePlate}\nDates: ${booking.startDate} to ${booking.endDate}\nRental: LKR ${booking.totalAmount}\nDeposit: LKR ${booking.depositAmount}` : '';
  return <div className="space-y-5">
    <p className="text-sm text-gray-600">Register and reserve in your browser. Demo bookings stay on this device; staff cannot receive bookings from other devices yet. Document files are selected for preview only.</p>
    <div className="flex gap-3 text-xs font-mono">{['1. Your details', '2. Vehicle & dates', '3. Confirmation'].map((s, i) => <span key={s} className={step === i + 1 ? 'text-[#FF4F00] font-bold' : 'text-gray-500'}>{s}</span>)}</div>
    {step === 1 && <form className="space-y-4" onSubmit={e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget));
      setGuest({ ...f, isTourist: tourist, country: tourist ? f.country : 'Sri Lanka', emergencyContact: { name: f.emergencyName, phone: f.emergencyPhone, relationship: f.relationship }, documents: tourist ? [{ type: 'Passport', number: f.identity, verified: false }, { type: f.permitType, number: f.license || 'Pending', verified: false }] : [{ type: 'National Identity Card (NIC)', number: f.identity, verified: false }, { type: 'Sri Lanka Driving License', number: f.license, verified: false }] }); setStep(2);
    }}>
      <Field label="Resident type"><select value={tourist ? 'tourist' : 'local'} onChange={e => setTourist(e.target.value === 'tourist')} className={inputClass}><option value="local">Sri Lankan resident</option><option value="tourist">International tourist</option></select></Field>
      <div className="grid sm:grid-cols-2 gap-3">{input('fullName', 'Full name', 'text', true)}{input('phone', 'Phone / WhatsApp', 'tel', true)}{input('email', 'Email', 'email', true)}{tourist && input('country', 'Country', 'text', true)}{input('address', tourist ? 'Hotel / local stay address' : 'Home address', 'text', true)}{input('identity', tourist ? 'Passport number' : 'NIC number', 'text', true)}{input('license', tourist ? 'Permit number (if issued)' : 'Driving license number', 'text', !tourist)}</div>
      {tourist && <Field label="Sri Lanka driving permit"><select name="permitType" defaultValue={guest?.permitType} className={inputClass}><option>International Driving Permit (AA Ceylon recognized)</option><option>DMT Airport Temporary Driving Permit</option><option>Need assistance with DMT Airport Permit</option></select></Field>}
      <div className="grid sm:grid-cols-2 gap-3"><DocumentPreview label={tourist ? 'Passport scan (preview only)' : 'NIC front & back (preview only)'} multiple /><DocumentPreview label="License / permit scan (preview only)" /></div>
      <div className="grid sm:grid-cols-3 gap-3">{input('emergencyName', 'Emergency contact name')}{input('emergencyPhone', 'Emergency phone', 'tel')}{input('relationship', 'Relationship')}</div>
      <button className={buttonClass}>Next: vehicle & dates</button>
    </form>}
    {step === 2 && <><p className="text-sm font-bold">Booking for {guest.fullName} · {guest.phone}</p><button className="text-xs underline" onClick={() => setStep(1)}>Edit personal details</button><BookingForm guest={guest} onComplete={b => { setBooking(b); setStep(3); }} /></>}
    {step === 3 && booking && <div className="space-y-4"><h3 className="text-xl font-bold text-emerald-700">Reservation saved</h3><div className="border p-4 space-y-2 text-sm"><p>Booking: <strong>{booking.code}</strong></p><p>Profile: {booking.renterId}</p><p>{booking.renterName} · {booking.renterPhone}</p><p>{booking.vehiclePlate}</p><p>{booking.startDate} → {booking.endDate} · {booking.days} days</p><p>Rental: LKR {booking.totalAmount.toLocaleString()}</p><p>Security deposit: LKR {booking.depositAmount.toLocaleString()}</p><p>{booking.notes}</p></div><button className={buttonClass} onClick={async () => { const message = `Hello Shenaly Rent a Car! Please confirm my reservation ${booking.code}.\nProfile: ${booking.renterId}\nName: ${booking.renterName}\nVehicle: ${booking.vehiclePlate}\nDates: ${booking.startDate} to ${booking.endDate}\nRental: LKR ${booking.totalAmount}\nDeposit: LKR ${booking.depositAmount}`; try { await navigator.clipboard.writeText(message); setCopyStatus('Voucher copied. Paste it into your WhatsApp conversation with Shenaly.'); } catch { setCopyStatus('Copy unavailable. Please save the voucher details above.'); } }}>Copy voucher for WhatsApp</button><a href={`https://wa.me/?text=${encodeURIComponent(voucher)}`} target="_blank" rel="noreferrer" className="block text-sm underline text-emerald-800">Share voucher via WhatsApp</a><p role="status" className="text-sm">{copyStatus}</p>{onClose && <button className="block underline text-sm" onClick={onClose}>Done</button>}</div>}
  </div>;
}
