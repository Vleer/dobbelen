# Deployment Setup Guide

This guide explains how to set up automated deployment for the Dobbelen project.

## Overview

The deployment workflow automatically:
1. **Builds** Docker images for backend and frontend on every push to `main`
2. **Pushes** images to GitHub Container Registry (GHCR)
3. **Updates** Kubernetes deployment manifests in the `infra` repository
4. **Triggers** ArgoCD to deploy the new images to your cluster

## Prerequisites

### 1. GitHub Personal Access Token (PAT)

The workflow needs a Personal Access Token to update the `infra` repository.

**Create a PAT:**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name: `Dobbelen Deployment Automation`
4. Set expiration as needed (recommend 90 days or no expiration for automation)
5. Select the following scopes:
   - ✅ `repo` (Full control of private repositories)
6. Click "Generate token"
7. **Copy the token immediately** (you won't see it again!)

**Add the secret to your repository:**
1. Go to your `dobbelen` repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `INFRA_REPO_TOKEN`
5. Value: Paste the PAT you just created
6. Click "Add secret"

### 2. ArgoCD Setup

Ensure ArgoCD is configured to watch the `infra` repository:
- ArgoCD should monitor the `infra` repository's `apps/dobbelen` directory
- Auto-sync should be enabled for automatic deployments
- The sync policy should allow automated updates

### 3. Image Pull Secrets (if using private GHCR)

If your GHCR images are private, you'll need to configure Kubernetes image pull secrets:

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT \
  --docker-email=YOUR_EMAIL
```

Then update `deployment.yaml` to reference this secret:
```yaml
spec:
  imagePullSecrets:
    - name: ghcr-secret
```

## How It Works

### Workflow Trigger
The workflow runs automatically when:
- Code is pushed to the `main` branch
- Manually triggered via GitHub Actions UI (workflow_dispatch)

### Build Process
1. Checks out the `dobbelen` repository
2. Logs into GitHub Container Registry using `GITHUB_TOKEN`
3. Builds backend and frontend Docker images with caching
4. Tags images with both `latest` and the git commit SHA
5. Pushes images to `ghcr.io/YOUR_USERNAME/dobbelen-backend` and `dobbelen-frontend`

### Deployment Process
1. Checks out the `infra` repository using `INFRA_REPO_TOKEN`
2. Updates `apps/dobbelen/deployment.yaml` with new image tags
3. Commits and pushes changes to the `infra` repository
4. ArgoCD detects the changes and syncs the deployment

## Image Naming Convention

Images are tagged with:
- `latest` - Always points to the most recent build
- `<git-sha>` - Specific commit SHA for versioning and rollbacks

Example:
```
ghcr.io/vleer/dobbelen-backend:latest
ghcr.io/vleer/dobbelen-backend:a1b2c3d4e5f6...
```

## Monitoring Deployments

### GitHub Actions
- View workflow runs: `https://github.com/YOUR_USERNAME/dobbelen/actions`
- Each run shows:
  - Build logs for backend and frontend
  - Image tags that were created
  - Manifest update status

### ArgoCD
- Access your ArgoCD dashboard
- Find the `dobbelen` application
- Monitor sync status and health
- View deployment history and rollback if needed

## Troubleshooting

### Workflow fails with "INFRA_REPO_TOKEN not found"
- Ensure you've created the PAT and added it as a repository secret
- Verify the secret name is exactly `INFRA_REPO_TOKEN`

### Images build but deployment doesn't update
- Check if the `update-manifests` job succeeded
- Verify the PAT has `repo` scope
- Ensure the `infra` repository path is correct

### ArgoCD doesn't sync
- Check ArgoCD application configuration
- Verify auto-sync is enabled
- Check ArgoCD logs for sync errors
- Manually trigger a sync from ArgoCD UI

### Image pull errors in Kubernetes
- Verify images are public in GHCR, or
- Configure image pull secrets (see Prerequisites section)
- Check image names match exactly in deployment.yaml

## Manual Deployment

To manually trigger a deployment:
1. Go to Actions tab in the `dobbelen` repository
2. Select "Deploy to Kubernetes (GHCR)" workflow
3. Click "Run workflow"
4. Select the `main` branch
5. Click "Run workflow"

## Rollback

To rollback to a previous version:
1. Find the commit SHA of the working version
2. Update `infra/apps/dobbelen/deployment.yaml` manually:
   ```yaml
   image: ghcr.io/vleer/dobbelen-backend:PREVIOUS_SHA
   ```
3. Commit and push, or use ArgoCD's rollback feature
