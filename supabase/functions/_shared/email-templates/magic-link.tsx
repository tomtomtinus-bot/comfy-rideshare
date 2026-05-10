/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Je inloglink voor {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Je inloglink</Heading>
        <Text style={text}>
          Klik op de knop hieronder om in te loggen bij {siteName}. Deze link verloopt binnenkort.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Inloggen
        </Button>
        <Text style={footer}>
          Heb je deze link niet aangevraagd? Dan kun je deze e-mail negeren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter Tight', 'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#161f2b',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#556070',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#1a2a3f',
  color: '#f5f7f9',
  fontSize: '14px',
  borderRadius: '2px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
