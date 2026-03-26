'use client'
import React, { useState } from 'react'
import { cn } from '@/utilities/ui'
import Link from 'next/link'
import { Check, Video, Brain, Activity, Heart } from 'lucide-react'

const SERVICES = [
  { icon: Activity, title: 'Biomarker Review', description: 'Detailed analysis of your diagnostic results with personalized recommendations' },
  { icon: Brain, title: 'Health Planning', description: 'Strategic longevity planning based on your goals, genetics, and lifestyle' },
  { icon: Heart, title: 'Medication Guidance', description: 'Expert guidance on supplements, medications, and intervention protocols' },
  { icon: Video, title: 'Follow-Up Care', description: 'Ongoing monitoring and protocol adjustments after diagnostic packages or longevity stays' },
]

export default function TelemedicineClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', topic: '', preferredDate: '', message: '',
  })
  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/telemedicine-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) setSubmitted(true)
      else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Something went wrong.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setSubmitting(false)
    }
  }

  const inputClasses = 'w-full px-4 py-3 bg-brand-glass-bg border border-brand-glass-border rounded-lg text-sm text-brand-light placeholder:text-brand-silver/50 outline-none focus:ring-1 focus:ring-brand-gold/50 focus:border-brand-gold/30 transition-colors'
  const labelClasses = 'block text-xs font-medium text-brand-silver mb-1.5'

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4 pt-24 pb-16">
        <div className="w-full max-w-lg rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-8 md:p-10 text-center" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
          <Video className="w-12 h-12 text-brand-teal mx-auto mb-4" />
          <h1 className="font-display text-3xl font-semibold text-brand-light tracking-wide mb-3">Request Received</h1>
          <p className="text-brand-silver text-sm leading-relaxed mb-6">
            Our clinical team will contact you within 1-2 business days to schedule your consultation.
          </p>
          <Link href="/" className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium uppercase tracking-[0.15em] border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark transition-all duration-300 min-h-[44px]">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-medium mb-4">
            <Video className="w-3.5 h-3.5" />
            Telemedicine
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-light text-brand-light tracking-wide leading-tight mb-4">
            Expert Longevity Consultations
          </h1>
          <p className="text-brand-silver text-base leading-relaxed max-w-2xl mx-auto">
            Connect with our clinical team for personalized health guidance. From biomarker interpretation to intervention protocols — get expert advice without leaving home.
          </p>
        </div>

        {/* Services */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {SERVICES.map((service) => (
            <div key={service.title} className="rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-5" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
              <service.icon className="w-6 h-6 text-brand-teal mb-3" />
              <h3 className="text-sm font-semibold text-brand-light mb-1">{service.title}</h3>
              <p className="text-xs text-brand-silver leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="text-center mb-12">
          <p className="text-brand-silver text-sm">
            <span className="text-brand-gold font-medium">Premium & Enterprise members:</span> included in your plan.
            {' '}Regular members: €99 per session.
            {!isAuthenticated && (
              <> <Link href="/register" className="text-brand-gold hover:underline">Create an account</Link> to get started.</>
            )}
          </p>
        </div>

        {/* Booking Form */}
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-normal tracking-wide text-brand-light mb-2">Request a Consultation</h2>
          </div>
          <div className="rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-6 md:p-8" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClasses} htmlFor="tmFirstName">First Name *</label><input id="tmFirstName" type="text" required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} className={inputClasses} /></div>
                <div><label className={labelClasses} htmlFor="tmLastName">Last Name *</label><input id="tmLastName" type="text" required value={form.lastName} onChange={(e) => update('lastName', e.target.value)} className={inputClasses} /></div>
              </div>
              <div><label className={labelClasses} htmlFor="tmEmail">Email *</label><input id="tmEmail" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClasses} /></div>
              <div><label className={labelClasses} htmlFor="tmPhone">Phone</label><input id="tmPhone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputClasses} /></div>
              <div>
                <label className={labelClasses} htmlFor="tmTopic">What would you like to discuss?</label>
                <select id="tmTopic" value={form.topic} onChange={(e) => update('topic', e.target.value)} className={cn(inputClasses, 'appearance-none')}>
                  <option value="">Select a topic</option>
                  <option value="Biomarker Review">Biomarker Review</option>
                  <option value="Health Planning">Health Planning</option>
                  <option value="Medication Guidance">Medication Guidance</option>
                  <option value="Follow-Up Care">Follow-Up Care</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div><label className={labelClasses} htmlFor="tmDate">Preferred Date</label><input id="tmDate" type="text" placeholder="e.g. Next week, any morning" value={form.preferredDate} onChange={(e) => update('preferredDate', e.target.value)} className={inputClasses} /></div>
              <div><label className={labelClasses} htmlFor="tmMessage">Additional Information</label><textarea id="tmMessage" rows={3} placeholder="Describe your health goals or questions" value={form.message} onChange={(e) => update('message', e.target.value)} className={cn(inputClasses, 'resize-none')} /></div>

              {message && <p className={cn('text-sm text-center', message.type === 'success' ? 'text-green-400' : 'text-red-400')}>{message.text}</p>}

              <button type="submit" disabled={submitting} className={cn('w-full py-3 rounded-full text-sm font-medium uppercase tracking-[0.15em] transition-all duration-300 border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark min-h-[44px]', submitting && 'opacity-50 cursor-not-allowed')}>
                {submitting ? 'Submitting...' : 'Request Consultation'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
