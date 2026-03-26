import type { Endpoint } from 'payload'

export const telemedicineBookingEndpoint: Endpoint = {
  path: '/telemedicine-booking',
  method: 'post',
  handler: async (req) => {
    const body = (await req.json?.()) as
      | {
          firstName?: string
          lastName?: string
          email?: string
          phone?: string
          topic?: string
          preferredDate?: string
          message?: string
        }
      | undefined

    if (!body?.firstName || !body?.lastName || !body?.email) {
      return Response.json({ error: 'Please fill in all required fields.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return Response.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    try {
      await req.payload.sendEmail({
        to: process.env.TELEMEDICINE_EMAIL || 'info@limitless-longevity.health',
        subject: `Telemedicine Consultation Request: ${body.topic || 'General'} — ${body.firstName} ${body.lastName}`,
        text: [
          `New telemedicine consultation request from ${body.firstName} ${body.lastName}`,
          '',
          `Topic: ${body.topic || 'Not specified'}`,
          `Email: ${body.email}`,
          `Phone: ${body.phone || 'Not provided'}`,
          `Preferred Date: ${body.preferredDate || 'Not specified'}`,
          '',
          `Message:`,
          body.message || 'No additional message.',
          '',
          `Source: ${req.user ? 'Authenticated user (AI Tutor escalation)' : 'Public booking form'}`,
        ].join('\n'),
      })

      req.payload.logger.info(
        `Telemedicine booking request from ${body.email} (topic: ${body.topic || 'general'})`,
      )

      return Response.json({ success: true, message: 'Request received.' }, { status: 200 })
    } catch (err: any) {
      req.payload.logger.error({ err, message: 'Failed to process telemedicine booking' })
      return Response.json(
        { error: 'Failed to send your request. Please try again or email us directly.' },
        { status: 500 },
      )
    }
  },
}
