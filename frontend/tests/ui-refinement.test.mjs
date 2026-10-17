import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as model from '../src/model.ts'

const options = { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../tsconfig.app.json', import.meta.url)) }
const { AmountDisplay } = await tsImport('../src/components/AmountDisplay.tsx', options)
const { TransactionRow } = await tsImport('../src/components/TransactionRow.tsx', options)
const { Header } = await tsImport('../src/components/Header.tsx', options)
const { BottomNav } = await tsImport('../src/components/BottomNav.tsx', options)
const render = (Component, props) => renderToStaticMarkup(createElement(Component, props))
const source = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('amount display keeps grouping, currency symbol and unambiguous ISO code', () => {
  const html = render(AmountDisplay, { amount: model.formatAmountInput('8000.50'), currency: 'COP' })
  assert.match(html, /8\.000,50/)
  assert.match(html, /\$/)
  assert.match(html, /COP/)
  assert.equal(model.currencySymbol('EUR'), '€')
  assert.equal(model.currencySymbol('COP'), '$')
  assert.equal(model.currencySymbol('not-a-currency'), 'not-a-currency')
})

test('currency presentation does not round amounts or modify keypad values', () => {
  assert.equal(model.formatAmountInput('9007199254740993.01'), '9.007.199.254.740.993,01')
  assert.equal(model.formatAmountInput('8000.'), '8.000,')
  assert.equal(model.formatAmountInput('8000.50', 'en-US'), '8,000.50')
  assert.equal(model.editAmount('8000', '.'), '8000.')
  assert.equal(model.formatMinorUnits('150000', 2), '1.500,00')
})

test('today total respects scales and never mixes currencies or simulation receipts', () => {
  const now = new Date(2026, 9, 16, 12)
  const receipt = (value, assetScale, assetCode = 'COP', mode = 'live') => ({
    amountReceived: { value, assetScale, assetCode }, issuedAt: now.getTime(), mode,
  })
  const receipts = [receipt('150000', 2), receipt('1', 0), receipt('99999', 0, 'USD'), receipt('7777', 0, 'COP', 'simulator'),
    { ...receipt('4444', 0), issuedAt: new Date(2026, 9, 15, 12).getTime() }]
  assert.equal(model.formatReceivedToday(receipts, 'COP', now), '1.501,00')
  assert.equal(model.formatReceivedToday([], 'COP', now), '0')
  assert.equal(model.formatReceivedToday([receipt('900719925474099301', 2)], 'COP', now), '9.007.199.254.740.993,01')
})

test('the generated QR and keypad share presentation without formatting sale data', () => {
  const collect = source('../src/views/CollectView.tsx')
  assert.match(collect, /amount=\{formatAmountInput\(activeSale\.amount\)\}/)
  assert.match(collect, /amount=\{formatAmountInput\(amount\)\}/)
  assert.match(collect, /amount: amount,/)
  assert.match(collect, /encodeSaleToQr\(sale\)/)
})

test('transaction rows have a profile-like avatar, currency symbol and native button semantics', () => {
  const html = render(TransactionRow, {id:'sale-1', title:'Venta #12345678', date:'10:00', formattedAmount:'1.500,00', currency:'COP', statusLabel:'Esperando pago', statusTone:'warning', onClick:()=>{}})
  assert.match(html, /^<button/)
  assert.match(html, /transaction-avatar/)
  assert.match(html, /\$/)
  assert.match(html, /1\.500,00/)
  assert.match(html, /Esperando pago/)
  assert.doesNotMatch(html, /src="https:/)
})

test('connectivity dot is an accessible disclosure rather than a provider health claim', () => {
  for (const isOnline of [true, false]) {
    const html = render(Header, {currentRoute:'inicio', onRouteChange:()=>{}, isOnline})
    assert.match(html, /aria-expanded="false"/)
    assert.match(html, /aria-controls="connectivity-details"/)
    assert.match(html, isOnline ? /En línea/ : /Sin conexión/)
    assert.match(html, /connectivity-dot/)
  }
})

test('navigation floats and selected routes retain accessible state', () => {
  const html = render(BottomNav, {currentRoute:'movimientos', onRouteChange:()=>{}})
  assert.match(html, /floating-nav/)
  assert.match(html, /aria-current="page"/)
  assert.match(html, /Escanear código QR/)
  assert.equal(render(BottomNav, {currentRoute:'bienvenida', onRouteChange:()=>{}}), '')
})

test('motion has a reduced-motion alternative and camera width has no artificial cap', () => {
  const css = source('../src/App.css')
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.amount-change/)
  const scanner = source('../src/views/ScannerModal.tsx')
  assert.match(scanner, /scanner-viewport/)
  assert.doesNotMatch(scanner, /max-w-\[320px\]/)
  assert.match(scanner, /type="submit"/)
})
