// Demo accounts for local testing and demo mode. All share the password below, which is public,
// so they're only created in demo mode (and drivers.js never lets them take jobs outside it).
import { DEMO } from './env.js';
import { db } from './db.js';
import { hashPassword } from './auth.js';

if (!DEMO) {
  console.log('Demo mode is off: not seeding demo accounts.');
  process.exit(0);
}

const PASSWORD = 'plowdemo123';

const users = [
  { role: 'customer', name: 'Jamie Lindqvist', email: 'customer@plowbird.test', phone: '612-555-0142' },
  { role: 'driver', name: 'Mike Halvorson', email: 'driver@plowbird.test', phone: '612-555-0199', vehicle: '2019 F-250 · 8ft Boss V-plow', lat: 44.99, lng: -93.25 },
  { role: 'driver', name: 'Dana Ostrander', email: 'driver2@plowbird.test', phone: '605-555-0117', vehicle: 'Ram 2500 · Western straight blade', lat: 43.55, lng: -96.73 },
];

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (role, name, email, phone, password_hash, vehicle, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
);
for (const u of users) insertUser.run(u.role, u.name, u.email, u.phone, hashPassword(PASSWORD), u.vehicle ?? null, u.lat ?? null, u.lng ?? null);
db.prepare("UPDATE users SET driver_status = 'approved' WHERE role = 'driver' AND email LIKE '%@plowbird.test' AND driver_status IS NULL").run();

const customer = db.prepare('SELECT id FROM users WHERE email = ?').get('customer@plowbird.test');
if (!db.prepare('SELECT 1 FROM properties WHERE user_id = ?').get(customer.id)) {
  const add = db.prepare(
    'INSERT INTO properties (user_id, label, address, lat, lng, size, length, sidewalk, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  add.run(customer.id, 'Home', '3400 N 2ND ST, MINNEAPOLIS, MN, 55412', 45.0167, -93.2809, 'double', 'standard', 1, 'Gate code 4411. Please push snow to the left side, away from the mailbox.');
  add.run(customer.id, 'Cabin', '101 S PHILLIPS AVE, SIOUX FALLS, SD, 57104', 43.5473, -96.7269, 'triple', 'long', 0, null);
}

console.log(`Seeded demo accounts (password: ${PASSWORD}):`);
for (const u of users) console.log(`  ${u.role.padEnd(8)} ${u.email}`);
