'use client'
import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import Link from 'next/link'
import { Check, MapPin, Calendar, Sun } from 'lucide-react'

const PACKAGES = [
  {
    name: '3-Day Discovery',
    type: '3-day',
    nights: 3,
    price: 3500,
    memberPrice: 2800,
    description: 'A focused introduction to longevity science with baseline diagnostics and personalized lifestyle recommendations.',
    includes: [
      '3 nights at El Fuerte Marbella',
      'Comprehensive Diagnostic at Recoletas',
      '2 coaching sessions (movement + nutrition)',
      'Personalized longevity plan',
      'Follow-up teleconsultation (30 days)',
    ],
    followUp: '1 month',
  },
  {
    name: '5-Day Immersion',
    type: '5-day',
    nights: 5,
    price: 6500,
    memberPrice: 5200,
    description: 'A deep dive into all four pillars of longevity with advanced diagnostics, daily coaching, and a comprehensive follow-up program.',
    includes: [
      '5 nights at El Fuerte Marbella',
      'Executive Diagnostic at Recoletas',
      'Daily coaching across all 4 pillars',
      'Spa access and recovery sessions',
      'Personalized meal plan during stay',
      '3-month follow-up program via telemedicine',
    ],
    followUp: '3 months',
    recommended: true,
  },
  {
    name: '7-Day Transformation',
    type: '7-day',
    nights: 7,
    price: 9500,
    memberPrice: 7600,
    description: 'The ultimate longevity experience. A full week of personalized training, advanced diagnostics, cutting-edge therapies, and a comprehensive 6-month follow-up.',
    includes: [
      '7 nights at El Fuerte Marbella',
      'Executive Diagnostic at Recoletas',
      'Daily personalized training and nutrition',
      'Advanced therapies (IV, cryotherapy, hyperbaric)',
      'Comprehensive longevity protocol development',
      '6-month follow-up with monthly teleconsultations',
    ],
    followUp: '6 months',
  },
]

