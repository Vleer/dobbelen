# Frontend Deployment Guide for Vercel

## Prerequisites
- Vercel account
- This repository pushed to GitHub

## Deployment Steps

1. **Connect Repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." and select "Project"
   - Import your GitHub repository
   - Select the repository containing this frontend code

2. **Configure Build Settings**
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `build` (auto-detected)
   - **Install Command**: `npm install --legacy-peer-deps` (or use the provided vercel.json)

3. **Set Environment Variables**
   In your Vercel project settings, add:
   ```
   REACT_APP_BACKEND_URL=https://your-backend-service.onrender.com
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application
   - Note the deployment URL (e.g., `https://your-app.vercel.app`)

## Alternative: Using vercel.json

This repository includes a `vercel.json` file in the root directory with optimized settings:

- Static asset caching for performance
- SPA routing support
- Environment variable configuration

## Post-Deployment

1. Note your frontend URL from Vercel dashboard
2. Update your backend's `CORS_ALLOWED_ORIGINS` environment variable with this URL
3. Redeploy your backend service if needed

## Environment Variables

Set these in your Vercel project settings:
- `REACT_APP_BACKEND_URL`: Your backend service URL from Render

## Performance Optimizations

The included `vercel.json` provides:
- Long-term caching for static assets
- Proper SPA routing
- Optimized headers

## Troubleshooting

- Check build logs in Vercel dashboard
- Verify environment variables are set correctly
- Ensure REACT_APP_BACKEND_URL points to your deployed backend
- Test API connectivity from browser developer tools
- Check CORS configuration if API calls fail
