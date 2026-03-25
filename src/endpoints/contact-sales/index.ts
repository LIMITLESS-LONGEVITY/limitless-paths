import type { Endpoint } from 'payload'

export const contactSalesEndpoint: Endpoint = {
  path: '/contact-sales',
  method: 'post',
  handler: async (req) => {
    const body = (await req.json?.()) as
      | {
          interest?: string
          companyName?: string
          companySize?: string
          firstName?: string
          lastName?: string
          workEmail?: string
          phone?: string
          details?: string
        }
      | undefined

    if (
      !body?.interest ||
      !body?.companyName ||
      !body?.companySize ||
      !body?.firstName ||
      !body?.lastName ||
      !body?.workEmail ||
      !body?.details
    ) {
      return Response.json({ error: 'Please fill in all required fields.' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.workEmail)) {
      return Response.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    try {
      // Send email notification to the team
      await req.payload.sendEmail({
        to: process.env.SALES_EMAIL || 'info@limitless-longevity.health',
        subject: `Enterprise Inquiry: ${body.companyName} — ${body.interest}`,
        text: [
          `New enterprise inquiry from ${body.firstName} ${body.lastName}`,
          '',
          `Interest: ${body.interest}`,
          `Company: ${body.companyName}`,
          `Company Size: ${body.companySize}`,
          `Email: ${body.workEmail}`,
          `Phone: ${body.phone || 'Not provided'}`,
          '',
          `Details:`,
          body.details,
        ].join('\n'),
      })

      req.payload.logger.info(
        `Enterprise inquiry received from ${body.workEmail} (${body.companyName})`,
      )

      return Response.json({ success: true, message: 'Inquiry received.' }, { status: 200 })
    } catch (err: any) {
      req.payload.logger.error({ err, message: 'Failed to process contact sales inquiry' })
      return Response.json(
        { error: 'Failed to send your inquiry. Please try again or email us directly.' },
        { status: 500 },
      )
    }
  },
}
