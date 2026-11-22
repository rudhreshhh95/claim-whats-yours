// Run with: node src/lib/familyParser.test.js   (from the frontend folder)
import assert from 'node:assert/strict'
import { parseFamilyText, translateTamil } from './familyParser.js'

const tests = []
const test = (name, fn) => tests.push([name, fn])

test('lowercase single name is title-cased', () => {
  const r = parseFamilyText('rudhresh')
  assert.equal(r.members[0].label, 'Rudhresh')
})

test('"sita" becomes Sita', () => {
  assert.equal(parseFamilyText('sita').members[0].label, 'Sita')
})

test('"12" becomes a child aged 12', () => {
  const m = parseFamilyText('12').members[0]
  assert.equal(m.age, 12)
  assert.equal(m.ageBand, '6_17')
})

test('"student" sets isStudent', () => {
  assert.equal(parseFamilyText('student').members[0].isStudent, true)
})

test('"sita 62 widow farmer" gives Sita, age 62, widow, farmer', () => {
  const m = parseFamilyText('sita 62 widow farmer').members[0]
  assert.equal(m.label, 'Sita')
  assert.equal(m.age, 62)
  assert.equal(m.isWidow, true)
  assert.equal(m.isFarmer, true)
})

test('"name is rudhresh, age 12, student" gives one Rudhresh, not Student Member', () => {
  const members = parseFamilyText('name is rudhresh, age 12, student').members
  assert.equal(members.length, 1)
  assert.equal(members[0].label, 'Rudhresh')
  assert.equal(members[0].age, 12)
  assert.equal(members[0].isStudent, true)
})

test('never produces "Student Member" when a name is given', () => {
  const members = parseFamilyText('kavya 15 student').members
  assert.ok(members.every((m) => m.label !== 'Student Member'))
  assert.equal(members[0].label, 'Kavya')
})

test('farm, farms, farmer, farming and landholding words set isFarmer', () => {
  for (const word of ['farm', 'farms', 'farmer', 'farming', '2 acres', 'land']) {
    const m = parseFamilyText(`sita 60 ${word}`).members[0]
    assert.equal(m.isFarmer, true, `expected isFarmer for "${word}"`)
  }
})

test('incomeBand is null when no amount is given (caller applies lt_1l default)', () => {
  assert.equal(parseFamilyText('sita 62 widow').incomeBand, null)
})

test('income in lakhs is detected', () => {
  assert.equal(parseFamilyText('sita 62 widow, income 3 lakh a year').incomeBand, '2.5l_5l')
})

test('two people in one line are split', () => {
  const members = parseFamilyText('sita 62 widow, rudhresh 12 student').members
  assert.equal(members.length, 2)
  assert.equal(members[0].label, 'Sita')
  assert.equal(members[1].label, 'Rudhresh')
})

test('empty text gives no members', () => {
  assert.deepEqual(parseFamilyText('   ').members, [])
})

test('Tamil transcript converts role and age words to English', () => {
  const en = translateTamil('சீதா 62 வயது விதவை விவசாயி')
  assert.match(en, /Sita/)
  assert.match(en, /age/)
  assert.match(en, /widow/)
  assert.match(en, /farmer/)
})

test('Tamil student and daily wage words convert', () => {
  const en = translateTamil('ருத்ரேஷ் 12 மாணவன்')
  assert.match(en, /Rudhresh/)
  assert.match(en, /student/)
  const wage = translateTamil('முருகன் 38 கூலி')
  assert.match(wage, /daily wage/)
})

let failed = 0
for (const [name, fn] of tests) {
  try {
    fn()
    console.log(`ok   ${name}`)
  } catch (err) {
    failed++
    console.log(`FAIL ${name}\n     ${err.message.split('\n')[0]}`)
  }
}
console.log(`\n${tests.length - failed} passed, ${failed} failed`)
process.exitCode = failed ? 1 : 0
