const test = require('blue-tape')
const Dexie = require('dexie')
const DexieBatch = require('./dexie-batch')

const batchSize = 10
const testEntries = Array(42).fill().map((_, i) => i)

testWithTable('basic serial operation', (t, table) => {
  return testBasicOperation(t, table, new DexieBatch({ batchSize }))
})

testWithTable('basic parallel operation', (t, table) => {
  return table.count()
    .then(n => new DexieBatch({ batchSize, limit: n }))
    .then(db => testBasicOperation(t, table, db))
})

function testBasicOperation(t, table, db) {
  let maxIdx = -1
  const readEntries = []

  return Promise.resolve(db)
    .then(db => db.each(table.toCollection(), (entry, i) => {
      readEntries.push(entry)
      maxIdx = Math.max(maxIdx, i)
    }))
    .then(_ => {
      readEntries.sort((a, b) => a - b)
      t.equal(maxIdx + 1, batchSize, 'batches sized correctly')
      t.deepEqual(readEntries, testEntries, 'entries read correctly')
    })
}

function testWithTable(name, f) {
  const db = new Dexie(name)
  db.version(1).stores({ test: '++' })
  db.test.bulkAdd(testEntries)
    .then(_ => test(name, t => {
      return f(t, db.test)
        .then(_ => db.delete())
        .catch(err => {
          db.delete()
          throw err
        })
    }))
}