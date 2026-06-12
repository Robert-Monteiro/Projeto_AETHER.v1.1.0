# AETHER - Asset Management System

> Coloque sua logo `aether.png` em `frontend/public/logos/` para substituir o texto no cabeçalho.

A comprehensive IT Asset Management system built with Node.js, React, and PostgreSQL. This system provides complete asset lifecycle management, compliance monitoring, reporting, and integration capabilities.

## Features

### 🔍 **Inventory Management**
- Hardware, software, and license tracking
- Automatic asset discovery via inventory agent
- Real-time asset status monitoring
- Asset categorization and tagging

### 🔄 **Asset Lifecycle Management**
- Acquisition to disposal tracking
- Maintenance scheduling
- Warranty and license expiration alerts
- Asset history and audit trails

### ✅ **Compliance Monitoring**
- License compliance checking
- Warranty expiration tracking
- Regulatory compliance reports
- Automated alerts for non-compliance

### 📊 **Analytics & Reporting**
- Interactive dashboards with charts
- Custom report generation
- Asset utilization analytics
- Cost analysis and ROI tracking

### 🔗 **Integration Capabilities**
- REST API for third-party integrations
- Active Directory/LDAP integration
- ServiceNow and Jira integration
- Webhook support for real-time updates

## Tech Stack

- **Backend**: Node.js, Express.js, PostgreSQL
- **Frontend**: React, Redux Toolkit, Material-UI
- **Authentication**: JWT + OAuth 2.0 (Google)
- **Real-time**: Socket.io
- **Agent**: Python-based inventory collection

## Installation

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Python 3.8+ (for inventory agent)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up database:
```sql
-- Run the SQL scripts in database/setup.sql
```

5. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

> The frontend will be served at `http://localhost:3000` thanks to the `basename` configuration in React Router. Update `FRONTEND_URL` accordingly when using the API.

### Inventory Agent Setup

1. Navigate to agent directory:
```bash
cd agent
```

2. Install Python dependencies:
```bash
pip install requests psutil
```

3. Run the agent:
```bash
python inventory_agent.py
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ti_sistema
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret

# OAuth (Google)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/users/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:3000/aether

# Server
PORT=5000
NODE_ENV=development
```

## API Documentation

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile

### Assets
- `GET /api/assets` - Get all assets
- `POST /api/assets` - Create new asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset
- `GET /api/assets/compliance/check` - Check compliance

### Tickets
- `GET /api/tickets` - Get all tickets
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket

## Database Schema

Key tables:
- `users` - User accounts and roles
- `assets` - Asset inventory
- `tickets` - Support tickets
- `asset_history` - Asset lifecycle history

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the development team or create an issue in the repository.