'use client'
import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import Link from 'next/link'
import { Check, Activity, Scan, Brain, Heart, Dna, FlaskConical } from 'lucide-react'

const COMPREHENSIVE_TESTS = [
  'Full-body DEXA scan',
  'VO2 Max testing',
  'Comprehensive blood panel (100+ biomarkers)',
  'Body composition analysis',
  'Cardiovascular assessment',
  'Balance and posture evaluation',
  'Epigenetic age testing',
  'Cognitive assessment',
  'AI-powered risk analysis with personalized recommendations',
]

const EXECUTIVE_TESTS = [
  'Everything in Comprehensive, plus:',
  'Advanced genomic panel',
  'Full-body MRI (3T AI-enabled)',
  'Coronary calcium score',
  'Advanced hormonal panel',
  'Microbiome analysis',
  '90-minute consultation with a longevity physician',
]

export default function DiagnosticsClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    preferredPackage: '',
    preferredDates: '',
    message: '',
  })

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/diagnostic-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Something went wrong. Please try again.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const inputClasses =
    'w-full px-4 py-3 bg-brand-glass-bg border border-brand-glass-border rounded-lg text-sm text-brand-light placeholder:text-brand-silver/50 outline-none focus:ring-1 focus:ring-brand-gold/50 focus:border-brand-gold/30 transition-colors'
  const selectClasses =
    'w-full px-4 py-3 bg-brand-glass-bg border border-brand-glass-border rounded-lg text-sm text-brand-light outline-none focus:ring-1 focus:ring-brand-gold/50 focus:border-brand-gold/30 transition-colors appearance-none'
  const labelClasses = 'block text-xs font-medium text-brand-silver mb-1.5'

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4 pt-24 pb-16">
        <div
          className="w-full max-w-lg rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-8 md:p-10 text-center"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            className="mx-auto mb-4 text-brand-teal"
            aria-hidden="true"
          >
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
            <path
              d="M14 24l7 7L34 18"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1 className="font-display text-3xl font-semibold text-brand-light tracking-wide mb-3">
            Inquiry Received
          </h1>
          <p className="text-brand-silver text-sm leading-relaxed mb-6">
            Thank you for your interest in our diagnostic packages. A member of our clinical team
            at Hospital Recoletas Salud Marbella will contact you within 1-2 business days to
            confirm your appointment.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium uppercase tracking-[0.15em] border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark transition-all duration-300 min-h-[44px] focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark px-4 pt-24 pb-16">
      <div className="container max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <p className="text-xs font-medium text-brand-teal uppercase tracking-[0.2em] mb-3">
            Hospital Recoletas Salud Marbella
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-light text-brand-light tracking-wide leading-tight mb-4">
            Diagnostic Packages
          </h1>
          <p className="text-brand-silver text-base leading-relaxed max-w-2xl mx-auto">
            Comprehensive health assessments powered by hospital-grade diagnostics, AI-driven
            analysis, and personalized longevity recommendations. Conducted at our state-of-the-art
            facility equipped with 3T MRI, 128-slice CT, and advanced laboratory capabilities.
          </p>
        </div>

        {/* Package Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
          {/* Comprehensive Package */}
          <div
            className="rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-6 md:p-8"
            style={{ WebkitBackdropFilter: 'blur(12px)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-brand-teal-dim flex items-center justify-center">
                <Activity className="w-5 h-5 text-brand-teal" />
              </div>
              <div>
                <h2 className="font-display text-xl font-normal tracking-wide text-brand-light">
                  Comprehensive
                </h2>
                <p className="text-xs text-brand-silver">Full diagnostic assessment</p>
              </div>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-display font-light text-brand-gold">
                {isAuthenticated ? '€800' : '€1,200'}
              </span>
              {isAuthenticated ? (
                <span className="text-xs text-brand-teal font-medium">Member price</span>
              ) : (
                <span className="text-xs text-brand-silver">
                  <span className="text-brand-gold">€800</span> for members
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {COMPREHENSIVE_TESTS.map((test) => (
                <div key={test} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" />
                  <span className="text-sm text-brand-silver">{test}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Executive Package */}
          <div
            className="rounded-2xl border border-brand-gold/20 bg-brand-glass-bg backdrop-blur-md p-6 md:p-8 relative"
            style={{ WebkitBackdropFilter: 'blur(12px)' }}
          >
            <div className="absolute top-4 right-4">
              <span className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-brand-gold/10 text-brand-gold tracking-wider">
                Premium
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-brand-gold-dim flex items-center justify-center">
                <Dna className="w-5 h-5 text-brand-gold" />
              </div>
              <div>
                <h2 className="font-display text-xl font-normal tracking-wide text-brand-light">
                  Executive
                </h2>
                <p className="text-xs text-brand-silver">Advanced diagnostics + physician consultation</p>
              </div>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-display font-light text-brand-gold">
                {isAuthenticated ? '€2,500' : '€3,500'}
              </span>
              {isAuthenticated ? (
                <span className="text-xs text-brand-teal font-medium">Member price</span>
              ) : (
                <span className="text-xs text-brand-silver">
                  <span className="text-brand-gold">€2,500</span> for members
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {EXECUTIVE_TESTS.map((test, i) => (
                <div key={test} className="flex items-start gap-2.5">
                  <Check className={cn('w-4 h-4 mt-0.5 shrink-0', i === 0 ? 'text-brand-gold' : 'text-brand-teal')} />
                  <span className={cn('text-sm', i === 0 ? 'text-brand-gold font-medium' : 'text-brand-silver')}>
                    {test}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-normal tracking-wide text-brand-light mb-2">
              Book Your Assessment
            </h2>
            <p className="text-brand-silver text-sm">
              Complete the form below and our clinical team will contact you to confirm your appointment.
            </p>
          </div>

          <div
            className="rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-6 md:p-8"
            style={{ WebkitBackdropFilter: 'blur(12px)' }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClasses} htmlFor="diagPackage">
                  Preferred Package *
                </label>
                <select
                  id="diagPackage"
                  required
                  value={form.preferredPackage}
                  onChange={(e) => update('preferredPackage', e.target.value)}
                  className={selectClasses}
                >
                  <option value="" disabled>Select a package</option>
                  <option value="Comprehensive">Comprehensive — {isAuthenticated ? '€800' : '€1,200'}</option>
                  <option value="Executive">Executive — {isAuthenticated ? '€2,500' : '€3,500'}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses} htmlFor="diagFirstName">First Name *</label>
                  <input
                    id="diagFirstName"
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className={labelClasses} htmlFor="diagLastName">Last Name *</label>
                  <input
                    id="diagLastName"
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses} htmlFor="diagEmail">Email *</label>
                <input
                  id="diagEmail"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className={labelClasses} htmlFor="diagPhone">Phone Number</label>
                <input
                  id="diagPhone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className={labelClasses} htmlFor="diagDates">
                  Preferred Dates
                </label>
                <input
                  id="diagDates"
                  type="text"
                  placeholder="e.g. Week of April 14, or any Monday/Wednesday"
                  value={form.preferredDates}
                  onChange={(e) => update('preferredDates', e.target.value)}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className={labelClasses} htmlFor="diagMessage">
                  Additional Information
                </label>
                <textarea
                  id="diagMessage"
                  rows={3}
                  placeholder="Any health concerns, goals, or questions for our team"
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  className={cn(inputClasses, 'resize-none')}
                />
              </div>

              {message && (
                <p
                  className={cn(
                    'text-sm text-center',
                    message.type === 'success' ? 'text-green-400' : 'text-red-400',
                  )}
                >
                  {message.text}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'w-full py-3 rounded-full text-sm font-medium uppercase tracking-[0.15em] transition-all duration-300',
                  'border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark',
                  'focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none',
                  'min-h-[44px]',
                  submitting && 'opacity-50 cursor-not-allowed',
                )}
              >
                {submitting ? 'Submitting...' : 'Request Appointment'}
              </button>

              <p className="text-brand-silver/50 text-xs text-center">
                Diagnostics conducted at Hospital Recoletas Salud Marbella.{' '}
                {!isAuthenticated && (
                  <>
                    <Link href="/register" className="text-brand-gold hover:underline">
                      Create an account
                    </Link>{' '}
                    for member pricing.
                  </>
                )}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
