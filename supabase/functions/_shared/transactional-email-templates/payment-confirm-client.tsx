/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ViaCust'

interface Props {
  clientName?: string
  invoiceNumber?: string
  amount?: string
  paidAt?: string
  invoiceUrl?: string
}

const PaymentConfirmClientEmail = ({
  clientName, invoiceNumber, amount, paidAt, invoiceUrl,
}: Props) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Betaling ontvangen — factuur {invoiceNumber ?? ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{clientName ? `Bedankt, ${clientName}!` : 'Betaling ontvangen'}</Heading>
        <Text style={text}>
          We hebben je betaling ontvangen. De factuur is voor je administratie beschikbaar in de app.
        </Text>
        <Section style={card}>
          {invoiceNumber && <Text style={row}><strong>Factuur:</strong> {invoiceNumber}</Text>}
          {amount && <Text style={row}><strong>Bedrag:</strong> {amount}</Text>}
          {paidAt && <Text style={row}><strong>Betaald op:</strong> {paidAt}</Text>}
        </Section>
        {invoiceUrl && <Button style={button} href={invoiceUrl}>Bekijk factuur</Button>}
        <Text style={footer}>— Het {SITE_NAME}-team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentConfirmClientEmail,
  subject: (d: Record<string, any>) =>
    d.invoiceNumber ? `Betaling ontvangen — ${d.invoiceNumber}` : 'Betaling ontvangen',
  displayName: 'Betalingsbevestiging (opdrachtgever)',
  previewData: {
    clientName: 'Jan',
    invoiceNumber: 'PI-2026-007',
    amount: '€ 245,30',
    paidAt: '15 januari 2026',
    invoiceUrl: 'https://viacust.com/facturen',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter Tight', 'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#556070', lineHeight: '1.5', margin: '0 0 20px' }
const card = { backgroundColor: '#f4f6f8', borderLeft: '3px solid #2d8a4f', padding: '16px 18px', margin: '0 0 24px' }
const row = { fontSize: '14px', color: '#161f2b', margin: '0 0 8px', lineHeight: '1.5' }
const button = { backgroundColor: '#1a2a3f', color: '#f5f7f9', fontSize: '14px', borderRadius: '2px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
