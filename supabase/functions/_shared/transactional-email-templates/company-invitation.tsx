/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  companyName?: string
  inviterName?: string
  acceptUrl?: string
  email?: string
}

const CompanyInvitationEmail = ({ companyName, inviterName, acceptUrl, email }: Props) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Je bent uitgenodigd om als chauffeur deel te nemen aan {companyName ?? 'een bedrijf'} op ViaCust</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Uitnodiging als chauffeur</Heading>
        <Text style={text}>
          {inviterName ? <><strong>{inviterName}</strong> heeft je</> : 'Je bent'} uitgenodigd om als chauffeur deel uit te maken van{' '}
          <strong>{companyName ?? 'een bedrijf'}</strong> op ViaCust.
        </Text>
        <Section style={card}>
          <Text style={row}>
            Als chauffeur krijg je je eigen login. Je ziet je toegewezen ritten,
            kunt je live-locatie delen en je uren indienen. Je ziet géén tarieven of facturatie —
            die blijft bij de bedrijfsplanner.
          </Text>
          {email && <Text style={row}><strong>Uitgenodigd e-mailadres:</strong> {email}</Text>}
        </Section>
        {acceptUrl && (
          <Button style={acceptButton} href={acceptUrl}>
            Uitnodiging accepteren
          </Button>
        )}
        <Text style={hint}>
          Deze uitnodiging verloopt over 7 dagen. Heb je nog geen account? Dan maak je die aan
          met hetzelfde e-mailadres als waarop je deze mail hebt ontvangen.
        </Text>
        <Text style={footer}>— Het ViaCust-team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CompanyInvitationEmail,
  subject: (d: Record<string, any>) => `Uitnodiging als chauffeur — ${d.companyName ?? 'ViaCust'}`,
  displayName: 'Bedrijfsuitnodiging chauffeur',
  previewData: {
    companyName: 'Transport BV',
    inviterName: 'Jan de Vries',
    email: 'chauffeur@example.com',
    acceptUrl: 'https://viacust.com/uitnodiging?token=abc',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter Tight', 'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#556070', lineHeight: '1.5', margin: '0 0 20px' }
const card = { backgroundColor: '#f4f6f8', borderLeft: '3px solid #f5a800', padding: '16px 18px', margin: '0 0 24px' }
const row = { fontSize: '14px', color: '#161f2b', margin: '0 0 8px', lineHeight: '1.5' }
const acceptButton = {
  backgroundColor: '#1f8a4c', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' as const,
  borderRadius: '2px', padding: '12px 20px', textDecoration: 'none',
}
const hint = { fontSize: '12px', color: '#888', margin: '14px 0 0', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
