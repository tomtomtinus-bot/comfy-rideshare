/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ViaCust'

interface RideInvitationProps {
  name?: string
  pickup?: string
  dropoff?: string
  plannedAt?: string
  rideUrl?: string
  acceptUrl?: string
}

const RideInvitationEmail = ({
  name,
  pickup,
  dropoff,
  plannedAt,
  rideUrl,
  acceptUrl,
}: RideInvitationProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Nieuwe rit-uitnodiging — reageer binnen 10 minuten</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Hoi ${name}, een nieuwe rit voor jou` : 'Nieuwe rit-uitnodiging'}
        </Heading>
        <Text style={text}>
          Je bent uitgenodigd voor een konvooi-begeleiding. Bevestig of weiger binnen <strong>10 minuten</strong> in je dashboard — daarna verloopt de uitnodiging automatisch.
        </Text>

        <Section style={card}>
          {pickup && (
            <Text style={row}><strong>Vertrek:</strong> {pickup}</Text>
          )}
          {dropoff && (
            <Text style={row}><strong>Bestemming:</strong> {dropoff}</Text>
          )}
          {plannedAt && (
            <Text style={row}><strong>Starttijd:</strong> {plannedAt}</Text>
          )}
        </Section>

        {acceptUrl && (
          <Button style={acceptButton} href={acceptUrl}>
            ✓ Direct accepteren
          </Button>
        )}
        {rideUrl && (
          <Button style={button} href={rideUrl}>
            Open uitnodiging
          </Button>
        )}
        <Text style={hint}>
          Tip: gebruik "Direct accepteren" om in één klik te bevestigen — geen inlog nodig.
        </Text>

        <Text style={footer}>
          — Het {SITE_NAME}-team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RideInvitationEmail,
  subject: 'Nieuwe rit-uitnodiging — reageer binnen 10 minuten',
  displayName: 'Rit-uitnodiging (begeleider)',
  previewData: {
    name: 'Sven',
    pickup: 'Hafenstraße 12, Duisburg',
    dropoff: 'Havenweg 8, Rotterdam',
    plannedAt: '15 januari 2026, 08:30',
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
