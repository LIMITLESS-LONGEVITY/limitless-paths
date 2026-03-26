import type { Endpoint } from 'payload'

export const stayBookingEndpoint: Endpoint = {
  path: '/stay-booking',
  method: 'post',
  handler: async (req) => {
    const body = (await req.json?.()) as
      | {
          firstName?: string
          lastName?: string
          email?: string
          phone?: string
          preferredPackage?: string
          arrivalDate?: string
          guestCount?: string
          specialRequirements?: string
        }
      | undefined

    if (!body?.firstName || !body?.lastName || !body?.email || !body?.preferredPackage) {
      return Response.json({ error: 'Please fill in all required fields.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return Response.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    try {
      await req.payload.sendEmail({
        to: process.env.STAY_BOOKING_EMAIL || 'info@limitless-longevity.health',
        subject: `Longevity Stay Inquiry: ${body.preferredPackage} — ${body.firstName} ${body.lastName}`,
        text: [
          `New longevity stay inquiry from ${body.firstName} ${body.lastName}`,
          '',
          `Package: ${body.preferredPackage}`,
          `Email: ${body.email}`,
          `Phone: ${body.phone || 'Not provided'}`,
          `Preferred Arrival: ${body.arrivalDate || 'Not specified'}`,
          `Guests: ${body.guestCount || '1'}`,
          '',
          `Special Requirements:`,
          body.specialRequirements || 'None.',
        ].join('\n'),
      })

      req.payload.logger.info(
        `Stay booking inquiry received from ${body.email} (${body.preferredPackage})`,
      )

      return Response.json({ success: true, message: 'Inquiry received.' }, { status: 200 })
    } catch (err: any) {
      req.payload.logger.error({ err, message: 'Failed to process stay booking inquiry' })
      return Response.json(
        { error: 'Failed to send your inquiry. Please try again or email us directly.' },
        { status: 500 },
      )
    }
  },
}
