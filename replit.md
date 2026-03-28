# CloudTasks Web

A Node.js/Express web application for task management with user authentication, file uploads, and admin controls.

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Auth**: JWT (jsonwebtoken) + bcrypt + HTTP-only cookies
- **File Storage**: Cloudinary (via multer-storage-cloudinary)
- **Email**: SendGrid / Nodemailer
- **Port**: 5000 (binds to 0.0.0.0)

## Project Structure

```
/
├── server.js          # Main Express server (all routes & models)
├── index.html         # Landing page
├── login.html         # Login page (default route /)
├── dashboard.html     # User dashboard
├── admin.html         # Admin panel
├── loading.html       # Loading screen
├── applications.json  # Sample application data
└── package.json
```

## Key Features

- User registration with ID photo & selfie upload (stored on Cloudinary)
- JWT-based login with session cookies
- User profile update
- Admin panel to view and update user statuses (Pending / Accepted / Rejected)

## Environment Variables (Secrets)

All secrets are stored in Replit Secrets:

| Key | Purpose |
|-----|---------|
| `MONGODB_URI` | MongoDB connection string |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `JWT_SECRET` | Secret for signing JWT tokens |

## Running

The app is configured as a workflow named **"Start application"** which runs:
```
node server.js
```

## Deployment

Configured for **autoscale** deployment. Run command: `node server.js`.
