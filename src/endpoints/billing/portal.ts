import type { Endpoint } from 'payload'
import type { User } from '../../payload-types'
import { createPortalSession } from '../../stripe/portal'
import { getServerSideURL } from '../../utilities/getURL'

export const billingPortalEndpoint: Endpoint = {
  path: '/billing/portal',
  method: 'post',
  handler: async (req) => {
    // 1. Authenticate
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Check for stripeCustomerId
    const stripeCustomerId = (req.user as User).stripeCustomerId
    if (!stripeCustomerId) {
      return Response.json({ error: 'No billing account found. Subscribe to a plan first.' }, { status: 400 })
    }

    // 3. Parse optional return URL
    const body = await req.json?.() as { returnUrl?: string } | undefined

    // 4. Create portal session
    const baseUrl = getServerSideURL()
    const session = await createPortalSession({
      customerId: stripeCustomerId,
      returnUrl: body?.returnUrl ?? `${baseUrl}/account/billing`,
    })

    return Response.json({ url: session.url })
  },
}
