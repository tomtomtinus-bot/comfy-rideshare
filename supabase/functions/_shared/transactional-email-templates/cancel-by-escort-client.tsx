/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ViaCust'

interface Props {
  clientName?: string
  escortName?: string
  reason?: string
  pickup?: string
  dropoff?: string
  plannedAt?: string
  reference?: string
  rideUrl?: string
}

const CancelByEscortEmail = ({
  clientName, escortName, reason, pickup, dropoff, plannedAt, reference, rideUrl,
}: Props) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Let op — een begeleider heeft zich afgemeld</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Annulering door begeleider</Heading>
        <Text style={text}>
          {clientName ? `Hallo ${clientName}, ` : ''}
          {escortName ? `Begeleider ${escortName}` : 'Een begeleider'} heeft een verzoek tot annulering ingediend voor onderstaande rit. Open de rit om het verzoek te beoordelen en eventueel direct nieuwe begeleiders uit te nodigen.
        </Text>
        <Section style={card}>
          {reference && <Text style={row}><strong>Referentie:</strong> {reference}</Text>}
          {pickup && <Text style={row}><strong>Vertrek:</strong> {pickup}</Text>}
          {dropoff && <Text style={row}><strong>Bestemming:</strong> {dropoff}</Text>}
          {plannedAt && <Text style={row}><strong>Starttijd:</strong> {plannedAt}</Text>}
          {reason && <Text style={row}><strong>Reden:</strong> {reason}</Text>}
        </Section>
        {rideUrl && <Button style={button} href={rideUrl}>Open de rit</Button>}
        <Text style={footer}>— Het {SITE_NAME}-team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CancelByEscortEmail,
  subject: (d: Record<string, any>) =>
    d.reference ? `Annulering door begeleider — ${d.reference}` : 'Begeleider heeft zich afgemeld',
  displayName: 'Annulering door begeleider (opdrachtgever)',
  previewData: {
    clientName: 'Jan',
    escortName: 'Begeleider #B0421',
    reason: 'Ziek geworden',
    pickup: 'Duisburg',
    dropoff: 'Rotterdam',
    plannedAt: '15 januari 2026, 08:30',
    reference: 'PO-2026-118',
    rideUrl: 'https://viacust.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter Tight', 'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#556070', lineHeight: '1.5', margin: '0 0 20px' }
const card = { backgroundColor: '#f4f6f8', borderLeft: '3px solid #d94343', padding: '16px 18px', margin: '0 0 24px' }
const row = { fontSize: '14px', color: '#161f2b', margin: '0 0 8px', lineHeight: '1.5' }
const button = { backgroundColor: '#1a2a3f', color: '#f5f7f9', fontSize: '14px', borderRadius: '2px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
