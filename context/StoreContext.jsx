'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

import { reserve, checkIn, cancel, availability, duration } from '../lib/bookings.mjs';

const StoreContext = createContext(null);

const INITIAL_DATA = {
  currentUser: {
    id: 'usr-admin-01',
    name: 'Dinuka Silva',
    email: 'admin@shenalyrentacar.com',
    role: 'ADMIN',
    badgeNumber: 'SH-ADM-01'
  },
  vehicles: [
    {
      id: 'veh-raize',
      plateNumber: 'WP CBA-7706',
      make: 'Toyota',
      model: 'Raize SUV',
      year: 2025,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      dailyRateUSD: 75,
      dailyRate: 22500,
      depositAmount: 35000,
      mileage: 18400,
      status: 'AVAILABLE',
      thumbnail: 'https://shenalyrentacar.com/wp-content/uploads/2026/05/Toyota-Raize-2025.jpg',
      currentRenterId: null,
      notes: 'Compact 5-seater SUV, 5 Doors. Perfect for Hill Country & beach tours.'
    },
    {
      id: 'veh-yaris',
      plateNumber: 'WP CBF-9201',
      make: 'Toyota',
      model: 'Yaris Hatchback',
      year: 2025,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      dailyRateUSD: 55,
      dailyRate: 16500,
      depositAmount: 30000,
      mileage: 14200,
      status: 'RENTED',
      thumbnail: 'https://shenalyrentacar.com/wp-content/uploads/2026/05/Toyota-Yaris-2025.jpg',
      currentRenterId: 'SR-0147',
      notes: 'Modern fuel-efficient 4-door hatchback. High demand for tourist city travel.'
    },
    {
      id: 'veh-vezel',
      plateNumber: 'WP PE-1284',
      make: 'Honda',
      model: 'Vezel RS',
      year: 2025,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      dailyRateUSD: 80,
      dailyRate: 24000,
      depositAmount: 40000,
      mileage: 29500,
      status: 'RENTED',
      thumbnail: 'https://shenalyrentacar.com/wp-content/uploads/2026/05/Honda-vezel-2025.jpg',
      currentRenterId: 'SR-0146',
      notes: 'Premium 5-door crossover SUV. Spacious 5-seater with advanced safety tech.'
    },
    {
      id: 'veh-chr',
      plateNumber: 'WP CAD-4920',
      make: 'Toyota',
      model: 'C-HR Sport SUV',
      year: 2022,
      fuelType: 'Hybrid',
      transmission: 'Automatic',
      dailyRateUSD: 75,
      dailyRate: 22500,
      depositAmount: 35000,
      mileage: 41800,
      status: 'AVAILABLE',
      thumbnail: 'https://shenalyrentacar.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-12-at-9.59.03-AM.jpeg',
      currentRenterId: null,
      notes: 'Sporty compact SUV, 5 Seats. Elevated ride height for Island tours.'
    },
    {
      id: 'veh-premio',
      plateNumber: 'WP KX-9312',
      make: 'Toyota',
      model: 'Premio Executive',
      year: 2016,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      dailyRateUSD: 60,
      dailyRate: 18000,
      depositAmount: 35000,
      mileage: 78500,
      status: 'MAINTENANCE',
      thumbnail: 'https://shenalyrentacar.com/wp-content/uploads/2026/05/Toyota-Premio-2016.jpg',
      currentRenterId: null,
      notes: 'Executive comfortable sedan, 5 Seats. Scheduled suspension inspection.'
    },
    {
      id: 'veh-vitz',
      plateNumber: 'WP CAH-4821',
      make: 'Toyota',
      model: 'Vitz Compact',
      year: 2020,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      dailyRateUSD: 45,
      dailyRate: 13500,
      depositAmount: 25000,
      mileage: 52100,
      status: 'AVAILABLE',
      thumbnail: 'https://shenalyrentacar.com/wp-content/uploads/2025/06/Toyota-Vitz-2020.jpg',
      currentRenterId: null,
      notes: 'Reliable 5-seater hatchback with push start and ABS. Economical city rental.'
    }
  ],
  renters: [
    {
      id: 'rnt-guest-demo', profileId: 'SR-0150', fullName: 'Sophie Taylor',
      phone: '+44 7700 900123', email: 'sophie.taylor@london.co.uk',
      isTourist: true, country: 'United Kingdom', address: 'Airport pickup',
      source: 'Self-Registered (Online)', rentalsCount: 0,
      documents: [{ type: 'Passport', number: 'DEMO-PASSPORT', verified: false }, { type: 'AA Ceylon IDP Permit', number: 'Pending', verified: false }]
    },
    {
      id: 'rnt-01',
      profileId: 'SR-0146',
      fullName: 'Nimal Perera',
      phone: '+94 77 123 4567',
      email: 'nimal.perera@gmail.com',
      isTourist: false,
      country: 'Sri Lanka',
      address: 'No. 45/2, Galle Road, Colombo 03',
      documents: [
        { type: 'National Identity Card (NIC)', number: '198812304561', verified: true },
        { type: 'Sri Lanka Driving License', number: 'B3920194', verified: true }
      ],
      rentalsCount: 4
    },
    {
      id: 'rnt-02',
      profileId: 'SR-0147',
      fullName: 'David Miller',
      phone: '+44 7911 123456',
      email: 'david.miller@uktravel.co.uk',
      isTourist: true,
      country: 'United Kingdom',
      address: 'Room 412, Cinnamon Grand, Colombo',
      documents: [
        { type: 'Passport (United Kingdom)', number: 'GB9821034', verified: true },
        { type: 'International Driving Permit (AA Ceylon)', number: 'IDP-UK-984', verified: true },
        { type: 'DMT Airport Temporary Driving Permit', number: 'DMT-BIA-2026-491', verified: true }
      ],
      rentalsCount: 1
    },
    {
      id: 'rnt-03',
      profileId: 'SR-0148',
      fullName: 'Kavindi Wickramasinghe',
      phone: '+94 71 889 9234',
      email: 'kavindi.w@dialog.lk',
      isTourist: false,
      country: 'Sri Lanka',
      address: '12/4 Temple Road, Nugegoda',
      documents: [
        { type: 'National Identity Card (NIC)', number: '199578102391', verified: true },
        { type: 'Sri Lanka Driving License', number: 'B4829103', verified: true }
      ],
      rentalsCount: 2
    },
    {
      id: 'rnt-04',
      profileId: 'SR-0149',
      fullName: 'Jean-Luc Moreau',
      phone: '+33 6 12 34 56 78',
      email: 'jl.moreau@paris-voyages.fr',
      isTourist: true,
      country: 'France',
      address: 'Heritance Ahungalla Resort, Galle',
      documents: [
        { type: 'Passport (France)', number: 'FR84910234', verified: true },
        { type: 'DMT Airport Temporary Driving Permit', number: 'DMT-BIA-2026-582', verified: true }
      ],
      rentalsCount: 1
    }
  ],
  rentals: [
    {
      id: 'rent-reserved-demo', code: 'BK-2026-0043', vehiclePlate: 'WP CBA-7706',
      renterId: 'SR-0150', renterName: 'Sophie Taylor', renterPhone: '+44 7700 900123',
      days: 6, dailyRate: 22500, totalAmount: 135000, depositAmount: 35000,
      paidAmount: 35000, status: 'RESERVED', startDate: '2026-10-21', endDate: '2026-10-27',
      pickupInspection: null, dropInspection: null, bookingSource: 'Online Self-Registration',
      notes: 'Flight UL 504 arrival at BIA. Baby car seat requested.'
    },
    {
      id: 'rent-01',
      code: 'RNT-2026-0041',
      vehiclePlate: 'WP PE-1284',
      renterId: 'SR-0146',
      renterName: 'Nimal Perera',
      renterPhone: '+94 77 123 4567',
      days: 5,
      dailyRate: 24000,
      totalAmount: 120000,
      depositAmount: 40000,
      paidAmount: 120000,
      status: 'ACTIVE',
      startDate: '2026-10-01',
      endDate: '2026-10-06',
      startMileage: 28850,
      endMileage: 29500,
      mileageDriven: 650,
      pickupInspection: {
        timestamp: '2026-10-01 09:30 AM SLST',
        verifiedBy: 'Kasun Fernando',
        points: ['Front Bumper', 'Rear Tailgate', 'Driver Side', 'Passenger Side', 'Interior Seats', 'Odometer 28,850 KM']
      },
      dropInspection: null
    },
    {
      id: 'rent-02',
      code: 'RNT-2026-0042',
      vehiclePlate: 'WP CBF-9201',
      renterId: 'SR-0147',
      renterName: 'David Miller (Tourist)',
      renterPhone: '+44 7911 123456',
      days: 7,
      dailyRate: 16500,
      totalAmount: 115500,
      depositAmount: 30000,
      paidAmount: 80000,
      status: 'ACTIVE',
      startDate: '2026-09-30',
      endDate: '2026-10-07',
      startMileage: 13420,
      endMileage: 14200,
      mileageDriven: 780,
      pickupInspection: {
        timestamp: '2026-09-30 02:15 PM SLST',
        verifiedBy: 'Kasun Fernando',
        points: ['Front Bumper', 'Rear Tailgate', 'Driver Side', 'Passenger Side', 'Interior Seats', 'Odometer 13,420 KM']
      },
      dropInspection: null
    },
    {
      id: 'rent-03',
      code: 'RNT-2026-0040',
      vehiclePlate: 'WP KX-9312',
      renterId: 'SR-0148',
      renterName: 'Kavindi Wickramasinghe',
      renterPhone: '+94 71 889 9234',
      days: 4,
      dailyRate: 18000,
      totalAmount: 72000,
      depositAmount: 35000,
      paidAmount: 72000,
      status: 'COMPLETED',
      startDate: '2026-09-22',
      endDate: '2026-09-26',
      startMileage: 77620,
      endMileage: 78500,
      mileageDriven: 880,
      pickupInspection: {
        timestamp: '2026-09-22 10:00 AM SLST',
        verifiedBy: 'Dinuka Silva',
        points: ['Clean inspection']
      },
      dropInspection: {
        timestamp: '2026-09-26 05:45 PM SLST',
        verifiedBy: 'Dinuka Silva',
        points: ['Zero damage detected', 'Odometer 78,500 KM', 'Deposit refunded']
      }
    },
    {
      id: 'rent-04',
      code: 'RNT-2026-0038',
      vehiclePlate: 'WP CBA-7706',
      renterId: 'SR-0149',
      renterName: 'Jean-Luc Moreau (Tourist)',
      renterPhone: '+33 6 12 34 56 78',
      days: 6,
      dailyRate: 22500,
      totalAmount: 135000,
      depositAmount: 35000,
      paidAmount: 135000,
      status: 'COMPLETED',
      startDate: '2026-09-14',
      endDate: '2026-09-20',
      startMileage: 17260,
      endMileage: 18400,
      mileageDriven: 1140,
      pickupInspection: {
        timestamp: '2026-09-14 09:00 AM SLST',
        verifiedBy: 'Kasun Fernando',
        points: ['Condition pristine']
      },
      dropInspection: {
        timestamp: '2026-09-20 04:30 PM SLST',
        verifiedBy: 'Kasun Fernando',
        points: ['Hill country tour completed, zero scratches']
      }
    },
    {
      id: 'rent-05',
      code: 'RNT-2026-0035',
      vehiclePlate: 'WP CAH-4821',
      renterId: 'SR-0146',
      renterName: 'Nimal Perera',
      renterPhone: '+94 77 123 4567',
      days: 3,
      dailyRate: 13500,
      totalAmount: 40500,
      depositAmount: 25000,
      paidAmount: 40500,
      status: 'COMPLETED',
      startDate: '2026-09-10',
      endDate: '2026-09-13',
      startMileage: 51680,
      endMileage: 52100,
      mileageDriven: 420,
      pickupInspection: {
        timestamp: '2026-09-10 08:30 AM SLST',
        verifiedBy: 'Dinuka Silva',
        points: ['Standard pickup inspection']
      },
      dropInspection: {
        timestamp: '2026-09-13 06:00 PM SLST',
        verifiedBy: 'Dinuka Silva',
        points: ['Normal return, fuel tank full']
      }
    },
    {
      id: 'rent-06',
      code: 'RNT-2026-0032',
      vehiclePlate: 'WP CAD-4920',
      renterId: 'SR-0147',
      renterName: 'David Miller (Tourist)',
      renterPhone: '+44 7911 123456',
      days: 4,
      dailyRate: 22500,
      totalAmount: 90000,
      depositAmount: 35000,
      paidAmount: 90000,
      status: 'COMPLETED',
      startDate: '2026-09-02',
      endDate: '2026-09-06',
      startMileage: 40950,
      endMileage: 41800,
      mileageDriven: 850,
      pickupInspection: {
        timestamp: '2026-09-02 11:00 AM SLST',
        verifiedBy: 'Kasun Fernando',
        points: ['C-HR exterior immaculate']
      },
      dropInspection: {
        timestamp: '2026-09-06 05:00 PM SLST',
        verifiedBy: 'Kasun Fernando',
        points: ['Clean return, deposit released']
      }
    }
  ],
  payments: [
    {
      id: 'pmt-reserved-demo', receiptNo: 'ADV-2026-0043', date: '2026-10-17',
      renterName: 'Sophie Taylor', rentalCode: 'BK-2026-0043', method: 'Bank Transfer',
      type: 'Booking Advance', amount: 35000, receivedBy: 'Dinuka Silva'
    },
    {
      id: 'pmt-01',
      receiptNo: 'RCPT-2026-0090',
      date: '2026-10-01',
      renterName: 'Nimal Perera',
      rentalCode: 'RNT-2026-0041',
      method: 'Cash (LKR)',
      type: 'Full Rental Settlement',
      amount: 32500,
      receivedBy: 'Kasun Fernando'
    },
    {
      id: 'pmt-02',
      receiptNo: 'RCPT-2026-0091',
      date: '2026-09-30',
      renterName: 'David Miller',
      rentalCode: 'RNT-2026-0042',
      method: 'Bank Transfer (Commercial Bank)',
      type: 'Advance Deposit & Partial Rental',
      amount: 80000,
      receivedBy: 'Dinuka Silva'
    },
    {
      id: 'pmt-03',
      receiptNo: 'RCPT-2026-0089',
      date: '2026-09-25',
      renterName: 'Kavindi Wickramasinghe',
      rentalCode: 'RNT-2026-0040',
      method: 'Credit Card POS Slip',
      type: 'Rental Settlement',
      amount: 42000,
      receivedBy: 'Dinuka Silva'
    }
  ],
  costs: [
    {
      id: 'cst-01',
      date: '2026-09-20',
      vehiclePlate: 'WP CAH-4821',
      category: 'Routine Maintenance',
      title: '50,000 KM Engine Oil & Genuine Oil Filter Replacement',
      workshop: 'Auto Mirage Moratuwa (INV-4921)',
      amount: 14500,
      invoiceRef: 'INV-4921',
      odometer: 50200,
      hasBill: true
    },
    {
      id: 'cst-02',
      date: '2026-09-24',
      vehiclePlate: 'WP KX-9312',
      category: 'Suspension & Bushing',
      title: 'Front Lower Arm Bushings & Wheel Alignment Check',
      workshop: 'Toyota Lanka Wattala (INV-98213)',
      amount: 38000,
      invoiceRef: 'TL-98213',
      odometer: 78100,
      hasBill: true
    },
    {
      id: 'cst-03',
      date: '2026-09-15',
      vehiclePlate: 'WP PE-1284',
      category: 'Commercial Insurance',
      title: 'Quarterly Commercial Hire Policy Insurance Premium',
      workshop: 'Sri Lanka Insurance Corp (SLIC)',
      amount: 32000,
      invoiceRef: 'SLIC-POL-2940',
      odometer: 28500,
      hasBill: true
    },
    {
      id: 'cst-04',
      date: '2026-09-12',
      vehiclePlate: 'WP CBA-7706',
      category: 'Routine Maintenance',
      title: '15,000 KM Periodic Service & Synthetic Oil Change',
      workshop: 'Toyota Lanka Negombo (INV-4412)',
      amount: 18500,
      invoiceRef: 'TL-NEG-4412',
      odometer: 15100,
      hasBill: true
    },
    {
      id: 'cst-05',
      date: '2026-09-18',
      vehiclePlate: 'WP CBF-9201',
      category: 'Brake Service',
      title: 'Front Disc Brake Pads & Caliper Pin Lubrication',
      workshop: 'Auto Care Express Colombo 03',
      amount: 16500,
      invoiceRef: 'AC-COL-8921',
      odometer: 13100,
      hasBill: true
    },
    {
      id: 'cst-06',
      date: '2026-09-01',
      vehiclePlate: 'WP CAD-4920',
      category: 'Routine Maintenance',
      title: '40,000 KM Hybrid Inverter Coolant & Engine Oil Service',
      workshop: 'Toyota Lanka Wattala (INV-89102)',
      amount: 24500,
      invoiceRef: 'TL-89102',
      odometer: 40200,
      hasBill: true
    }
  ],
  fuelLogs: [
    {
      id: 'fl-01',
      vehiclePlate: 'WP CBA-7706',
      date: '2026-10-02',
      liters: 36,
      pricePerLiter: 414,
      totalCost: 14904,
      station: 'Ceypetco Fuel Station, Negombo Road',
      odometer: 18350
    },
    {
      id: 'fl-02',
      vehiclePlate: 'WP CBA-7706',
      date: '2026-09-18',
      liters: 32,
      pricePerLiter: 414,
      totalCost: 13248,
      station: 'Lanka IOC, Airport Access Road, Katunayake',
      odometer: 17800
    },
    {
      id: 'fl-03',
      vehiclePlate: 'WP CBF-9201',
      date: '2026-09-29',
      liters: 35,
      pricePerLiter: 414,
      totalCost: 14490,
      station: 'Sinopec Station, Colombo 07',
      odometer: 13900
    },
    {
      id: 'fl-04',
      vehiclePlate: 'WP PE-1284',
      date: '2026-10-01',
      liters: 40,
      pricePerLiter: 414,
      totalCost: 16560,
      station: 'Ceypetco Filling Station, Moratuwa',
      odometer: 29200
    },
    {
      id: 'fl-05',
      vehiclePlate: 'WP KX-9312',
      date: '2026-09-23',
      liters: 42,
      pricePerLiter: 414,
      totalCost: 17388,
      station: 'Lanka IOC, Kandy Road, Kadawatha',
      odometer: 78200
    },
    {
      id: 'fl-06',
      vehiclePlate: 'WP CAH-4821',
      date: '2026-09-11',
      liters: 28,
      pricePerLiter: 414,
      totalCost: 11592,
      station: 'Ceypetco, Galle Road, Colombo 04',
      odometer: 51900
    },
    {
      id: 'fl-07',
      vehiclePlate: 'WP CAD-4920',
      date: '2026-09-04',
      liters: 38,
      pricePerLiter: 414,
      totalCost: 15732,
      station: 'Sinopec, Marine Drive, Bambalapitiya',
      odometer: 41400
    }
  ]
};

