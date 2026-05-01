'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { PRO_PRICE_DISPLAY } from '@/types'

declare global {
  interface Window { Razorpay: any }
}

export default function UpgradePage() {
  const [loading, setLoading]         = useState(false)
  const [verifying, setVerifying]     = useState(false)
  const router = useRouter()

  async function handleUpgrade() {
    setLoading(true)

    // Load Razorpay JS SDK on demand
    if (!window.Razorpay) {
      try {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://checkout.razorpay.com/v1/checkout.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Razorpay SDK'))
          document.body.appendChild(script)
        })
      } catch {
        toast.error('Could not load payment SDK. Check your connection.')
        setLoading(false)
        return
      }
    }

    // Create order server-side — inserts pending row in subscription_payments
    const res = await fetch('/api/subscribe', { method: 'POST' })
    const { order_id, amount, error: orderError } = await res.json()
    if (orderError) { toast.error(orderError); setLoading(false); return }

    const options = {
      key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount,
      currency:    'INR',
      name:        'SquadMatch',
      description: 'Pro subscription — 1 month',
      order_id,
      theme:       { color: '#22c55e' },

      // ── This handler fires when Razorpay confirms the payment ──
      // response contains razorpay_payment_id, razorpay_order_id,
      // razorpay_signature — we verify the signature server-side
      // and update the DB immediately. Do NOT rely on the webhook
      // for the immediate upgrade — it has delivery delays in dev.
      handler: async (response: {
        razorpay_payment_id: string
        razorpay_order_id:   string
        razorpay_signature:  string
      }) => {
        // console.log('Razorpay handler fired with:', {
        //   payment_id: response.razorpay_payment_id,
        //   order_id:   response.razorpay_order_id,
        //   signature:  response.razorpay_signature?.slice(0, 8) + '…',
        // })

        setVerifying(true)

        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
            }),
          })

          const result = await verifyRes.json()
          // console.log('verify-payment response — status:', verifyRes.status, 'body:', result)

          if (!verifyRes.ok || !result.success) {
            toast.error(`Activation failed: ${result.error ?? 'unknown error'}`)
            // console.error('verify-payment full error:', result)
            setVerifying(false)
            return
          }

          toast.success('Payment successful! Welcome to Pro 🎉')
          router.refresh()
          router.push('/profile')
        } catch (err) {
          toast.error('Network error during activation. Please reload the page.')
          // console.error('verify-payment fetch threw:', err)
          setVerifying(false)
        }
      },

      modal: {
        ondismiss: () => setLoading(false),
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.open()
    setLoading(false)
  }

  const PRO_FEATURES = [
    { emoji: '∞', text: 'Unlimited profile views per day' },
    { emoji: '👀', text: 'See exactly who liked your profile' },
    { emoji: '⚡', text: 'Priority placement in browse feed' },
    { emoji: '🏅', text: 'Pro badge on your profile' },
    { emoji: '🔍', text: 'Advanced filters (rank bracket, role)' },
  ]

  // Show verifying overlay while we confirm with server
  if (verifying) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-5">
        <div className="w-12 h-12 border-2 border-brand-500/40 border-t-brand-500 rounded-full animate-spin" />
        <p className="font-display text-xl font-bold text-white">Activating Pro…</p>
        <p className="text-white/40 text-sm text-center">Verifying your payment. This takes a second.</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-6 pb-10">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">Upgrade to Pro</h1>
        <p className="text-white/40 text-sm">Less than a BGMI UC pack. Cancel anytime.</p>
      </div>

      <div className="card-surface border-brand-500/30 p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-brand-500 text-black text-xs font-bold px-3 py-1 rounded-bl-xl">
          MOST POPULAR
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-display text-5xl font-bold text-brand-400">{PRO_PRICE_DISPLAY}</span>
          <span className="text-white/30">/month</span>
        </div>
        <p className="text-white/30 text-sm mb-6">Billed monthly · cancel anytime</p>

        <ul className="space-y-3 mb-6">
          {PRO_FEATURES.map(f => (
            <li key={f.text} className="flex items-center gap-3 text-white/80 text-sm">
              <span className="text-brand-400 font-bold w-5 text-center">{f.emoji}</span>
              {f.text}
            </li>
          ))}
        </ul>

        <button
          onClick={handleUpgrade}
          disabled={loading || verifying}
          className="btn-primary w-full py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Opening payment…' : `Upgrade for ${PRO_PRICE_DISPLAY}/mo`}
        </button>

        <p className="text-center text-white/25 text-xs mt-3">
          UPI · Cards · Netbanking · Wallets accepted
        </p>
      </div>

      <div className="card-surface p-5 text-center">
        <p className="text-white/40 text-sm mb-2">Not ready yet?</p>
        <button
          onClick={() => router.back()}
          className="text-brand-400 text-sm hover:text-brand-300 transition-colors"
        >
          Continue with free plan
        </button>
      </div>
    </div>
  )
}