/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ViaCust'

interface Props {
  escortName?: string
  summary?: string
  pickup?: string
  dropoff?: string
  plannedAt?: string
  reference?: string
  rideUrl?: string
}

const RideUpdatedEscortEmail = ({
  escortName, summary, pickup, dropoff, plannedAt, reference, rideUrl,
}: Props) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Let op — ritdetails gewijzigd</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Let op — ritdetails gewijzigd</Heading>
        <Text style={text}>
          {escortName ? `Hallo ${escortName}, ` : ''}
          de opdrachtgever heeft onderstaande rit aangepast. Open de rit in de app om de actuele gegevens te bekijken.
        </Text>
        <Section style={card}>
          {reference && <Text style={row}><strong>Referentie:</strong> {reference}</Text>}
          {pickup && <Text style={row}><strong>Vertrek:</strong> {pickup}</Text>}
          {dropoff && <Text style={row}><strong>Bestemming:</strong> {dropoff}</Text>}
          {plannedAt && <Text style={row}><strong>Starttijd:</strong> {plannedAt}</Text>}
          {summary && <Text style={row}><strong>Wijziging:</strong> {summary}</Text>}
        </Section>
        {rideUrl && <Button style={button} href={rideUrl}>Bekijk de wijzigingen</Button>}
        <Text style={footer}>— Het {SITE_NAME}-team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RideUpdatedEscortEmail,
  subject: (d: Record<string, any>) =>
    d.reference ? `Ritwijziging — ${d.reference}` : 'Let op — ritdetails gewijzigd',
  displayName: 'Ritwijziging (begeleider)',
  previewData: {
    escortName: 'Peter',
    summary: 'Nieuwe tijd: 15-01-2026 09:00. Vertrek aangepast.',
    pickup: 'Duisburg',
    dropoff: 'Rotterdam',
    plannedAt: '15 januari 2026, 09:00',
    reference: 'PO-2026-118',
    rideUrl: 'https://viacust.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter Tight', 'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#556070', lineHeight: '1.5', margin: '0 0 20px' }
const card = { backgroundColor: '#fff7e0', borderLeft: '3px solid #f5a800', padding: '16px 18px', margin: '0 0 24px' }
const row = { fontSize: '14px', color: '#161f2b', margin: '0 0 8px', lineHeight: '1.5' }
const button = { backgroundColor: '#1a2a3f', color: '#f5f7f9', fontSize: '14px', borderRadius: '2px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
