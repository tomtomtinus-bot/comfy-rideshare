/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ViaCust'

interface RideConfirmationProps {
  name?: string
  pickup?: string
  dropoff?: string
  plannedAt?: string
  reference?: string
  rideUrl?: string
}

const RideConfirmationEmail = ({
  name,
  pickup,
  dropoff,
  plannedAt,
  reference,
  rideUrl,
}: RideConfirmationProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Je rit-aanvraag is ontvangen{reference ? ` (${reference})` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Bedankt, ${name}!` : 'Bedankt voor je aanvraag!'}
        </Heading>
        <Text style={text}>
          We hebben je rit-aanvraag ontvangen. Onze begeleiders worden direct uitgenodigd; zodra ze accepteren krijg je een bevestiging met de definitieve bemanning.
        </Text>

        <Section style={card}>
          {reference && (
            <Text style={row}><strong>Referentie:</strong> {reference}</Text>
          )}
          {pickup && (
            <Text style={row}><strong>Vertrek:</strong> {pickup}</Text>
          )}
          {dropoff && (
            <Text style={row}><strong>Bestemming:</strong> {dropoff}</Text>
          )}
          {plannedAt && (
            <Text style={row}><strong>Geplande starttijd:</strong> {plannedAt}</Text>
          )}
        </Section>

        {rideUrl && (
          <Button style={button} href={rideUrl}>
            Bekijk je rit
          </Button>
        )}

        <Text style={footer}>
          Vragen? Stuur een mail naar info@viacust.com.<br />
          — Het {SITE_NAME}-team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RideConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data.reference
      ? `Rit-aanvraag ontvangen — ${data.reference}`
      : 'Je rit-aanvraag is ontvangen',
  displayName: 'Rit-bevestiging (opdrachtgever)',
  previewData: {
    name: 'Jan de Vries',
    pickup: 'Hafenstraße 12, Duisburg',
    dropoff: 'Havenweg 8, Rotterdam',
    plannedAt: '15 januari 2026, 08:30',
    reference: 'PO-2026-118',
    rideUrl: 'https://viacust.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter Tight', 'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#556070', lineHeight: '1.5', margin: '0 0 20px' }
const card = {
  backgroundColor: '#f4f6f8',
  borderLeft: '3px solid #f5a800',
  padding: '16px 18px',
  margin: '0 0 24px',
}
const row = { fontSize: '14px', color: '#161f2b', margin: '0 0 8px', lineHeight: '1.5' }
const button = {
  backgroundColor: '#1a2a3f',
  color: '#f5f7f9',
  fontSize: '14px',
  borderRadius: '2px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