export default function StaysClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    preferredPackage: '',
    arrivalDate: '',
    guestCount: '1',
    specialRequirements: '',
  })

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/stay-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Something went wrong.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setSubmitting(false)
    }
  }

  const inputClasses =
    'w-full px-4 py-3 bg-brand-glass-bg border border-brand-glass-border rounded-lg text-sm text-brand-light placeholder:text-brand-silver/50 outline-none focus:ring-1 focus:ring-brand-gold/50 focus:border-brand-gold/30 transition-colors'
  const selectClasses = cn(inputClasses, 'appearance-none')
  const labelClasses = 'block text-xs font-medium text-brand-silver mb-1.5'

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4 pt-24 pb-16">
        <div
          className="w-full max-w-lg rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-8 md:p-10 text-center"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
        >
          <Sun className="w-12 h-12 text-brand-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl font-semibold text-brand-light tracking-wide mb-3">
            Inquiry Received
          </h1>
          <p className="text-brand-silver text-sm leading-relaxed mb-6">
            Thank you for your interest in our longevity stay programs. Our team at El Fuerte Marbella
            will contact you within 1-2 business days to discuss availability and confirm your booking.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium uppercase tracking-[0.15em] border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark transition-all duration-300 min-h-[44px]"
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold-dim text-brand-gold text-xs font-medium mb-4">
            <MapPin className="w-3.5 h-3.5" />
            El Fuerte Marbella
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-light text-brand-light tracking-wide leading-tight mb-4">
            Longevity Stay Packages
          </h1>
          <p className="text-brand-silver text-base leading-relaxed max-w-2xl mx-auto">
            Immersive longevity experiences combining luxury hospitality with hospital-grade diagnostics
            at Recoletas Salud Marbella. Pre-stay preparation, daily protocols, and long-term follow-up
            — all delivered through the PATHS platform.
          </p>
        </div>

        {/* Package Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.type}
              className={cn(
                'rounded-2xl backdrop-blur-md p-6 relative',
                pkg.recommended
                  ? 'border-2 border-brand-gold/30 bg-brand-gold-dim'
                  : 'border border-brand-glass-border bg-brand-glass-bg',
              )}
              style={{ WebkitBackdropFilter: 'blur(12px)' }}
            >
              {pkg.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-brand-gold text-brand-dark">
                  Most Popular
                </span>
              )}

              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-brand-teal" />
                <span className="text-xs text-brand-teal font-medium uppercase tracking-wider">
                  {pkg.nights} Nights
                </span>
              </div>

              <h2 className="font-display text-xl font-normal tracking-wide text-brand-light mb-2">
                {pkg.name}
              </h2>

              <p className="text-xs text-brand-silver leading-relaxed mb-4">{pkg.description}</p>

              {/* Pricing */}
              <div className="mb-5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-display font-light text-brand-gold">
                    €{isAuthenticated ? pkg.memberPrice.toLocaleString() : pkg.price.toLocaleString()}
                  </span>
                  {isAuthenticated ? (
                    <span className="text-[10px] text-brand-teal font-medium uppercase">Member</span>
                  ) : (
                    <span className="text-xs text-brand-silver/60 line-through">
                      €{pkg.price.toLocaleString()}
                    </span>
                  )}
                </div>
                {!isAuthenticated && (
                  <p className="text-[10px] text-brand-silver/60 mt-1">
                    €{pkg.memberPrice.toLocaleString()} for members
                  </p>
                )}
              </div>

              {/* Includes */}
              <div className="space-y-2 mb-4">
                {pkg.includes.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-brand-teal mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-brand-silver">{item}</span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-brand-silver/50">
                Follow-up: {pkg.followUp}
              </p>
            </div>
          ))}
        </div>

        {/* Booking Form */}
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-normal tracking-wide text-brand-light mb-2">
              Book Your Stay
            </h2>
            <p className="text-brand-silver text-sm">
              Complete the form below and our team will contact you to confirm availability.
            </p>
          </div>

          <div
            className="rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-6 md:p-8"
            style={{ WebkitBackdropFilter: 'blur(12px)' }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClasses} htmlFor="stayPackage">Preferred Package *</label>
                <select
                  id="stayPackage"
                  required
                  value={form.preferredPackage}
                  onChange={(e) => update('preferredPackage', e.target.value)}
                  className={selectClasses}
                >
                  <option value="" disabled>Select a package</option>
                  {PACKAGES.map((pkg) => (
                    <option key={pkg.type} value={pkg.name}>
                      {pkg.name} — €{isAuthenticated ? pkg.memberPrice.toLocaleString() : pkg.price.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses} htmlFor="stayFirstName">First Name *</label>
                  <input id="stayFirstName" type="text" required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses} htmlFor="stayLastName">Last Name *</label>
                  <input id="stayLastName" type="text" required value={form.lastName} onChange={(e) => update('lastName', e.target.value)} className={inputClasses} />
                </div>
              </div>

              <div>
                <label className={labelClasses} htmlFor="stayEmail">Email *</label>
                <input id="stayEmail" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClasses} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses} htmlFor="stayPhone">Phone</label>
                  <input id="stayPhone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses} htmlFor="stayGuests">Guests</label>
                  <select id="stayGuests" value={form.guestCount} onChange={(e) => update('guestCount', e.target.value)} className={selectClasses}>
                    <option value="1">1 Guest</option>
                    <option value="2">2 Guests (Couple)</option>
                    <option value="family">Family</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClasses} htmlFor="stayArrival">Preferred Arrival Date</label>
                <input id="stayArrival" type="date" value={form.arrivalDate} onChange={(e) => update('arrivalDate', e.target.value)} className={inputClasses} />
              </div>

              <div>
                <label className={labelClasses} htmlFor="stayReqs">Special Requirements</label>
                <textarea
                  id="stayReqs"
                  rows={3}
                  placeholder="Dietary requirements, mobility needs, health goals..."
                  value={form.specialRequirements}
                  onChange={(e) => update('specialRequirements', e.target.value)}
                  className={cn(inputClasses, 'resize-none')}
                />
              </div>

              {message && (
                <p className={cn('text-sm text-center', message.type === 'success' ? 'text-green-400' : 'text-red-400')}>
                  {message.text}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'w-full py-3 rounded-full text-sm font-medium uppercase tracking-[0.15em] transition-all duration-300',
                  'border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark',
                  'min-h-[44px]',
                  submitting && 'opacity-50 cursor-not-allowed',
                )}
              >
                {submitting ? 'Submitting...' : 'Request Booking'}
              </button>

              <p className="text-brand-silver/50 text-xs text-center">
                Stays at El Fuerte Marbella with diagnostics at Hospital Recoletas Salud.{' '}
                {!isAuthenticated && (
                  <>
                    <Link href="/register" className="text-brand-gold hover:underline">
                      Create a free account
                    </Link>{' '}
                    for member pricing and save up to €1,900.
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
