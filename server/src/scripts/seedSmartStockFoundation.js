
require('dotenv').config()

const mongoose = require('mongoose')
const connectDB = require('../config/db')

const User = require('../models/User')
const Category = require('../models/Category')
const Product = require('../models/Product')
const Supplier = require('../models/Supplier')
const Customer = require('../models/Customer')

const TARGET = 100
const TAG = '[SYNTHETIC-TEST-DATA]'

const categoryNames = [
  'Electronics', 'Computers', 'Laptop Accessories', 'Desktop Accessories',
  'Monitors and Displays', 'Computer Components', 'Networking Equipment',
  'Network Cables', 'Storage Devices', 'Printers and Scanners',
  'Printer Consumables', 'Audio Equipment', 'Video Conferencing',
  'Power Protection', 'Batteries and Chargers', 'Office Furniture',
  'Office Chairs', 'Office Desks', 'Storage Cabinets', 'Shelving Units',
  'Stationery', 'Paper Products', 'Writing Supplies', 'Filing Supplies',
  'Desk Organizers', 'Presentation Supplies', 'Mailroom Supplies',
  'Office Machines', 'Meeting Room Supplies', 'Planning Supplies',
  'Electrical Cables', 'Switches and Sockets', 'Lighting Equipment',
  'Circuit Protection', 'Electrical Connectors', 'Power Supplies',
  'Electrical Enclosures', 'Electrical Installation', 'Electrical Tools',
  'Hand Tools', 'Power Tools', 'Measuring Tools', 'Cutting Tools',
  'Drill Accessories', 'Fasteners', 'Tool Storage', 'Workshop Equipment',
  'Abrasives', 'Maintenance Tools', 'Bearings', 'Pneumatic Components',
  'Hydraulic Components', 'Industrial Hoses', 'Pumps and Pump Parts',
  'Electric Motors', 'Valves and Fittings', 'Industrial Filters',
  'Lubricants', 'Material Handling', 'Warehouse Equipment',
  'Warehouse Consumables', 'Protective Clothing', 'Safety Footwear',
  'Hand Protection', 'Eye Protection', 'Head Protection',
  'Respiratory Protection', 'First Aid Supplies', 'Fire Safety',
  'Safety Signage', 'Fall Protection', 'Corrugated Boxes', 'Cartons',
  'Bubble Wrap', 'Stretch Film', 'Packing Tape', 'Protective Foam',
  'Shipping Labels', 'Strapping Supplies', 'Mailing Envelopes',
  'Packing Fillers', 'Packaging Equipment', 'Building Maintenance',
  'Cleaning Chemicals', 'Mops and Brooms', 'Cleaning Cloths',
  'Waste Bags and Bins', 'Washroom Supplies', 'Sanitation Supplies',
  'Floor Care', 'Cleaning Equipment', 'Door Hardware', 'Hinges and Locks',
  'Bolts and Nuts', 'Screws and Washers', 'Anchors and Brackets',
  'Furniture Hardware', 'Assembly Supplies', 'Quality Control Equipment',
  'Production Line Supplies', 'Repair Components'
]

