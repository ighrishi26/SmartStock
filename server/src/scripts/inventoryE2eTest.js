const BASE_URL = process.env.SMARTSTOCK_API_URL || 'http://localhost:5000/api'

const assert = require('node:assert/strict')

let cookie = ''

async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
    ...options.headers,
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const raw = await response.text()
  let data = {}

  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = { message: raw }
  }

  if (!response.ok && !options.allowError) {
    throw new Error(
      `${options.method || 'GET'} ${path} failed (${response.status}): ` +
      `${data.message || data.error || raw || 'Unknown error'}`
    )
  }

  return { status: response.status, data }
}

function getList(data, keys) {
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key]
  }

  return []
}

async function run() {
  const email = process.env.SMARTSTOCK_TEST_EMAIL
  const password = process.env.SMARTSTOCK_TEST_PASSWORD

  assert.ok(email, 'Set SMARTSTOCK_TEST_EMAIL before running this script')
  assert.ok(password, 'Set SMARTSTOCK_TEST_PASSWORD before running this script')

  console.log('\n=== SmartStock end-to-end test ===')
  console.log(`API: ${BASE_URL}`)
  console.log('1. Checking API health...')

  const health = await fetch(`${BASE_URL}/health`)
  assert.equal(health.status, 200, 'API health check should return HTTP 200')
  console.log('   PASS: API is healthy')

  console.log('2. Logging in with the existing admin account...')

  const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const loginText = await loginResponse.text()
  let loginData = {}

  try {
    loginData = loginText ? JSON.parse(loginText) : {}
  } catch {
    throw new Error(`Login returned an unexpected response: ${loginText}`)
  }

  assert.equal(
    loginResponse.status,
    200,
    `Admin login failed: ${loginData.message || loginResponse.status}`
  )

  const setCookies = typeof loginResponse.headers.getSetCookie === 'function'
    ? loginResponse.headers.getSetCookie()
    : [loginResponse.headers.get('set-cookie') || '']

  const authCookie = setCookies.find(value =>
    value.startsWith('smartstock_token=')
  )

  assert.ok(authCookie, 'Login succeeded but the smartstock_token cookie was not returned')
  cookie = authCookie.split(';')[0]

  assert.equal(loginData.success, true, 'Login response should indicate success')
  assert.equal(loginData.user?.role, 'admin', 'The test account must have admin role')

  console.log('   PASS: Admin authenticated; password is not printed')

  console.log('3. Loading existing categories...')

  const categoryResponse = await request('/categories')
  const categories = getList(categoryResponse.data, ['categories'])

  assert.ok(categories.length > 0, 'No categories found. Create a category in SmartStock first.')

  const category = categories.find(item => item.isActive !== false) || categories[0]
  const categoryId = category._id || category.id

  assert.ok(categoryId, 'Could not find the selected category ID')
  console.log(`   PASS: Using existing category "${category.name}"`)

  const stamp = `${Date.now()}`
  const sku = `E2E-${stamp}`
  const supplierEmail = `smartstock.e2e.${stamp}@example.com`
  let productId
  let supplierId
  let orderId
  let orderNumber

  console.log('4. Creating a uniquely named test product...')

  const productResponse = await request('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: `E2E Test Product ${stamp}`,
      sku,
      description: 'Created by the SmartStock end-to-end test',
      category: categoryId,
      quantity: 0,
      unit: 'pcs',
      costPrice: 5,
      sellingPrice: 10,
      reorderLevel: 2,
      location: 'E2E Test',
    }),
  })

  const product = productResponse.data.product
  assert.ok(product, 'Product creation response did not contain a product')
  productId = product._id || product.id

  assert.ok(productId, 'Created product has no ID')
  assert.equal(product.sku, sku)
  assert.equal(product.quantity, 0)

  console.log(`   PASS: Product created (${sku})`)

  console.log('5. Verifying product retrieval...')

  const productGet = await request(`/products/${productId}`)
  const fetchedProduct = productGet.data.product

  assert.ok(fetchedProduct, 'Product retrieval response is missing the product')
  assert.equal(fetchedProduct.sku, sku)
  assert.equal(fetchedProduct.quantity, 0)

  const productSearch = await request(`/products?search=${encodeURIComponent(sku)}`)
  const foundProducts = getList(productSearch.data, ['products'])

  assert.ok(foundProducts.some(item => (item._id || item.id) === productId),
    'Created product was not found in product search')

  console.log('   PASS: Product details and product search verified')

  console.log('6. Creating a uniquely named test supplier...')

  const supplierResponse = await request('/suppliers', {
    method: 'POST',
    body: JSON.stringify({
      name: `E2E Test Supplier ${stamp}`,
      contactPerson: 'SmartStock Test',
      email: supplierEmail,
      phone: '',
      address: 'E2E test record',
      notes: 'Created by the SmartStock end-to-end test',
    }),
  })

  const supplier = supplierResponse.data.supplier
  assert.ok(supplier, 'Supplier creation response did not contain a supplier')
  supplierId = supplier._id || supplier.id

  assert.ok(supplierId, 'Created supplier has no ID')

  const supplierSearch = await request(
    `/suppliers?search=${encodeURIComponent(supplierEmail)}`
  )
  const foundSuppliers = getList(supplierSearch.data, ['suppliers'])

  assert.ok(foundSuppliers.some(item => (item._id || item.id) === supplierId),
    'Created supplier was not found in supplier search')

  console.log('   PASS: Supplier created and found in search')

  console.log('7. Creating a fresh purchase order...')

  const orderResponse = await request('/purchase-orders', {
    method: 'POST',
    body: JSON.stringify({
      supplierId,
      items: [
        {
          productId,
          quantity: 2,
          unitCost: 5,
        },
      ],
      notes: 'E2E test order; safe to inspect after the test',
      status: 'Ordered',
    }),
  })

  const order = orderResponse.data.order
  assert.ok(order, 'Purchase order creation response did not contain an order')
  orderId = order._id || order.id
  orderNumber = order.orderNumber

  assert.ok(orderId, 'Created purchase order has no ID')
  assert.equal(order.status, 'Ordered')
  assert.equal(order.items?.length, 1)

  const itemId = order.items[0]._id || order.items[0].id
  assert.ok(itemId, 'Purchase order item has no ID')

  console.log(`   PASS: Order ${orderNumber} created with status Ordered`)

  console.log('   Verifying purchase order retrieval...')

