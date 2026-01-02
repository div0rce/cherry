#!/usr/bin/env node

const databaseUrl = process.env['DATABASE_URL'];
if (databaseUrl === undefined || databaseUrl === '') {
  process.stdout.write('check:db skipped (DATABASE_URL missing)\n');
} else {
  process.stdout.write('check:db ok (DATABASE_URL set)\n');
}
