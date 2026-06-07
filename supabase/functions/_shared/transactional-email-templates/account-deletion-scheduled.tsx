/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ViaCust'

interface Props { scheduledAt?: string }

const AccountDeletionScheduled = ({ scheduledAt }: Props) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Je account wordt over 30 dagen verwijderd</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Verwijderverzoek ontvangen</Heading>
        <Text style={text}>
          We hebben je verzoek ontvangen om je {SITE_NAME}-account te verwijderen.
        </Text>
        <Section style={card}>
          <Text style={cardLabel}>Definitieve verwijderdatum</Text>
          <Text style={cardValue}><strong>{scheduledAt ?? 'over 30 dagen'}</strong></Text>
        </Section>
        <Text style={text}>
          Tot die datum kun je het verzoek nog ongedaan maken door in te loggen
          en op "Verwijdering annuleren" te klikken. Na die datum worden je
          account en gegevens definitief verwijderd.
        </Text>
        <Text style={footer}>Met vriendelijke groet, het {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountDeletionScheduled,
  subject: 'Je verwijderverzoek is geregistreerd',
  displayName: 'Account-verwijdering — bevestiging',
  previewData: { scheduledAt: '7 juli 2026' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#000', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: '#fdf6e8', border: '1px solid #e8d6a8', padding: '16px 18px', borderRadius: '4px', margin: '20px 0' }
const cardLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: '#8a6d2c', margin: '0 0 6px', fontWeight: 'bold' as const }
const cardValue = { fontSize: '14px', color: '#3a2e0e', lineHeight: '1.5', margin: 0 }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0', lineHeight: '1.5' }