const products = [
  ['Wireless Mouse', 'pcs', 450, 799],
  ['USB Keyboard', 'pcs', 550, 999],
  ['USB-C Hub', 'pcs', 850, 1499],
  ['Laptop Stand', 'pcs', 650, 1199],
  ['24-inch Monitor', 'pcs', 6200, 8999],
  ['Gigabit Network Switch', 'pcs', 1800, 2799],
  ['Wi-Fi Router', 'pcs', 1400, 2299],
  ['External SSD 1TB', 'pcs', 4800, 6499],
  ['Laser Printer', 'pcs', 8500, 10999],
  ['HDMI Cable 2m', 'pcs', 180, 349],
  ['Surge Protector', 'pcs', 550, 899],
  ['USB-C Cable 1m', 'pcs', 120, 249],
  ['Desktop RAM Module', 'pcs', 1600, 2299],
  ['Laptop Charger', 'pcs', 900, 1499],
  ['Webcam Full HD', 'pcs', 1100, 1799],
  ['Headset with Microphone', 'pcs', 750, 1299],
  ['Bluetooth Speaker', 'pcs', 950, 1599],
  ['Portable Projector', 'pcs', 14500, 18999],
  ['Power Bank 20000mAh', 'pcs', 1100, 1799],
  ['Ethernet Cable 5m', 'pcs', 220, 399],
  ['A4 Copier Paper Ream', 'ream', 220, 299],
  ['Ballpoint Pens Pack', 'pack', 75, 120],
  ['Permanent Marker Set', 'pack', 110, 175],
  ['Spiral Notebook', 'pcs', 45, 75],
  ['Lever Arch File', 'pcs', 85, 139],
  ['Document Folder', 'pcs', 30, 59],
  ['Whiteboard Marker Set', 'pack', 160, 249],
  ['Stapler', 'pcs', 120, 199],
  ['Staple Pins Box', 'box', 25, 45],
  ['Desk Organizer', 'pcs', 180, 299],
  ['LED Panel Light', 'pcs', 650, 999],
  ['LED Bulb 12W', 'pcs', 95, 159],
  ['Electrical Extension Board', 'pcs', 450, 749],
  ['Copper Wire 1.5mm', 'roll', 1150, 1499],
  ['MCB Circuit Breaker', 'pcs', 220, 349],
  ['Industrial Plug', 'pcs', 160, 259],
  ['Cable Tie Pack', 'pack', 80, 129],
  ['Rechargeable Battery Pack', 'pack', 350, 549],
  ['Digital Multimeter', 'pcs', 650, 999],
  ['Insulation Tape Pack', 'pack', 90, 149],
  ['Adjustable Wrench', 'pcs', 350, 549],
  ['Screwdriver Set', 'set', 420, 699],
  ['Cordless Drill', 'pcs', 2800, 3999],
  ['Combination Plier', 'pcs', 250, 399],
  ['Measuring Tape 5m', 'pcs', 130, 219],
  ['Hex Key Set', 'set', 180, 299],
  ['Claw Hammer', 'pcs', 300, 479],
  ['Utility Knife', 'pcs', 90, 149],
  ['Drill Bit Set', 'set', 450, 699],
  ['Tool Box', 'pcs', 850, 1299],
  ['Safety Helmet', 'pcs', 280, 449],
  ['Safety Goggles', 'pcs', 95, 159],
  ['Protective Gloves', 'pair', 75, 129],
  ['Reflective Safety Vest', 'pcs', 180, 299],
  ['Steel Toe Safety Shoes', 'pair', 950, 1499],
  ['First Aid Kit', 'pcs', 450, 699],
  ['Fire Extinguisher 2kg', 'pcs', 1250, 1799],
  ['Ear Protection Muffs', 'pcs', 220, 349],
  ['Dust Mask Pack', 'pack', 150, 249],
  ['Safety Harness', 'pcs', 1250, 1899],
  ['Corrugated Shipping Box', 'pcs', 35, 59],
  ['Packing Tape Roll', 'pcs', 45, 79],
  ['Bubble Wrap Roll', 'roll', 350, 549],
  ['Stretch Film Roll', 'roll', 280, 449],
  ['Shipping Label Pack', 'pack', 180, 299],
  ['Packing Strap Roll', 'roll', 420, 649],
  ['Courier Envelope Pack', 'pack', 120, 199],
  ['Foam Protective Sheet', 'pack', 250, 399],
  ['Cardboard Divider Set', 'set', 160, 259],
  ['Pallet Wrap Dispenser', 'pcs', 650, 999],
  ['Hex Bolt Pack', 'pack', 120, 199],
  ['Stainless Steel Screw Pack', 'pack', 140, 229],
  ['Washer Assortment Box', 'box', 180, 299],
  ['Wall Anchor Pack', 'pack', 110, 179],
  ['Door Hinge Pair', 'pair', 150, 249],
  ['Cabinet Lock', 'pcs', 180, 299],
  ['Metal Bracket Pair', 'pair', 120, 199],
  ['Stainless Steel Handle', 'pcs', 95, 159],
  ['Padlock', 'pcs', 160, 269],
  ['Mounting Rail', 'pcs', 280, 449],
  ['Floor Cleaner 5L', 'can', 420, 649],
  ['Glass Cleaner 1L', 'bottle', 110, 179],
  ['Microfiber Cleaning Cloth', 'pcs', 35, 59],
  ['Cotton Mop', 'pcs', 180, 299],
  ['Industrial Broom', 'pcs', 120, 199],
  ['Waste Bin 20L', 'pcs', 350, 549],
  ['Liquid Soap Refill 5L', 'can', 380, 599],
  ['Paper Towel Pack', 'pack', 150, 249],
  ['Cleaning Brush Set', 'set', 140, 229],
  ['Hand Sanitizer 500ml', 'bottle', 95, 159],
  ['Ball Bearing 6202', 'pcs', 90, 149],
  ['Pneumatic Air Hose', 'meter', 120, 199],
  ['Hydraulic Hose Fitting', 'pcs', 180, 299],
  ['Industrial Oil Filter', 'pcs', 240, 399],
  ['Centrifugal Pump Seal', 'pcs', 320, 499],
  ['Electric Motor Coupling', 'pcs', 550, 899],
  ['Brass Ball Valve', 'pcs', 280, 449],
  ['Air Filter Cartridge', 'pcs', 350, 549],
  ['Industrial Lubricant 1L', 'bottle', 280, 449],
  ['Manual Pallet Truck Wheel', 'pcs', 650, 999],
  ['Steel Storage Shelf', 'pcs', 2200, 3299],
]

