import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uovlgngsmvjcgkgznyme.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvdmxnbmdzbXZqY2drZ3pueW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzODE3NzQsImV4cCI6MjEwNTk1Nzc3NH0.jcRnuZMbQ0p9d4oxSCZvc8OSfX6gfruYEvS_bJ89cTY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTests() {
  console.log('--- STARTING BACKEND INTEGRATION TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  // Test 1: Fetch cities and areas
  try {
    const { data: cities, error: cErr } = await supabase.from('cities').select('id, name, slug').eq('slug', 'ibadan');
    if (cErr) throw cErr;
    const { data: areas, error: aErr } = await supabase.from('areas').select('id, name, slug').limit(5);
    if (aErr) throw aErr;
    console.log(`[PASS] Test 1 (Cities & Areas): Found Ibadan (id: ${cities[0]?.id}) with ${areas.length} sampled areas.`);
    passed++;
  } catch (err) {
    console.error('[FAIL] Test 1 (Cities & Areas):', err);
    failed++;
  }

  // Test 2: Fetch Active Listings
  try {
    const { data: listings, error: lErr } = await supabase
      .from('listings')
      .select('id, title, price_amount, status, is_approved, cities(name), areas(name), listing_photos(url)')
      .eq('status', 'active')
      .eq('is_approved', true);
    if (lErr) throw lErr;
    console.log(`[PASS] Test 2 (Listings Query): Found ${listings?.length} active approved listings.`);
    listings?.forEach((l) => console.log(`       - ${l.title} (${l.areas?.name}): NGN ${l.price_amount / 100}`));
    passed++;
  } catch (err) {
    console.error('[FAIL] Test 2 (Listings Query):', err);
    failed++;
  }

  // Test 3: Fetch Listing prop-1 by UUID
  try {
    const { data: prop1, error: pErr } = await supabase
      .from('listings')
      .select('id, title, description, price_amount, listing_photos(url), users:owner_user_id(full_name, agency_name)')
      .eq('id', '11111111-1111-1111-1111-111111111111')
      .single();
    if (pErr) throw pErr;
    console.log(`[PASS] Test 3 (Single Listing prop-1): Loaded "${prop1.title}" owned by ${prop1.users?.full_name} (${prop1.users?.agency_name}).`);
    passed++;
  } catch (err) {
    console.error('[FAIL] Test 3 (Single Listing prop-1):', err);
    failed++;
  }

  // Test 4: Supabase Auth Sign In (Lister)
  let listerClient = supabase;
  try {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'lister@rentivo.ng',
      password: 'RentivoLister1'
    });
    if (authErr) throw authErr;
    console.log(`[PASS] Test 4 (Auth SignIn): Signed in as ${authData.user.email} (UUID: ${authData.user.id}).`);
    listerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
    });
    passed++;
  } catch (err) {
    console.error('[FAIL] Test 4 (Auth SignIn):', err);
    failed++;
  }

  // Test 5: Lister can view private details of their own listing
  try {
    const { data: priv, error: privErr } = await listerClient
      .from('listing_private_details')
      .select('*')
      .eq('listing_id', '11111111-1111-1111-1111-111111111111')
      .single();
    if (privErr) throw privErr;
    console.log(`[PASS] Test 5 (Private Details RLS): Lister successfully retrieved exact address: "${priv.address_full}".`);
    passed++;
  } catch (err) {
    console.error('[FAIL] Test 5 (Private Details RLS):', err);
    failed++;
  }

  // Test 6: ImageKit Auth Edge Function
  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('imagekit-auth');
    if (edgeErr) throw edgeErr;
    if (!edgeData?.signature || !edgeData?.token || !edgeData?.expire) {
      throw new Error(`Incomplete auth payload from imagekit-auth: ${JSON.stringify(edgeData)}`);
    }
    console.log(`[PASS] Test 6 (ImageKit Auth Edge Function): Received valid HMAC signature and token.`);
    passed++;
  } catch (err) {
    console.error('[FAIL] Test 6 (ImageKit Auth Edge Function):', err);
    failed++;
  }

  // Test 7: Promo Stats RPC
  try {
    const { data: promo, error: promoErr } = await supabase.rpc('get_promo_stats');
    if (promoErr) throw promoErr;
    console.log(`[PASS] Test 7 (Promo Stats RPC): Cap ${promo.total}, Remaining: ${promo.remaining}, Active: ${promo.isActive}.`);
    passed++;
  } catch (err) {
    console.error('[FAIL] Test 7 (Promo Stats RPC):', err);
    failed++;
  }

  console.log('--- TEST SUMMARY ---');
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
