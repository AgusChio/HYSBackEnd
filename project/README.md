# Health and Safety Reports Backend

A backend system for creating and managing occupational health and safety reports.

## Features

- **User Authentication**: Secure registration and login with Supabase Auth
- **Company Management**: CRUD operations for companies
- **Reports System**: Create and manage detailed health and safety reports
- **Observations & Images**: Record observations with risk levels and images
- **PDF Generation**: Generate professional PDFs of reports
- **RESTful API**: Ready to be consumed by a React frontend
- **Swagger Documentation**: Interactive API documentation

## Tech Stack

- **Node.js & Express**: Backend server and API
- **Supabase**: For Postgres database, authentication, and file storage
- **HTML-PDF**: For PDF generation
- **Swagger**: API documentation

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example` and add your Supabase credentials
4. Run the migrations:
   ```
   npm run migrate
   ```
5. Start the server:
   ```
   npm run dev
   ```

## API Endpoints

The API includes the following main endpoints:

- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- **Companies**: `/api/companies` (GET, POST, PUT, DELETE)
- **Reports**: `/api/reports` (GET, POST, PUT, DELETE)
- **PDF**: `/api/pdf/:reportId` (Generate PDF for a report)

For complete API documentation, visit `/api-docs` when the server is running.

## Database Schema

The system uses the following tables:

- **profiles**: Extended user profile information
- **companies**: Company information (name, CUIT, address, industry)
- **reports**: Health and safety reports
- **observations**: Observations with risk levels and images

## Security

- Row Level Security (RLS) ensures users can only access their own data
- JWT authentication with Supabase Auth
- Secure file uploads to Supabase Storage

## File Structure

```
/
├── src/                    # Source code
│   ├── config/             # Configuration files
│   ├── controllers/        # API controllers
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── scripts/            # Utility scripts
│   └── index.js            # Main application file
├── supabase/
│   └── migrations/         # SQL migrations
├── temp/                   # Temporary files (PDF generation)
├── uploads/                # Temporary upload directory
└── .env                    # Environment variables
```