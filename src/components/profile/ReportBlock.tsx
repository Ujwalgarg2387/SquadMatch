'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const REPORT_REASONS = [
  'Fake profile / impersonation',
  'Harassment or abuse',
  'Inappropriate content',
  'Spam or scam',
  'Underage user',
  'Other',
]

export default function ReportBlock({
  reportedId,
  reportedName,
}: {
  reportedId: string
  reportedName: string
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'menu' | 'report'>('menu')
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleBlock() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('blocks').upsert({
      blocker_id: user.id,
      blocked_id: reportedId,
    }, { onConflict: 'blocker_id,blocked_id' })

    if (error) {
      toast.error('Failed to block user')
    } else {
      toast.success(`${reportedName} blocked`)
      setOpen(false)
      router.push('/browse')
    }
    setLoading(false)
  }

  async function handleReport() {
    if (!reason) { toast.error('Select a reason'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_id: reportedId,
      reason,
      detail: detail.trim() || null,
    })

    if (error) {
      toast.error('Failed to send report')
    } else {
      toast.success('Report submitted. We\'ll review it.')
      setOpen(false)
      setView('menu')
      setReason('')
      setDetail('')
    }
    setLoading(false)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-white/30 hover:text-white/60 transition-colors"
        title="Report or block"
      >
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setView('menu') }} />

          <div className="relative w-full max-w-lg bg-surface-800 border-t border-white/10 rounded-t-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-bold text-white">
                {view === 'menu' ? reportedName : 'Report user'}
              </h2>
              <button onClick={() => { setOpen(false); setView('menu') }} className="text-white/30 hover:text-white text-2xl">×</button>
            </div>

            {view === 'menu' && (
              <div className="space-y-2">
                <button
                  onClick={() => setView('report')}
                  className="w-full text-left px-4 py-3 rounded-xl bg-surface-700 border border-white/8 text-white/80 hover:text-white hover:border-white/20 transition-all text-sm"
                >
                  🚩 Report profile
                </button>
                <button
                  onClick={handleBlock}
                  disabled={loading}
                  className="w-full text-left px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm disabled:opacity-50"
                >
                  🚫 Block {reportedName}
                </button>
              </div>
            )}

            {view === 'report' && (
              <div className="space-y-4">
                <div>
                  <p className="text-white/50 text-sm mb-2">Reason *</p>
                  <div className="space-y-2">
                    {REPORT_REASONS.map(r => (
                      <button
                        key={r}
                        onClick={() => setReason(r)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                          reason === r
                            ? 'border-brand-500/50 bg-brand-500/10 text-white'
                            : 'border-white/8 bg-surface-700 text-white/60 hover:text-white/80'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-white/50 text-sm mb-1 block">Details (optional)</label>
                  <textarea
                    className="input-dark resize-none h-20 text-sm"
                    placeholder="Any extra context…"
                    value={detail}
                    onChange={e => setDetail(e.target.value)}
                    maxLength={500}
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setView('menu')} className="btn-ghost flex-1 py-2.5 text-sm">
                    Back
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={loading || !reason}
                    className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50"
                  >
                    {loading ? 'Submitting…' : 'Submit report'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
