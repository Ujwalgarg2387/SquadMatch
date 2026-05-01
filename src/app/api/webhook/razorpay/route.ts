import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  // ── Bug fix 1: use RAZORPAY_WEBHOOK_SECRET, not KEY_SECRET ───
  // These are two different secrets. KEY_SECRET signs API requests
  // you make TO Razorpay. WEBHOOK_SECRET signs events Razorpay
  // sends TO you. Using the wrong one means every webhook returns
  // 400 and Razorpay retries forever without ever updating the DB.
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  if (expectedSig !== signature) {
    console.error('Razorpay webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)
  console.log('Razorpay webhook event:', event.event)

  if (event.event === 'payment.captured') {
    const payment  = event.payload.payment.entity
    const orderId  = payment.order_id
    const paymentId = payment.id

    console.log('Processing payment capture — orderId:', orderId, 'paymentId:', paymentId)

    // ── Bug fix 2: use service-role client, not anon client ───────
    // Razorpay calls this endpoint with no browser session — no cookies,
    // no auth.uid(). The anon client has auth.uid() = null so every
    // RLS policy that checks auth.uid() silently rejects the query.
    // The admin client uses the service-role key which bypasses RLS.
    const supabase = createAdminSupabaseClient()

    // Find the pending payment row created by /api/subscribe
    const { data: pending, error: findErr } = await supabase
      .from('subscription_payments')
      .select('profile_id')
      .eq('razorpay_order_id', orderId)
      .single()

    if (findErr || !pending) {
      // This happens if /api/subscribe failed to insert the row,
      // or if orderId doesn't match. Log and still return 200 so
      // Razorpay doesn't keep retrying a permanently broken event.
      console.error('No pending payment found for orderId:', orderId, findErr?.message)
      return NextResponse.json({ received: true, warning: 'order not found' })
    }

    // Mark payment as captured — check for errors explicitly
    const { error: updatePaymentErr } = await supabase
      .from('subscription_payments')
      .update({ status: 'captured', razorpay_payment_id: paymentId })
      .eq('razorpay_order_id', orderId)

    if (updatePaymentErr) {
      console.error('Failed to update subscription_payments:', updatePaymentErr.message)
    }

    // Upgrade user to Pro for 30 days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error: upgradeErr } = await supabase
      .from('profiles')
      .update({
        subscription: 'pro',
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq('id', pending.profile_id)

    if (upgradeErr) {
      console.error('Failed to upgrade profile to pro:', upgradeErr.message)
      return NextResponse.json({ error: 'Profile upgrade failed' }, { status: 500 })
    }

    console.log('Successfully upgraded profile', pending.profile_id, 'to Pro until', expiresAt)
  }

  return NextResponse.json({ received: true })
}