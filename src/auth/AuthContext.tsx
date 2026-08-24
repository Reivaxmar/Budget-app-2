// Gates the whole app behind Supabase Auth (email/password, with email
// confirmation and optional TOTP two-factor login — SPECS-adjacent product
// decision, see DIST.md "Supabase setup" for the account-side config this
// depends on). `status` drives what App.tsx renders: the auth screens, the
// MFA challenge, or the real app.

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { listTotpFactors, challengeAndVerifyTotp } from './mfa'

export type AuthStatus = 'loading' | 'signed-out' | 'mfa-required' | 'signed-in'

interface AuthContextValue {
  status: AuthStatus
  user: User | null
  /** The verified TOTP factor pending a login-time challenge, if any. */
  mfaFactorId: string | null
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  verifyMfaChallenge: (code: string) => Promise<string | null>
  /** Re-checks the assurance level — called after enrolling/unenrolling a
   * factor in Settings, since that changes whether MFA is required. */
  refreshMfaStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)

  const evaluateStatus = useCallback(async (currentSession: Session | null) => {
    if (!currentSession) {
      setStatus('signed-out')
      setMfaFactorId(null)
      return
    }
    // aal1 (password only) vs aal2 (password + a verified second factor).
    // A user with a verified TOTP factor is held at "mfa-required" until
    // they complete the challenge, even though signInWithPassword already
    // succeeded — that's by design, it's the whole point of 2FA.
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (data && data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
      const factors = await listTotpFactors()
      const verified = factors.find((factor) => factor.status === 'verified')
      setMfaFactorId(verified?.id ?? null)
      setStatus('mfa-required')
      return
    }
    setMfaFactorId(null)
    setStatus('signed-in')
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus('signed-out')
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      evaluateStatus(data.session)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      evaluateStatus(newSession)
    })
    return () => subscription.unsubscribe()
  }, [evaluateStatus])

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  const signUp = async (
    email: string,
    password: string
  ): Promise<{ error: string | null; needsEmailConfirmation: boolean }> => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message, needsEmailConfirmation: false }
    // With "Confirm email" enabled on the Supabase project (the default,
    // see DIST.md), signUp() creates the user but returns no session until
    // the confirmation link is clicked.
    return { error: null, needsEmailConfirmation: !data.session }
  }

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut()
  }

  const verifyMfaChallenge = async (code: string): Promise<string | null> => {
    if (!mfaFactorId) return 'No two-factor method is set up on this account.'
    try {
      await challengeAndVerifyTotp(mfaFactorId, code)
      await evaluateStatus(session)
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Verification failed.'
    }
  }

  const refreshMfaStatus = async (): Promise<void> => evaluateStatus(session)

  return (
    <AuthContext.Provider
      value={{
        status,
        user: session?.user ?? null,
        mfaFactorId,
        signIn,
        signUp,
        signOut,
        verifyMfaChallenge,
        refreshMfaStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
