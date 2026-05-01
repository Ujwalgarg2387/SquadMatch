'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { formatRelativeTime, getGameMeta } from '@/lib/utils'
import type { Message, ProfileWithGames } from '@/types'
import toast from 'react-hot-toast'

export default function ChatPage({ params }: { params: { matchId: string } }) {
  const { matchId } = params
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<ProfileWithGames | null>(null)
  const [myId, setMyId] = useState<string>('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const typingChannelRef = useRef<any>(null)
  const typingTimeoutRef = useRef<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // ── Stable client ref — never recreate across renders ────────
  // createClient() in the component body creates a new instance
  // every render. Putting it in deps causes infinite re-subscriptions.
  const supabase = useRef(createClient()).current

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    // cancelled flag — prevents setState + navigation after unmount
    let cancelled = false

    // ── 1. Create channel SYNCHRONOUSLY before any await ─────────
    // useEffect must return the cleanup fn synchronously. If you
    // create the channel inside async init(), useEffect gets a Promise
    // back (not a function) and never runs cleanup — causing the
    // "cannot add callbacks after subscribe()" error on next mount.
    //
    // The WebSocket error ("closed before connection established")
    // comes from React StrictMode running cleanup immediately after
    // the first mount, closing the socket mid-handshake. This is
    // expected in dev StrictMode and harmless in production — the
    // second mount re-creates the channel cleanly.
    const channel = supabase
      .channel(`chat:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        payload => {
          // console.log('Received realtime message:', payload)
          if (cancelled) return
          const incoming = payload.new as Message
          setMessages(prev => {
            // Deduplicate — realtime fires for our own inserts too.
            // We already added them optimistically so skip if the
            // real id already exists in state.
            if (prev.some(m => m.id === incoming.id)) return prev
            return [...prev, incoming]
          })
        }
      )
      .subscribe((status) => {
        // console.log("REALTIME STATUS:", status)
      })

    // 🟢 Listen for profile changes (online/offline)
    const presenceChannel = supabase
      .channel(`presence:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        payload => {
          const updated = payload.new

          if (updated.id === otherUser?.id) {
            setOtherUser(prev => prev ? {
              ...prev,
              is_online: updated.is_online,
              last_seen: updated.last_seen
            } : prev)
          }
        }
      )
      .subscribe()

    typingChannelRef.current = supabase
      .channel(`typing:${matchId}`)
      .on('broadcast', { event: 'typing' }, payload => {
        if (payload.payload.userId !== myId) {
          setIsTyping(true)
          // clear previous timer
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
          }

          // set new timer
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false)
          }, 1500)
        }
      })
      .subscribe()

    // ── 2. Load data async ────────────────────────────────────────
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()

      // IMPORTANT: check cancelled BEFORE checking user.
      // In React StrictMode the effect runs twice: mount → cleanup
      // (cancelled = true) → mount again. The first init() comes back
      // from getUser() with cancelled=true. If we checked (!user) first
      // and then called router.push we'd get a spurious redirect.
      // Always bail silently when cancelled, regardless of user state.
      if (cancelled) return
      if (!user) { router.push('/auth/login'); return }

      setMyId(user.id)

      // 🟢 Set user online
      await supabase
        .from('profiles')
        .update({
          is_online: true,
          last_seen: new Date().toISOString()
        })
        .eq('id', user.id)

      // Verify this match belongs to the user
      const { data: match, error: matchErr } = await supabase
        .from('matches')
        .select('user_a, user_b')
        .eq('id', matchId)
        .single()

      if (cancelled) return

      if (matchErr || !match || (match.user_a !== user.id && match.user_b !== user.id)) {
        toast.error('Match not found')
        router.push('/matches')
        return
      }

      const otherId = match.user_a === user.id ? match.user_b : match.user_a

      // Load profile and messages in parallel
      const [{ data: profile }, { data: msgs }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, gaming_profiles(*)')
          .eq('id', otherId)
          .single(),
        supabase
          .from('messages')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true })
          .limit(100),
      ])

      if (cancelled) return

      setOtherUser(profile as ProfileWithGames)
      setMessages((msgs ?? []) as Message[])
      setLoading(false)
    }

    init()

    // ── 3. Cleanup — returned synchronously so React captures it ──
    return () => {
      cancelled = true

      // 🔴 Set user offline
      if (myId) {
        supabase
          .from('profiles')
          .update({
            is_online: false,
            last_seen: new Date().toISOString()
          })
          .eq('id', myId)
      }

      supabase.removeChannel(channel)
      supabase.removeChannel(presenceChannel)
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current)
      }
    }
  }, [matchId]) // supabase is stable via useRef — safe to omit from deps

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content || sending || !myId) return

    setSending(true)
    setText('')

    // ── Optimistic update ─────────────────────────────────────────
    // Add the message to state immediately so the sender sees it
    // right away without waiting for the DB round-trip or the
    // realtime event. We use a temp id that gets swapped out below.
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      match_id: matchId,
      sender_id: myId,
      content,
      status: 'sent',
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    // Insert and get the real row back with .select().single()
    const { data: saved, error } = await supabase
      .from('messages')
      .insert({ match_id: matchId, sender_id: myId, content })
      .select()
      .single()

    if (error) {
      toast.error('Failed to send message')
      setText(content)
      // Roll back the optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } else {
      // Swap the temp entry for the real persisted row.
      // The realtime handler will also fire for this insert, but
      // the deduplication check (m.id === incoming.id) will skip
      // it since we've already replaced tempId with saved.id here.
      setMessages(prev => prev.map(m => m.id === tempId ? (saved as Message) : m))
    }

    setSending(false)
    inputRef.current?.focus()
  }

  const primaryGame = otherUser?.gaming_profiles?.find(g => g.is_primary) ?? otherUser?.gaming_profiles?.[0]
  const gameMeta = primaryGame ? getGameMeta(primaryGame.game) : null

  function groupByDate(msgs: Message[]) {
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''
    msgs.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      if (date !== currentDate) {
        currentDate = date
        groups.push({ date, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    })
    return groups
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface-800/80 backdrop-blur border-b border-white/8">
        <Link href="/matches" className="text-white/50 hover:text-white p-1 -ml-1">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>

        {otherUser && (
          <>
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-surface-600 flex items-center justify-center text-xl overflow-hidden">
                {otherUser.avatar_url
                  ? <Image src={otherUser.avatar_url} alt={otherUser.display_name} fill className="object-cover" />
                  : gameMeta?.emoji ?? '🎮'
                }
              </div>
              {otherUser.is_online && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand-400 border-2 border-surface-800" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-white text-sm leading-tight">{otherUser.display_name}</h2>
              <p className="text-white/30 text-xs">
                {otherUser.is_online
                  ? 'Online now'
                  : otherUser.last_seen
                    ? `Last seen ${formatRelativeTime(otherUser.last_seen)}`
                    : 'Offline'}
                {gameMeta && ` · ${gameMeta.emoji} ${gameMeta.label}`}
                {primaryGame?.rank && ` · ${primaryGame.rank}`}
              </p>
            </div>

            <Link href={`/profile/${otherUser.username}`} className="text-white/30 hover:text-white p-1">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />
              </svg>
            </Link>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-brand-500/50 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="text-4xl">👋</div>
            <p className="font-display text-lg font-bold text-white">It's a match!</p>
            <p className="text-white/40 text-sm max-w-xs">
              Say hello to {otherUser?.display_name}. You both play{' '}
              {gameMeta?.label ?? 'games'} — start there!
            </p>
          </div>
        ) : (
          groupByDate(messages).map(group => (
            <div key={group.date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-white/25 text-xs">{group.date}</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>
              {group.messages.map((msg, i) => {
                const isMe = msg.sender_id === myId
                const showAvatar = !isMe && (i === 0 || group.messages[i - 1]?.sender_id !== msg.sender_id)
                const isTemp = msg.id.startsWith('temp-')

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {!isMe && (
                      <div className={`w-7 h-7 rounded-lg bg-surface-600 flex items-center justify-center text-sm shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                        {gameMeta?.emoji ?? '🎮'}
                      </div>
                    )}
                    <div
                      className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed transition-opacity
                        ${isMe
                          ? 'bg-brand-500 text-black rounded-br-sm font-medium'
                          : 'bg-surface-700 border border-white/8 text-white/90 rounded-bl-sm'
                        }
                        ${isTemp ? 'opacity-60' : 'opacity-100'}
                      `}
                    >
                      {msg.content}
                      <div className={`text-xs mt-1 flex items-center gap-1 ${isMe ? 'text-black/50 justify-end' : 'text-white/25'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        {/* Sending indicator for optimistic messages */}
                        {isMe && isTemp && <span className="text-[10px]">sending…</span>}
                        {isMe && !isTemp && <span className="text-[10px]">✓</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        {/* 🟣 Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-surface-600 flex items-center justify-center text-sm">
              💬
            </div>
            <div className="bg-surface-700 border border-white/8 text-white/60 px-3 py-2 rounded-2xl text-xs italic">
              {otherUser?.display_name} is typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="flex items-center gap-3 px-4 py-3 bg-surface-800/80 backdrop-blur border-t border-white/8 pb-safe"
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => {
            setText(e.target.value)
            typingChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: myId } })
          }}
          placeholder={`Message ${otherUser?.display_name ?? ''}…`}
          className="input-dark flex-1 py-2.5 text-sm"
          maxLength={2000}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-black hover:bg-brand-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 shrink-0"
        >
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
    </div>
  )
}