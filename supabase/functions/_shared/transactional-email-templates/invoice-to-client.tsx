/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ViaCust'

interface Props {
  recipientName?: string
  invoiceNumber?: string
  senderName?: string
  amount?: string
  periodStart?: string
  periodEnd?: string
  pdfUrl?: string
  xmlUrl?: string
}

const InvoiceToClientEmail = ({
  recipientName, invoiceNumber, senderName, amount, periodStart, periodEnd, pdfUrl, xmlUrl,
}: Props) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>{`Factuur ${invoiceNumber ?? ''} van ${senderName ?? SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {recipientName ? `Beste ${recipientName},` : 'Beste klant,'}
        </Heading>
        <Text style={text}>
          {senderName ? `${senderName} heeft` : 'Wij hebben'} een nieuwe factuur voor u klaargezet.
          U kunt de PDF en de bijbehorende UBL e-factuur (XML) hieronder downloaden.
        </Text>
        <Section style={card}>
          {invoiceNumber && <Text style={row}><strong>Factuurnummer:</strong> {invoiceNumber}</Text>}
          {(periodStart && periodEnd) && (
            <Text style={row}><strong>Periode:</strong> {periodStart} t/m {periodEnd}</Text>
          )}
          {amount && <Text style={row}><strong>Totaalbedrag:</strong> {amount}</Text>}
        </Section>
        {pdfUrl && (
          <Section style={{ marginBottom: '12px' }}>
            <Button style={primaryButton} href={pdfUrl}>Download factuur (PDF)</Button>
          </Section>
        )}
        {xmlUrl && (
          <Section style={{ marginBottom: '24px' }}>
            <Button style={secondaryButton} href={xmlUrl}>Download e-factuur (UBL XML)</Button>
          </Section>
        )}
        <Text style={smallText}>
          De UBL XML is bedoeld voor automatische verwerking in uw boekhoudsoftware
          (SI-UBL 2.0 / Peppol BIS Billing 3.0). De downloadlinks zijn 30 dagen geldig.
        </Text>
        <Text style={footer}>— {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoiceToClientEmail,
  subject: (d: Record<string, any>) =>
    d.invoiceNumber
      ? `Factuur ${d.invoiceNumber}${d.senderName ? ` van ${d.senderName}` : ''}`
      : 'Uw factuur staat klaar',
  displayName: 'Factuur naar klant (PDF + XML)',
  previewData: {
    recipientName: 'Jan de Vries',
    invoiceNumber: 'F-2026-014',
    senderName: 'Transport BV',
    amount: '€ 1.245,80',
    periodStart: '01-01-2026',
    periodEnd: '31-01-2026',
    pdfUrl: 'https://viacust.com/factuur.pdf',
    xmlUrl: 'https://viacust.com/factuur.xml',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter Tight', 'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#556070', lineHeight: '1.5', margin: '0 0 20px' }
const card = { backgroundColor: '#f4f6f8', borderLeft: '3px solid #f5a800', padding: '16px 18px', margin: '0 0 24px' }
const row = { fontSize: '14px', color: '#161f2b', margin: '0 0 8px', lineHeight: '1.5' }
const primaryButton = { backgroundColor: '#1a2a3f', color: '#f5f7f9', fontSize: '14px', borderRadius: '2px', padding: '12px 20px', textDecoration: 'none' as const }
const secondaryButton = { backgroundColor: '#ffffff', color: '#1a2a3f', fontSize: '14px', borderRadius: '2px', padding: '11px 19px', textDecoration: 'none' as const, border: '1px solid #1a2a3f' }
const smallText = { fontSize: '12px', color: '#7a8492', lineHeight: '1.5', margin: '0 0 20px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
