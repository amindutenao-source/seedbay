import { Suspense } from 'react'
import SignupClient from './SignupClient'

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <SignupClient />
    </Suspense>
  )
}
