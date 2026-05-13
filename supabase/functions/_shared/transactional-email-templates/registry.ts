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

export const TEMPLATES: Record<string, TemplateEntry> = {
  'ride-confirmation': rideConfirmation,
  'ride-invitation': rideInvitation,
  'discount-ending': discountEnding,
}
