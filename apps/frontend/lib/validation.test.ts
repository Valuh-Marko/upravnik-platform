import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidAccountNumber, isValidMaticniBroj, isValidPib, normaliseAccountNumber } from './validation.ts'

test('normaliseAccountNumber pads the middle part and accepts 18 digits', () => {
  assert.equal(normaliseAccountNumber('160-12345-95'), '160000000001234595')
  assert.equal(normaliseAccountNumber(' 160000000001234595 '), '160000000001234595')
  assert.equal(normaliseAccountNumber('160-12345-9'), null)
  assert.equal(normaliseAccountNumber('16012345'), null)
})

test('isValidAccountNumber checks the mod-97 control number', () => {
  assert.equal(isValidAccountNumber('160-12345-95'), true)
  assert.equal(isValidAccountNumber('160-12345-96'), false)
  assert.equal(isValidAccountNumber('abc'), false)
})

test('isValidPib needs 9 digits with a valid check digit', () => {
  assert.equal(isValidPib('100002887'), true)
  assert.equal(isValidPib('104052135'), true)
  assert.equal(isValidPib('100002888'), false)
  assert.equal(isValidPib('10000288'), false)
})

test('isValidMaticniBroj needs exactly 8 digits', () => {
  assert.equal(isValidMaticniBroj('12345678'), true)
  assert.equal(isValidMaticniBroj('1234567'), false)
  assert.equal(isValidMaticniBroj('1234567a'), false)
})
