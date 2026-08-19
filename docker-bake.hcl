# Optional Buildx Bake targets with local layer cache.
# Requires: docker buildx
# Usage: docker buildx bake -f docker-bake.hcl
#    or: docker buildx bake -f docker-bake.hcl prod

variable "CACHE_DIR" {
  default = ".docker-cache"
}

group "default" {
  targets = ["backend", "frontend"]
}

group "prod" {
  targets = ["backend-prod", "frontend-prod"]
}

target "backend" {
  context    = "./backend"
  dockerfile = "Dockerfile"
  tags       = ["dobbelen-backend:local"]
  cache-from = ["type=local,src=${CACHE_DIR}/backend"]
  cache-to   = ["type=local,dest=${CACHE_DIR}/backend,mode=max"]
}

target "frontend" {
  context    = "./frontend"
  dockerfile = "Dockerfile"
  tags       = ["dobbelen-frontend:local"]
  cache-from = ["type=local,src=${CACHE_DIR}/frontend"]
  cache-to   = ["type=local,dest=${CACHE_DIR}/frontend,mode=max"]
}

target "backend-prod" {
  context    = "./backend"
  dockerfile = "Dockerfile.prod"
  tags       = ["dobbelen-backend:prod"]
  cache-from = ["type=local,src=${CACHE_DIR}/backend-prod"]
  cache-to   = ["type=local,dest=${CACHE_DIR}/backend-prod,mode=max"]
}

target "frontend-prod" {
  context    = "./frontend"
  dockerfile = "Dockerfile.prod"
  tags       = ["dobbelen-frontend:prod"]
  cache-from = ["type=local,src=${CACHE_DIR}/frontend-prod"]
  cache-to   = ["type=local,dest=${CACHE_DIR}/frontend-prod,mode=max"]
}
