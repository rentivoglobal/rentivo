import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uovlgngsmvjcgkgznyme.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvdmxnbmdzbXZqY2drZ3pueW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzODE3NzQsImV4cCI6MjEwNTk1Nzc3NH0.jcRnuZMbQ0p9d4oxSCZvc8OSfX6gfruYEvS_bJ89cTY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runWriteTest() {
  console.log('--- TESTING WRITE PATH TO SUPABASE ---');

  // 1. Sign in as lister
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'lister@rentivo.ng',
    password: 'RentivoLister1'
  });
  if (authErr) throw authErr;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } }
  });

  // 2. Fetch city & area
  const { data: city } = await client.from('cities').select('id').eq('slug', 'ibadan').single();
  const { data: area } = await client.from('areas').select('id').eq('slug', 'bodija').single();

  // 3. Insert listing as draft
  const { data: inserted, error: insErr } = await client
    .from('listings')
    .insert({
      owner_user_id: auth.user.id,
      title: 'Automated Test Flat Bodija',
      description: 'Test flat created to verify write pipeline between frontend and cloud backend.',
      category: 'residential',
      property_type: 'flat_apartment',
      status: 'pending_approval',
      is_approved: false,
      price_amount: 120000000,
      billing_period: 'per_year',
      city_id: city.id,
      area_id: area.id,
      address_summary: 'Bodija, Ibadan',
      bedrooms: 2,
      bathrooms: 2,
      size_sqm: 80,
      amenities: ['Borehole', 'Prepaid Meter']
    })
    .select('id, title')
    .single();

  if (insErr) {
    console.error('[FAIL] Write insertion failed:', insErr);
    process.exit(1);
  }
  console.log(`[PASS] Write Test: Successfully inserted new listing into Supabase database (ID: ${inserted.id}).`);

  // 4. Clean up test listing
  await client.from('listings').delete().eq('id', inserted.id);
  console.log(`[PASS] Cleanup: Deleted temporary test listing.`);
  console.log('--- WRITE PATH VERIFIED SUCCESSFULLY ---');
}

runWriteTest();
