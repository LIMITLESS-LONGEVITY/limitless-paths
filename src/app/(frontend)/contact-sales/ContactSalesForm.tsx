'use client'
import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import Link from 'next/link'

export default function ContactSalesForm() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    interest: '',
    companyName: '',
    companySize: '',
    firstName: '',
    lastName: '',
    workEmail: '',
    phone: '',
    details: '',
  })

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/contact-sales', {
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
            Thank You
          </h1>
          <p className="text-brand-silver text-sm leading-relaxed mb-6">
            We&apos;ve received your inquiry and a member of our team will be in touch within 1-2
            business days to discuss how PATHS can serve your organization.
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left column — messaging */}
          <div className="lg:pt-8">
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-brand-light tracking-wide leading-tight mb-4">
              Enterprise Longevity Education
            </h1>
            <p className="text-brand-silver text-base leading-relaxed mb-8">
              Equip your leadership team with evidence-based longevity knowledge. Custom training
              programs for hospitals, hotels, and corporate wellness initiatives.
            </p>

            <div className="space-y-4 mb-8">
              <p className="text-xs font-medium text-brand-silver uppercase tracking-[0.2em]">
                What&apos;s included
              </p>
              {[
                'Dedicated organization workspace with multi-tenant isolation',
                'Custom content assignments and learning paths',
                'Team analytics dashboard and progress tracking',
                'AI-powered tutor with organization-specific context',
                'Priority support and onboarding assistance',
              ].map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-brand-teal mt-0.5 shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 8l3.5 3.5L13 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-brand-silver text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <p className="text-brand-silver/60 text-xs">
              Looking for individual access?{' '}
              <Link href="/register" className="text-brand-gold hover:underline">
                Create a personal account
              </Link>
            </p>
          </div>

          {/* Right column — form */}
          <div
            className="rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-6 md:p-8"
            style={{ WebkitBackdropFilter: 'blur(12px)' }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClasses} htmlFor="interest">
                  What are you interested in? *
                </label>
                <select
                  id="interest"
                  required
                  value={form.interest}
                  onChange={(e) => update('interest', e.target.value)}
                  className={selectClasses}
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  <option value="corporate-wellness">Corporate wellness training</option>
                  <option value="hospital-training">Hospital / clinical staff training</option>
                  <option value="hospitality-training">Hospitality / hotel staff training</option>
                  <option value="executive-program">Executive longevity program</option>
                  <option value="custom-content">Custom content development</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses} htmlFor="companyName">
                    Company Name *
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    required
                    value={form.companyName}
                    onChange={(e) => update('companyName', e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className={labelClasses} htmlFor="companySize">
                    Company Size *
                  </label>
                  <select
                    id="companySize"
                    required
                    value={form.companySize}
                    onChange={(e) => update('companySize', e.target.value)}
                    className={selectClasses}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    <option value="1-50">1-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-1000">201-1,000 employees</option>
                    <option value="1001-5000">1,001-5,000 employees</option>
                    <option value="5001+">5,001+ employees</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses} htmlFor="salesFirstName">
                    First Name *
                  </label>
                  <input
                    id="salesFirstName"
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className={labelClasses} htmlFor="salesLastName">
                    Last Name *
                  </label>
                  <input
                    id="salesLastName"
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses} htmlFor="workEmail">
                  Work Email *
                </label>
                <input
                  id="workEmail"
                  type="email"
                  required
                  value={form.workEmail}
                  onChange={(e) => update('workEmail', e.target.value)}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className={labelClasses} htmlFor="phone">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className={labelClasses} htmlFor="details">
                  Tell us about your needs and goals *
                </label>
                <textarea
                  id="details"
                  required
                  rows={4}
                  value={form.details}
                  onChange={(e) => update('details', e.target.value)}
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
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
