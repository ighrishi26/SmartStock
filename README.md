# SmartStock – Inventory Management System

SmartStock is a MERN-stack Inventory Management System designed to help businesses manage products, stock movements, suppliers, customers, purchase orders, sales orders, and inventory reports from one centralized application.

## Features

- **Dashboard:** View inventory statistics and business summaries.
- **Authentication:** User login and role-based access.
- **Product Management:** Add, view, update, and manage products.
- **Category Management:** Organize products into categories.
- **Stock Management:** Record stock-in and stock-out transactions.
- **Stock Adjustments:** Correct inventory quantities when required.
- **Stock Movement History:** Track inventory changes.
- **Supplier Management:** Manage supplier information.
- **Customer Management:** Maintain customer records.
- **Purchase Orders:** Manage purchasing activities.
- **Goods Received:** Record received inventory.
- **Sales Orders:** Manage sales transactions.
- **Sales Returns:** Record returned products.
- **Analytics and Reports:** Review inventory and business performance.
- **User Management:** Manage application users.
- **Settings:** Configure application preferences.

## Technology Stack

### Frontend
- React.js
- Vite
- JavaScript
- Tailwind CSS
- Redux Toolkit
- React Router
- Axios
- Recharts

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Tokens (JWT)

## Project Structure

```text
SmartStock/
│
├── client/
│   ├── src/
│   ├── public/
│   ├── .env.example
│   └── package.json
│
├── server/
│   ├── src/
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

## Prerequisites

Install the following before running the project:

- Node.js and npm
- MongoDB or a MongoDB Atlas account
- Visual Studio Code (recommended)

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ighrishi26/SmartStock.git
cd SmartStock
```

### 2. Configure the Backend

```bash
cd server
npm install
```

Create a `.env` file inside the `server` folder using `.env.example` as a reference.

Configure your own values:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=1d
SMARTSTOCK_TEST_EMAIL=
SMARTSTOCK_TEST_PASSWORD=
```

**Important:** Replace the example values with your own configuration. Never commit your actual `.env` file or expose database credentials.

### 3. Start the Backend

From the `server` directory:

```bash
npm run dev
```

The backend is configured to run on:

```text
http://localhost:5000
```

### 4. Configure the Frontend

Open another terminal:

```bash
cd client
npm install
```

Create a `.env` file inside the `client` folder:

```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Start the Frontend

From the `client` directory:

```bash
npm run dev
```

Open the local URL displayed by Vite, typically:

```text
http://localhost:5174
```

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Backend server port |
| `NODE_ENV` | Application environment |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used for JWT signing |
| `JWT_EXPIRES_IN` | JWT token expiration |
| `VITE_API_URL` | Frontend API base URL |
| `SMARTSTOCK_TEST_EMAIL` | Optional test account email |
| `SMARTSTOCK_TEST_PASSWORD` | Optional test account password |

## Security

- Keep credentials in environment variables.
- Do not upload `.env` files to GitHub.
- Use a strong, private JWT secret.
- Configure MongoDB access permissions appropriately.
- Do not publish real customer or business information without authorization.

## Repository

GitHub: https://github.com/ighrishi26/SmartStock

## Project Purpose

SmartStock aims to simplify inventory operations by providing a centralized platform for monitoring stock, managing business transactions, and generating useful reports.

---

**SmartStock – Smarter Inventory Management.**