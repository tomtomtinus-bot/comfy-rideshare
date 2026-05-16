/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as rideConfirmation } from './ride-confirmation.tsx'
import { template as rideInvitation } from './ride-invitation.tsx'
import { template as discountEnding } from './discount-ending.tsx'
import { template as newSignupAdmin } from './new-signup-admin.tsx'
import { template as matchFoundClient } from './match-found-client.tsx'
import { template as rideConfirmedEscort } from './ride-confirmed-escort.tsx'
import { template as cancelByEscortClient } from './cancel-by-escort-client.tsx'
import { template as rideUpdatedEscort } from './ride-updated-escort.tsx'
import { template as paymentConfirmClient } from './payment-confirm-client.tsx'
import { template as escortInvoiceReady } from './escort-invoice-ready.tsx'
import { template as paymentFailedAdmin } from './payment-failed-admin.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'ride-confirmation': rideConfirmation,
  'ride-invitation': rideInvitation,
  'discount-ending': discountEnding,
  'new-signup-admin': newSignupAdmin,
  'match-found-client': matchFoundClient,
  'ride-confirmed-escort': rideConfirmedEscort,
  'cancel-by-escort-client': cancelByEscortClient,
  'ride-updated-escort': rideUpdatedEscort,
  'payment-confirm-client': paymentConfirmClient,
  'escort-invoice-ready': escortInvoiceReady,
  'payment-failed-admin': paymentFailedAdmin,
}