const supplierBases = [
  'Apex Office Supplies', 'Western Electrical Traders',
  'Pioneer Industrial Components', 'Metro Packaging Solutions',
  'Reliable Computer Systems', 'Summit Safety Products',
  'Prime Hardware Distributors', 'Evergreen Cleaning Supplies',
  'Precision Tools Supply', 'BluePeak Network Supplies',
  'Crestline Paper Products', 'National Bearing Supply',
  'Urban Workspace Furnishings', 'Brightline Lighting',
  'Vertex Industrial Stores', 'SilverOak Stationers',
  'SwiftPack Materials', 'CoreTech Peripherals',
  'Allied Fastener Supply', 'NorthStar Maintenance Supplies',
  'Meridian Electrical Works', 'Deccan Industrial Supply',
  'Harborline Packaging', 'ClearPath Office Systems',
  'Greenfield Workshop Supplies'
]

const customerBases = [
  'Meridian Business Services', 'Cedarbrook Engineering',
  'Westfield Learning Centre', 'Pioneer Design Studio',
  'Summit Healthcare Services', 'Lakeside Consulting Group',
  'Greenfield Manufacturing', 'Harborview Logistics',
  'BluePeak Technology Services', 'Crestline Retail Group',
  'SilverOak Facilities Management', 'UrbanEdge Architects',
  'Evergreen Research Centre', 'NorthStar Distribution',
  'BrightPath Training Institute', 'Apex Business Solutions',
  'Meadowbrook Packaging', 'Metroline Service Centre',
  'Vertex Industrial Works', 'Riverside Office Solutions',
  'Oakridge Technical Services', 'Westgate Manufacturing',
  'Clearwater Business Centre', 'Highland Engineering Group',
  'Parkview Learning Services'
]

const cities = [
  ['Pune', 'Maharashtra', '411001'],
  ['Mumbai', 'Maharashtra', '400001'],
  ['Nashik', 'Maharashtra', '422001'],
  ['Nagpur', 'Maharashtra', '440001'],
  ['Navi Mumbai', 'Maharashtra', '400703'],
  ['Thane', 'Maharashtra', '400601'],
  ['Kolhapur', 'Maharashtra', '416003'],
  ['Indore', 'Madhya Pradesh', '452001'],
  ['Ahmedabad', 'Gujarat', '380001'],
  ['Surat', 'Gujarat', '395003'],
]

