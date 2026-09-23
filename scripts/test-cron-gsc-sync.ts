import { GET } from '../app/api/cron/gsc-sync/route';
import { NextRequest } from 'next/server';

process.env.CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret-key-32-chars-long';

async function testCronGscSync() {
  console.log('=== TEST 1: Missing Authorization Header ===');
  const req1 = new NextRequest('http://localhost:3000/api/cron/gsc-sync', {
    method: 'GET',
  });
  const res1 = await GET(req1);
  console.log('Status:', res1.status, '(expected 401)');
  const json1 = await res1.json();
  console.log('Error:', json1.error);

  console.log('\n=== TEST 2: Invalid Bearer Token ===');
  const req2 = new NextRequest('http://localhost:3000/api/cron/gsc-sync', {
    method: 'GET',
    headers: { Authorization: 'Bearer evil_token_12345' },
  });
  const res2 = await GET(req2);
  console.log('Status:', res2.status, '(expected 401)');
  const json2 = await res2.json();
  console.log('Error:', json2.error);

  console.log('\n=== TEST 3: Valid Bearer Token ===');
  const cronSecret = process.env.CRON_SECRET || 'test-cron-secret';
  const req3 = new NextRequest('http://localhost:3000/api/cron/gsc-sync', {
    method: 'GET',
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const res3 = await GET(req3);
  console.log('Status:', res3.status, '(expected 200)');
  const json3 = await res3.json();
  console.log('Response:', {
    success: json3.success,
    status: json3.status,
    message: json3.message,
    recordsImported: json3.recordsImported,
  });
}

testCronGscSync();
