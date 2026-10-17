import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { es } from '../src/copy.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('design tokens in index.css match design.md specifications', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../src/index.css'), 'utf-8')
  
  const requiredTokens = [
    '--color-brand: #260F61;',
    '--color-brand-secondary: #5634A3;',
    '--color-lime: #CFFA86;',
    '--color-lavender: #DFD2FF;',
    '--color-cream: #FFF7E8;',
    '--color-forest: #174F3A;',
    '--color-text: #17151D;',
     '--color-muted: #6F6B76;',
    '--color-border: #EAE8EF;',
    '--color-bg: #FFFFFF;',
    '--color-surface: #F9F8FC;',
    '--color-success: #177454;',
    '--color-warning: #A86614;',
    '--color-danger: #C73E55;',
    '--radius-card: 24px;',
    '--radius-control: 16px;',
    '--radius-pill: 999px;',
  ]

  for (const token of requiredTokens) {
    assert.ok(css.includes(token), `Missing design token in index.css: ${token}`)
  }
})

test('spanish text catalog has complete navigation, actions and honest financial states', () => {
  assert.equal(es.brand, 'Relevo')
  assert.equal(es.navigation.inicio, 'Inicio')
  assert.equal(es.navigation.movimientos, 'Movimientos')
  assert.equal(es.navigation.escanear, 'Escanear')
  assert.equal(es.navigation.cuenta, 'Tu cuenta')
  assert.equal(es.actions.collect, 'Cobrar')
  assert.equal(es.actions.pay, 'Pagar')
  
  // Non-alarmist, honest messaging (S4)
  assert.ok(es.collect.prerequisite.length > 0)
  assert.ok(es.home.noBalance.includes('no es el saldo de tu banco'))
})

test('component barrel index exports all design system elements', () => {
  const indexContent = fs.readFileSync(path.resolve(__dirname, '../src/components/index.ts'), 'utf-8')
  const expectedExports = [
    'Buttons',
    'IconAction',
    'AmountDisplay',
    'Numpad',
    'StatusChip',
    'EmptyState',
    'OfflineBanner',
    'WalletCard',
    'TransactionRow',
    'BottomNav',
    'Header',
  ]

  for (const exp of expectedExports) {
    assert.ok(indexContent.includes(exp), `Missing export for ${exp} in components/index.ts`)
  }
})
