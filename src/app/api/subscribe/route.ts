import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Razorpay from 'razorpay'
import { PRO_PRICE_PAISE } from '@/types'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const order = await razorpay.orders.create({
      amount:   PRO_PRICE_PAISE,
      currency: 'INR',
      notes:    { user_id: user.id },
    })

    // Record pending payment
    await supabase.from('subscription_payments').insert({
      profile_id:        user.id,
      razorpay_order_id: order.id,
      amount_paise:      PRO_PRICE_PAISE,
      status:            'pending',
    })

    return NextResponse.json({ order_id: order.id, amount: PRO_PRICE_PAISE })
  } catch (err) {
    console.error('Razorpay order error:', err)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
