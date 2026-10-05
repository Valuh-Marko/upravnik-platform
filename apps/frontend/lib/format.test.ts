import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatDateTime, fromParas, parseMoneyInput, toParas } from './format.ts'

test('parseMoneyInput reads Serbian and plain amounts', () => {
  assert.equal(parseMoneyInput('12.500'), '12500.00')
  assert.equal(parseMoneyInput('1.500.000,50'), '1500000.50')
  assert.equal(parseMoneyInput('12,5'), '12.50')
  assert.equal(parseMoneyInput('12.50'), '12.50')
  assert.equal(parseMoneyInput('12.5'), '12.50')
  assert.equal(parseMoneyInput('12 500,00'), '12500.00')
  assert.equal(parseMoneyInput('12.50.0'), null)
  assert.equal(parseMoneyInput('abc'), null)
})

test('toParas and fromParas are exact', () => {
  assert.equal(toParas('1234.56'), BigInt(123456))
  assert.equal(toParas('0.1') + toParas('0.20'), BigInt(30))
  assert.equal(toParas('-3.5'), BigInt(-350))
  assert.equal(toParas('100'), BigInt(10000))
  assert.equal(fromParas(toParas('0.10') + toParas('0.20')), '0.30')
  assert.equal(fromParas(BigInt(-5)), '-0.05')
  assert.equal(fromParas(BigInt(150000050)), '1500000.50')
})

test('formatDateTime uses the Belgrade day', () => {
  assert.equal(formatDateTime('2026-03-14T23:30:00Z'), '15. 3. 2026.')
  assert.equal(formatDateTime('2026-03-14T12:00:00Z'), '14. 3. 2026.')
})
