import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  console.log('\n========== /api/verify-payment called ==========')

  // ── Step 1: Auth check ────────────────────────────────────────
  const userSupabase = createServerSupabaseClient()
  const { data: { user }, error: authErr } = await userSupabase.auth.getUser()
  // console.log('Step 1 - Auth:', user ? `user=${user.id}` : `NO USER — error: ${authErr?.message}`)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', detail: authErr?.message }, { status: 401 })
  }

  // ── Step 2: Parse body ────────────────────────────────────────
  let body: any
  try {
    body = await req.json()
  } catch (e) {
    console.log('Step 2 - Body parse FAILED:', e)
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body
  // console.log('Step 2 - Body:', {
  //   razorpay_payment_id: razorpay_payment_id ?? 'MISSING',
  //   razorpay_order_id:   razorpay_order_id   ?? 'MISSING',
  //   razorpay_signature:  razorpay_signature   ? razorpay_signature.slice(0, 8) + '…' : 'MISSING',
  // })

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment fields', received: { razorpay_payment_id: !!razorpay_payment_id, razorpay_order_id: !!razorpay_order_id, razorpay_signature: !!razorpay_signature } }, { status: 400 })
  }

  // ── Step 3: Env var check ─────────────────────────────────────
  const keySecret      = process.env.RAZORPAY_KEY_SECRET
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL
  // console.log('Step 3 - Env vars:', {
  //   RAZORPAY_KEY_SECRET:      keySecret      ? `set (${keySecret.length} chars)` : 'MISSING ❌',
  //   SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey ? `set (${serviceRoleKey.length} chars)` : 'MISSING ❌',
  //   NEXT_PUBLIC_SUPABASE_URL:  supabaseUrl    ? 'set' : 'MISSING ❌',
  // })

  if (!keySecret) {
    return NextResponse.json({ error: 'Server misconfigured: RAZORPAY_KEY_SECRET not set' }, { status: 500 })
  }
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  // ── Step 4: Signature verification ───────────────────────────
  // Razorpay signs: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
  const expectedSig = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  const sigMatch = expectedSig === razorpay_signature
  // console.log('Step 4 - Signature match:', sigMatch)
  if (!sigMatch) {
    // console.log('  expected:', expectedSig.slice(0, 16) + '…')
    // console.log('  received:', razorpay_signature.slice(0, 16) + '…')
    return NextResponse.json({ error: 'Invalid payment signature — check RAZORPAY_KEY_SECRET matches your Razorpay dashboard key' }, { status: 400 })
  }

  // ── Step 5: Look up the pending payment row ───────────────────
  const { data: pendingPayment, error: lookupErr } = await userSupabase
    .from('subscription_payments')
    .select('id, profile_id, status')
    .eq('razorpay_order_id', razorpay_order_id)
    .single()

  // console.log('Step 5 - Pending payment lookup:', pendingPayment ?? `NOT FOUND — ${lookupErr?.message}`)

  if (!pendingPayment) {
    return NextResponse.json({ error: 'Order not found in DB', detail: lookupErr?.message }, { status: 404 })
  }

  if (pendingPayment.profile_id !== user.id) {
    // console.log('Step 5 - Order ownership mismatch:', pendingPayment.profile_id, '!==', user.id)
    return NextResponse.json({ error: 'Order does not belong to this user' }, { status: 403 })
  }

  // Idempotency guard
  if (pendingPayment.status === 'captured') {
    // console.log('Step 5 - Already captured, returning early')
    return NextResponse.json({ success: true, already_captured: true })
  }

  // ── Step 6: Update subscription_payments ─────────────────────
  const admin = createAdminSupabaseClient()

  const { error: paymentUpdateErr } = await admin
    .from('subscription_payments')
    .update({ status: 'captured', razorpay_payment_id })
    .eq('id', pendingPayment.id)

  // console.log('Step 6 - subscription_payments update:', paymentUpdateErr ? `FAILED — ${paymentUpdateErr.message} (code: ${paymentUpdateErr.code})` : 'OK ✓')

  if (paymentUpdateErr) {
    return NextResponse.json({ error: 'Failed to update payment row', detail: paymentUpdateErr.message, code: paymentUpdateErr.code }, { status: 500 })
  }

  // ── Step 7: Upgrade profile ───────────────────────────────────
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const { error: profileUpdateErr } = await admin
    .from('profiles')
    .update({ subscription: 'pro', subscription_expires_at: expiresAt.toISOString() })
    .eq('id', user.id)

  // console.log('Step 7 - profiles update:', profileUpdateErr ? `FAILED — ${profileUpdateErr.message} (code: ${profileUpdateErr.code})` : 'OK ✓')
  // console.log('=================================================\n')

  if (profileUpdateErr) {
    return NextResponse.json({ error: 'Failed to upgrade profile', detail: profileUpdateErr.message, code: profileUpdateErr.code }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}