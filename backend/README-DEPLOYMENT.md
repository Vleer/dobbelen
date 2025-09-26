# Backend Deployment Guide for Render

## Prerequisites
- Render account
- This repository pushed to GitHub

## Deployment Steps

1. **Connect Repository to Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Select the repository containing this backend code

2. **Configure Build Settings**
   - **Build Command**: `cd backend && ./gradlew build -x test --no-daemon`
   - **Start Command**: `cd backend && java -jar build/libs/backend-0.0.1-SNAPSHOT.jar`
   - **Environment**: `Java`

3. **Set Environment Variables**
   Required environment variables:
   ```
   SERVER_PORT=10000
   SPRING_PROFILES_ACTIVE=production
   CORS_ALLOWED_ORIGINS=https://your-frontend-app.vercel.app
   ```

4. **Advanced Settings**
   - **Health Check Path**: `/actuator/health`
   - **Auto-Deploy**: `Yes` (recommended)

## Alternative: Using render.yaml

This repository includes a `render.yaml` file in the root directory for Infrastructure as Code deployment:

1. Place the `render.yaml` file in your repository root
2. Connect your repository to Render
3. Render will automatically detect and use the configuration
4. Update the `CORS_ALLOWED_ORIGINS` environment variable after frontend deployment

## Post-Deployment

1. Note your backend URL (e.g., `https://your-service.onrender.com`)
2. Use this URL as `REACT_APP_BACKEND_URL` in your frontend deployment
3. Update `CORS_ALLOWED_ORIGINS` with your actual frontend URL

## Health Check

The service includes health check endpoints:
- `/actuator/health` - Service health status
- `/actuator/info` - Application information

## Troubleshooting

- Check application logs in Render dashboard
- Verify environment variables are set correctly
- Ensure CORS_ALLOWED_ORIGINS matches your frontend URL exactly
- Test health endpoints manually if needed
