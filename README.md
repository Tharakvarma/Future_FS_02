# LeadFlow CRM - Task 2

A simple Client Lead Management System (Mini CRM).

## Features
- Add client leads
- View all leads
- Update lead status: New, Contacted, Converted
- Add notes and follow-ups
- Edit and delete leads
- Search leads
- Dashboard statistics
- MongoDB database

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express.js
- Database: MongoDB

## Run Locally

### 1. Install dependencies
```bash
npm install
```

### 2. Create `.env`
Copy `.env.example` and rename it to `.env`.

Add your MongoDB connection string:
```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

If `MONGODB_URI` is omitted, LeadFlow runs without extra setup and persists data to `data/leads.json`. If MongoDB is configured but unavailable, it also falls back to this local store so the dashboard remains usable.

### 3. Start the project
```bash
npm start
```

Open:
`http://localhost:5000`

## GitHub
Upload this complete project folder to your GitHub repository.

## Suggested screenshots for submission
1. Dashboard
2. Add Lead form
3. Lead listing
4. Updated lead status
