import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ipsPayload } from './ips.ts'

test('ipsPayload builds a payment order with a comma amount and model reference', () => {
  assert.equal(
    ipsPayload({
      account: '160-0000000012345-95',
      payee: 'SZ Bulevar 12',
      amount: '12500.50',
      purpose: 'Zaduženje za Stan 14',
      model: '97',
      reference: '41-0014',
    }),
    'K:PR|V:01|C:1|R:160000000001234595|N:SZ Bulevar 12|I:RSD12500,50|SF:289|S:Zaduženje za Stan 14|RO:9741-0014'
  )
})

test('ipsPayload strips separators, caps lengths and omits RO without a reference', () => {
  const payload = ipsPayload({
    account: '160000000001234595',
    payee: 'A|B\nC',
    amount: '1.00',
    purpose: 'x'.repeat(50),
    model: '97',
    reference: null,
  })
  assert.equal(payload, `K:PR|V:01|C:1|R:160000000001234595|N:A B C|I:RSD1,00|SF:289|S:${'x'.repeat(35)}`)
})
