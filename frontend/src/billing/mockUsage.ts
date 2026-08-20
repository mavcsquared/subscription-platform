/**
 * Per-org usage counter (API requests this billing period), mocked the
 * same way as mockBilling: persisted to localStorage, no dependency on
 * the other billing/auth modules beyond a plain number passed in for
 * seeding. A real backend increments this on every billable request;
 * here mockRecordUsage stands in for that.
 */

const STORE_KEY = 'sp_mock_usage'

function loadStore(): Record<string, number> {
  const raw = localStorage.getItem(STORE_KEY)
  return raw ? (JSON.parse(raw) as Record<string, number>) : {}
}

function saveStore(store: Record<string, number>) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function mockFetchUsage(orgId: string, seedLimit: number): Promise<number> {
  await delay()
  const store = loadStore()
  if (!(orgId in store)) {
    store[orgId] = Math.round(seedLimit * (0.1 + Math.random() * 0.3))
    saveStore(store)
  }
  return store[orgId]
}

export async function mockRecordUsage(orgId: string, amount: number): Promise<number> {
  await delay(150)
  const store = loadStore()
  store[orgId] = (store[orgId] ?? 0) + amount
  saveStore(store)
  return store[orgId]
}
