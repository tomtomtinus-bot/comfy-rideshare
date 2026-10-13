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
  amount?: string
  pickup?: string
  dropoff?: string
  plannedAt?: string
  reference?: string
  rideUrl?: string
}

const TicketSubmittedEmail = ({
  clientName, escortName, amount, pickup, dropoff, plannedAt, reference, rideUrl,
}: Props) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Nieuwe ritbon ingediend</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nieuwe ritbon ingediend</Heading>
        <Text style={text}>
          {clientName ? `Hallo ${clientName}, ` : ''}
          {escortName || 'je begeleider'} heeft een ritbon ingediend. Deze is automatisch goedgekeurd; je kunt hem in de app nog afkeuren zolang er geen factuur van is gemaakt.
        </Text>
        <Section style={card}>
          {reference && <Text style={row}><strong>Referentie:</strong> {reference}</Text>}
          {pickup && <Text style={row}><strong>Laadlocatie:</strong> {pickup}</Text>}
          {dropoff && <Text style={row}><strong>Loslocatie:</strong> {dropoff}</Text>}
          {plannedAt && <Text style={row}><strong>Datum:</strong> {plannedAt}</Text>}
          {amount && <Text style={row}><strong>Bedrag:</strong> {amount}</Text>}
        </Section>
        {rideUrl && <Button style={button} href={rideUrl}>Bekijk de ritbon</Button>}
        <Text style={footer}>— Het {SITE_NAME}-team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TicketSubmittedEmail,
  subject: (d: Record<string, any>) => d.reference ? `Ritbon ingediend — ${d.reference}` : 'Nieuwe ritbon ingediend',
  displayName: 'Ritbon ingediend (planner)',
  previewData: { clientName: 'Jan', escortName: 'Pieter Jansen', amount: '€ 412,50', pickup: 'Duisburg', dropoff: 'Rotterdam', plannedAt: '15-01-2026 09:00', reference: 'PO-2026-118', rideUrl: 'https://viacust.com/dashboard' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter Tight', 'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#556070', lineHeight: '1.5', margin: '0 0 20px' }
const card = { backgroundColor: '#fff7e0', borderLeft: '3px solid #f5a800', padding: '16px 18px', margin: '0 0 24px' }
const row = { fontSize: '14px', color: '#161f2b', margin: '0 0 8px', lineHeight: '1.5' }
const button = { backgroundColor: '#1a2a3f', color: '#f5f7f9', fontSize: '14px', borderRadius: '2px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