const pad = (n) => String(n).padStart(4, '0')

async function upsertCategory(name, createdBy) {
  return Category.findOneAndUpdate(
    { name },
    {
      $setOnInsert: {
        name,
        description: `${name} inventory classification. ${TAG}`,
        createdBy,
      },
    },
    { upsert: true, new: true, runValidators: true }
  )
}

async function main() {
  try {
    await connectDB()

    const admin = await User.findOne({
      role: 'admin',
      isActive: true,
    }).select('_id')

    if (!admin) {
      throw new Error('No active admin user found. Stopping without seeding.')
    }

    console.log('Using existing admin account. No users will be created or changed.')

    // Categories: insert missing names only.
    for (const name of categoryNames) {
      await upsertCategory(name, admin._id)
    }

    const categories = await Category.find().sort({ name: 1 })

    if (categories.length < TARGET) {
      throw new Error(
        `Only ${categories.length} categories were created; at least ${TARGET} are required.`
      )
    }

    // Products: do not overwrite an existing SKU.
    for (let i = 0; i < products.length; i++) {
      const [name, unit, costPrice, sellingPrice] = products[i]
      const sku = `SS-${pad(i + 1)}`

      if (await Product.exists({ sku })) continue

      const category = categories[i % categories.length]
      const lowStock = i % 5 === 0
      const reorderLevel = lowStock ? 12 : 8 + (i % 12)
      const quantity = lowStock ? 4 + (i % 4) : 25 + ((i * 13) % 150)

      await Product.create({
        name,
        sku,
        description: `${name}. ${TAG}`,
        category: category._id,
        quantity,
        unit,
        costPrice,
        sellingPrice,
        reorderLevel,
        location: `${cities[i % cities.length][0]} Warehouse`,
        isActive: true,
        createdBy: admin._id,
      })
    }

    // Suppliers: synthetic test contacts only.
    for (let i = 0; i < TARGET; i++) {
      const city = cities[i % cities.length]
      const name = `${supplierBases[i % supplierBases.length]} - ${city[0]} ${pad(i + 1)}`

      if (await Supplier.exists({ name })) continue

      await Supplier.create({
        name,
        contactPerson: `Test Contact ${pad(i + 1)}`,
        email: `supplier${pad(i + 1)}@example.com`,
        phone: `TEST-SUP-${pad(i + 1)}`,
        address: `Synthetic test address ${100 + i}, ${city[0]}, ${city[1]} ${city[2]}`,
        notes: `${TAG} Synthetic supplier; not a verified business.`,
        isActive: true,
        createdBy: admin._id,
      })
    }

    // Customers: synthetic test businesses only.
    for (let i = 0; i < TARGET; i++) {
      const city = cities[i % cities.length]
      const name = `${customerBases[i % customerBases.length]} - ${city[0]} ${pad(i + 1)}`
      const customerCode = `CUST-${pad(i + 1)}`

      if (await Customer.exists({ customerCode })) continue

      const address = `Synthetic test address ${200 + i}, ${city[0]}, ${city[1]} ${city[2]}`

      await Customer.create({
        customerCode,
        name,
        company: name,
        email: `customer${pad(i + 1)}@example.com`,
        phone: `TEST-CUS-${pad(i + 1)}`,
        billingAddress: address,
        shippingAddress: address,
        notes: `${TAG} Synthetic customer; not a verified customer record.`,
        isActive: true,
        createdBy: admin._id,
      })
    }

    console.log('\n--- Foundation Seed Results ---')

    for (const [label, Model] of [
      ['Users', User],
      ['Categories', Category],
      ['Products', Product],
      ['Suppliers', Supplier],
      ['Customers', Customer],
    ]) {
      console.log(`${label}: ${await Model.countDocuments()}`)
    }

    console.log('\nFoundation stage complete.')
    console.log('No orders, returns, stock adjustments, or stock movements were created.')
    console.log(`Inserted synthetic records are marked: ${TAG}`)
  } catch (error) {
    console.error('\nFoundation seed failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

main()
