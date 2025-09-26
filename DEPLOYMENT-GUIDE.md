# Dobbelen Deployment Guide

This guide covers deploying the Dobbelen game application with the backend on Render and frontend on Vercel.

## Architecture Overview

- **Backend**: Spring Boot application deployed on Render
- **Frontend**: React application deployed on Vercel
- **Communication**: REST API + WebSocket connections

## Quick Start

### 1. Backend Deployment (Render)

1. **Create Render Account**: Sign up at [render.com](https://render.com)

2. **Connect Repository**: 
   - Go to Render Dashboard
   - Create new "Web Service"
   - Connect your GitHub repository

3. **Configure Service**:
   - **Build Command**: `cd backend && ./gradlew build -x test --no-daemon`
   - **Start Command**: `cd backend && java -jar build/libs/backend-0.0.1-SNAPSHOT.jar`
   - **Environment**: Java

4. **Set Environment Variables**:
   ```
   SERVER_PORT=10000
   SPRING_PROFILES_ACTIVE=production
   CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
   ```

5. **Deploy**: Your backend will be available at `https://your-service.onrender.com`

### 2. Frontend Deployment (Vercel)

1. **Create Vercel Account**: Sign up at [vercel.com](https://vercel.com)

2. **Import Project**:
   - Go to Vercel Dashboard
   - Click "Add New... > Project"
   - Import your GitHub repository

3. **Configure Build**:
   - **Framework**: Create React App
   - **Root Directory**: `frontend`
   - Build settings auto-detected

4. **Set Environment Variables**:
   ```
   REACT_APP_BACKEND_URL=https://your-backend.onrender.com
   ```

5. **Deploy**: Your frontend will be available at `https://your-app.vercel.app`

### 3. Final Configuration

1. **Update CORS**: Go back to Render and update the `CORS_ALLOWED_ORIGINS` environment variable with your actual Vercel URL

2. **Test Connection**: Visit your frontend URL and verify the game works properly

## Configuration Files

This repository includes pre-configured deployment files:

- `render.yaml` - Infrastructure as Code for Render
- `vercel.json` - Optimized Vercel configuration
- `backend/src/main/resources/application-production.properties` - Production Spring Boot config

## Environment Variables Reference

### Backend (Render)
- `SERVER_PORT`: Port for the service (10000 for Render)
- `SPRING_PROFILES_ACTIVE`: Set to "production"
- `CORS_ALLOWED_ORIGINS`: Your frontend URL(s)

### Frontend (Vercel)
- `REACT_APP_BACKEND_URL`: Your backend service URL

## Features Included

### Backend
- ✅ Health checks via Spring Actuator
- ✅ Production logging configuration
- ✅ Dynamic CORS configuration
- ✅ WebSocket support for real-time gameplay
- ✅ Optimized build configuration

### Frontend
- ✅ Environment-based API URL configuration
- ✅ Static asset caching
- ✅ SPA routing support
- ✅ WebSocket connection handling
- ✅ Production build optimization

## Monitoring & Health Checks

- **Backend Health**: `https://your-backend.onrender.com/actuator/health`
- **Frontend**: Automatic health monitoring via Vercel
- **Logs**: Available in respective dashboards

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `CORS_ALLOWED_ORIGINS` matches your frontend URL exactly
2. **WebSocket Connection Fails**: Check that backend URL is correctly set in frontend
3. **Build Failures**: Verify all environment variables are set correctly
4. **API Calls Fail**: Check browser developer tools for specific error messages

### Debug Steps

1. Check deployment logs in both platforms
2. Verify environment variables
3. Test health endpoints manually
4. Check browser console for client-side errors

## Performance Optimizations

- Static asset caching (1 year)
- Gzip compression enabled
- Production logging levels
- WebSocket connection pooling
- Optimized Spring Boot production profile

## Security Considerations

- CORS properly configured for production
- Environment variables for sensitive configuration
- Health check endpoints exposed only as needed
- Production logging (no debug information)

## Support

For deployment issues:
1. Check the platform-specific documentation in `/backend/README-DEPLOYMENT.md` and `/frontend/README-DEPLOYMENT.md`
2. Review the troubleshooting section above
3. Check platform status pages (Render/Vercel)

## Next Steps

After successful deployment:
1. Set up custom domains (optional)
2. Configure monitoring and alerts
3. Set up CI/CD for automatic deployments
4. Consider scaling options for higher traffic