export function StoreProvider({ children }) {
  const [data, setData] = useState(INITIAL_DATA);
  const dataRef = useRef(INITIAL_DATA);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('shenaly_swiss_store_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.vehicles && parsed.vehicles.some((v) => v.id === 'veh-raize') && parsed.fuelLogs) {
          dataRef.current = parsed;
          setData(parsed);
        } else {
          localStorage.setItem('shenaly_swiss_store_v3', JSON.stringify(INITIAL_DATA));
          setData(INITIAL_DATA);
        }
      } catch (err) {
        console.error('Failed to parse saved state:', err);
      }
    } else {
      localStorage.setItem('shenaly_swiss_store_v3', JSON.stringify(INITIAL_DATA));
      setData(INITIAL_DATA);
    }
    setIsLoaded(true);
  }, []);

  const persist = (updater) => {
    const next = typeof updater === 'function' ? updater(dataRef.current) : updater;
    localStorage.setItem('shenaly_swiss_store_v3', JSON.stringify(next));
    dataRef.current = next;
    setData(next);
  };

  const createReservation = (input, guest) => {
    const result = reserve(dataRef.current, input, guest);
    persist(result.data);
    return result.booking;
  };
  const checkInReservation = (id) => persist(prev => checkIn(prev, id));
  const cancelReservation = (id) => persist(prev => cancel(prev, id));

  const switchRole = (role) => {
    persist((prev) => ({
      ...prev,
      currentUser: role === 'ADMIN' ? {
        id: 'usr-admin-01',
        name: 'Dinuka Silva',
        email: 'admin@shenalyrentacar.com',
        role: 'ADMIN',
        badgeNumber: 'SH-ADM-01'
      } : {
        id: 'usr-staff-02',
        name: 'Kasun Fernando',
        email: 'kasun.operations@shenaly.lk',
        role: 'STAFF',
        badgeNumber: 'SH-OPS-04'
      }
    }));
  };

  const addVehicle = (vehicle) => {
    persist((prev) => ({
      ...prev,
      vehicles: [
        {
          id: `veh-${Date.now()}`,
          currentRenterId: null,
          thumbnail: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
          ...vehicle
        },
        ...prev.vehicles
      ]
    }));
  };

  const addRenter = (renter) => {
    persist((prev) => {
      const nextId = `SR-${String(Math.max(145, ...prev.renters.map(r => Number(r.profileId.replace('SR-', '')) || 0)) + 1).padStart(4, '0')}`;
      return {
        ...prev,
        renters: [
          {
            id: `rnt-${Date.now()}`,
            profileId: nextId,
            rentalsCount: 0,
            ...renter
          },
          ...prev.renters
        ]
      };
    });
  };

  const createRental = (rental) => {
    persist((prev) => {
      duration(rental.startDate, rental.endDate);
      const conflict = availability(prev, rental.vehiclePlate, rental.startDate, rental.endDate);
      if (conflict) throw new Error(conflict);
      const vehicle = prev.vehicles.find(v => v.plateNumber === rental.vehiclePlate);
      if (vehicle.status !== 'AVAILABLE') throw new Error('Vehicle must be available for dispatch.');
      const updatedVehicles = prev.vehicles.map(v => {
        if (v.plateNumber === rental.vehiclePlate) {
          return { ...v, status: 'RENTED', currentRenterId: rental.renterId };
        }
        return v;
      });

      const updatedRenters = prev.renters.map(r => {
        if (r.profileId === rental.renterId) {
          return { ...r, rentalsCount: (r.rentalsCount || 0) + 1 };
        }
        return r;
      });

      const newRental = {
        id: `rent-${Date.now()}`,
        code: `RNT-2026-00${40 + prev.rentals.length + 1}`,
        status: 'ACTIVE',
        paidAmount: 0,
        pickupInspection: {
          timestamp: new Date().toLocaleString('en-GB') + ' SLST',
          verifiedBy: prev.currentUser.name,
          points: ['6-point condition photos verified', 'Initial odometer logged']
        },
        dropInspection: null,
        ...rental
      };

      return {
        ...prev,
        vehicles: updatedVehicles,
        renters: updatedRenters,
        rentals: [newRental, ...prev.rentals]
      };
    });
  };

  const returnRental = (rentalId) => {
    persist((prev) => {
      const rental = prev.rentals.find(r => r.id === rentalId);
      if (!rental || rental.status !== 'ACTIVE') return prev;

      const updatedRentals = prev.rentals.map(r => {
        if (r.id === rentalId) {
          return {
            ...r,
            status: 'COMPLETED',
            dropInspection: {
              timestamp: new Date().toLocaleString('en-GB') + ' SLST',
              verifiedBy: prev.currentUser.name,
              points: ['Drop inspection recorded', 'Deposit reconciled']
            }
          };
        }
        return r;
      });

      const updatedVehicles = prev.vehicles.map(v => {
        if (v.plateNumber === rental.vehiclePlate) {
          return { ...v, status: 'AVAILABLE', currentRenterId: null };
        }
        return v;
      });

      return {
        ...prev,
        rentals: updatedRentals,
        vehicles: updatedVehicles
      };
    });
  };

  const recordPayment = (payment) => {
    persist((prev) => {
      const rental = prev.rentals.find(r => r.code === payment.rentalCode);
      if (!rental || rental.status === 'CANCELLED') throw new Error('Select an open or completed rental.');
      if (!Number.isFinite(Number(payment.amount)) || Number(payment.amount) <= 0) throw new Error('Payment must be greater than zero.');
      if (rental.status === 'RESERVED' && Number(payment.amount) + (rental.paidAmount || 0) > rental.totalAmount + rental.depositAmount) throw new Error('Advance exceeds the outstanding rental and deposit total.');
      const newPayment = {
        id: `pmt-${Date.now()}`,
        receiptNo: `RCPT-2026-00${90 + prev.payments.length + 1}`,
        date: new Date().toISOString().slice(0, 10),
        receivedBy: prev.currentUser.name,
        ...payment
      };

      const updatedRentals = prev.rentals.map(r => {
        if (r.code === payment.rentalCode) {
          return { ...r, paidAmount: (r.paidAmount || 0) + Number(payment.amount) };
        }
        return r;
      });

      return {
        ...prev,
        rentals: updatedRentals,
        payments: [newPayment, ...prev.payments]
      };
    });
  };

  const addCost = (cost) => {
    persist((prev) => ({
      ...prev,
      costs: [
        {
          id: `cst-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          hasBill: true,
          ...cost
        },
        ...prev.costs
      ]
    }));
  };

  const deleteCost = (costId) => {
    persist((prev) => ({
      ...prev,
      costs: prev.costs.filter(c => c.id !== costId)
    }));
  };

  const addFuelLog = (fuelLog) => {
    persist((prev) => ({
      ...prev,
      fuelLogs: [
        {
          id: `fl-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          ...fuelLog
        },
        ...(prev.fuelLogs || [])
      ]
    }));
  };

  const resetDemoData = () => {
    localStorage.removeItem('shenaly_swiss_store_v1');
    localStorage.removeItem('shenaly_swiss_store_v2');
    localStorage.removeItem('shenaly_swiss_store_v3');
    persist(INITIAL_DATA);
  };

  const exportDataJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shenaly-operations-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <StoreContext.Provider
      value={{
        ...data,
        isLoaded,
        switchRole,
        addVehicle,
        addRenter,
        createRental,
        createReservation,
        checkInReservation,
        cancelReservation,
        returnRental,
        recordPayment,
        addCost,
        deleteCost,
        addFuelLog,
        resetDemoData,
        exportDataJson
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