const orderGetResponse = await request(`/purchase-orders/${orderId}`)
const fetchedOrder = orderGetResponse.data.order

assert.ok(fetchedOrder, 'Purchase order retrieval returned no order')
assert.equal(fetchedOrder.orderNumber, orderNumber)
assert.equal(fetchedOrder.status, 'Ordered')

const orderListResponse = await request(
  `/purchase-orders?search=${encodeURIComponent(orderNumber)}`
)
const foundOrders = getList(orderListResponse.data, ['orders'])

assert.ok(
  foundOrders.some(item => (item._id || item.id) === orderId),
  'Created purchase order was not found in purchase order search'
)

console.log('   PASS: Purchase order details and search verified')

  console.log('8. Receiving exactly 2 units on the new test order...')

  const receiveResponse = await request(`/purchase-orders/${orderId}/receive`, {
    method: 'POST',
    body: JSON.stringify({
      items: [{ itemId, quantity: 2 }],
    }),
  })

  const receivedOrder = receiveResponse.data.order

  assert.ok(receivedOrder, 'Receive response did not contain the updated order')
  assert.equal(receivedOrder.status, 'Received', 'Order should be fully received')

  console.log('   PASS: New test order received once')

  console.log('9. Verifying inventory quantity...')

  const afterReceiveResponse = await request(`/products/${productId}`)
  const afterReceive = afterReceiveResponse.data.product

  assert.equal(afterReceive.quantity, 2, 'Inventory should increase from 0 to 2')

  console.log('   PASS: Product quantity changed from 0 to 2')

  console.log('10. Verifying stock movement history...')

  const movementResponse = await request(
    `/stock-movements/product/${productId}?page=1&limit=100`
  )
  const movements = getList(movementResponse.data, ['movements'])

  const movement = movements.find(item =>
    item.type === 'stock_in' &&
    item.quantity === 2 &&
    item.previousQuantity === 0 &&
    item.newQuantity === 2 &&
    String(item.note || '').includes(String(orderNumber))
  )

  assert.ok(movement, 'Expected stock_in movement was not found in movement history')

  console.log('   PASS: stock_in movement has correct quantity and stock values')

  console.log('11. Verifying the completed order cannot be received again...')

  const repeatedReceive = await request(`/purchase-orders/${orderId}/receive`, {
    method: 'POST',
    body: JSON.stringify({
      items: [{ itemId, quantity: 1 }],
    }),
    allowError: true,
  })

  assert.ok(
    repeatedReceive.status >= 400,
    `Expected repeated receipt to fail, but received HTTP ${repeatedReceive.status}`
  )

  const finalProductResponse = await request(`/products/${productId}`)
  const finalProduct = finalProductResponse.data.product

  assert.equal(finalProduct.quantity, 2, 'Stock must remain 2 after rejected repeat receipt')

  console.log('   PASS: Repeated receipt rejected; stock remained unchanged')

  console.log('\n=== ALL TESTS PASSED ===')
  console.log('Test records were retained; no existing records were deleted.')
  console.log(`Product SKU: ${sku}`)
  console.log(`Product ID: ${productId}`)
  console.log(`Supplier email: ${supplierEmail}`)
  console.log(`Purchase order: ${orderNumber}`)
  console.log(`Final product quantity: ${finalProduct.quantity}`)
}

run().catch(error => {
  console.error('\n=== TEST FAILED ===')
  console.error(error.message)
  console.error('Any records created before the failure have been retained.')
  process.exitCode = 1
})