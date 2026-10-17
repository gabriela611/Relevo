import test from 'node:test'
import assert from 'node:assert/strict'
import { toMinorUnits, formatMinorUnits, editAmount, paymentPresentation, resolveRoute } from '../src/model.ts'

test('amounts preserve exact integer minor units for the wallet scale', () => {
  assert.equal(toMinorUnits('8000', 0), '8000')
  assert.equal(toMinorUnits('8.01', 2), '801')
  assert.equal(toMinorUnits('0.001', 3), '1')
  assert.equal(toMinorUnits('9007199254740993.01', 2), '900719925474099301')
  assert.equal(toMinorUnits('1.01', 0), null)
  assert.equal(toMinorUnits('-1', 2), null)
  assert.equal(toMinorUnits('1e4', 2), null)
  assert.equal(toMinorUnits('', 2), null)
  assert.equal(toMinorUnits('1', -1), null)
})

test('display respects asset scale instead of currency defaults', () => {
  assert.equal(formatMinorUnits('801', 2, 'es-CO'), '8,01')
  assert.equal(formatMinorUnits('8000', 0, 'es-CO'), '8.000')
  assert.equal(formatMinorUnits('1', 3, 'en-US'), '0.001')
  assert.equal(formatMinorUnits('900719925474099301', 2, 'en-US'), '9,007,199,254,740,993.01')
})

test('keypad has deterministic append, decimal and delete behavior', () => {
  assert.equal(editAmount('0', '8'), '8')
  assert.equal(editAmount('8', '.'), '8.')
  assert.equal(editAmount('8.1', '.'), '8.1')
  assert.equal(editAmount('8.1', 'delete'), '8.')
  assert.equal(editAmount('8', 'delete'), '0')
  assert.equal(editAmount('8', 'x'), '8')
})

test('only verified financial states show a payment check', () => {
  for (const state of ['LOCAL_DRAFT', 'AWAITING_PAYMENT', 'AWAITING_CONSENT', 'PROCESSING', 'FAILED', 'EXPIRED', 'INVALID_RECEIPT']) {
    assert.equal(paymentPresentation(state).verified, false, state)
  }
  assert.equal(paymentPresentation('OFFLINE_RECEIPT_VERIFIED').label, 'Recibo validado sin internet')
  assert.equal(paymentPresentation('RECONCILED').label, 'Pago conciliado')
  assert.notEqual(paymentPresentation('OFFLINE_RECEIPT_VERIFIED').label, paymentPresentation('RECONCILED').label)
  assert.equal(paymentPresentation('unexpected').verified, false)
})

test('unknown routes return to home, never a nonexistent screen', () => {
  assert.equal(resolveRoute('#cobrar'), 'cobrar')
  assert.equal(resolveRoute('#cuenta'), 'cuenta')
  assert.equal(resolveRoute('#not-built'), 'inicio')
})
