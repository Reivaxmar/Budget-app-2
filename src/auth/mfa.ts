// Thin wrapper around supabase-js's TOTP (authenticator app) multi-factor
// APIs. Used both by the login-time challenge (src/auth/AuthContext.tsx)
// and by the "Account & Security" enrollment UI (src/pages/SettingsPage.tsx)
// — enrollment and login challenge both end in the same
// challenge-then-verify call, so that part is shared as
// `challengeAndVerifyTotp`.

import { supabase } from '../lib/supabaseClient'

export interface TotpFactor {
  id: string
  status: 'verified' | 'unverified'
  friendlyName?: string
}

export interface TotpEnrollment {
  factorId: string
  qrCodeSvg: string
  secret: string
}

export async function listTotpFactors(): Promise<TotpFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw new Error(error.message)
  return data.totp.map((factor) => ({
    id: factor.id,
    status: factor.status,
    friendlyName: factor.friendly_name,
  }))
}

/** Starts enrolling a new authenticator-app (TOTP) factor. Not active until
 * the user scans the QR code and confirms a generated code via
 * `challengeAndVerifyTotp`. */
export async function enrollTotp(): Promise<TotpEnrollment> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
  if (error) throw new Error(error.message)
  return { factorId: data.id, qrCodeSvg: data.totp.qr_code, secret: data.totp.secret }
}

/** Used both to confirm a fresh enrollment and to satisfy a login-time
 * two-factor challenge — both are "prove you hold the authenticator app". */
export async function challengeAndVerifyTotp(factorId: string, code: string): Promise<void> {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) throw new Error(challengeError.message)
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })
  if (error) throw new Error(error.message)
}

export async function unenrollTotp(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw new Error(error.message)
}
