# Webstorage and Performance Notes

## Safe things to put into web storage

### 1. User preferences
- Theme choice
- Language/locale
- Sound, vibration, and animation settings
- Layout or density preferences

These are small, low-risk, and often reused across sessions.

### 2. UI state that is non-sensitive
- Last visited route or page
- Open/closed panel state
- Last selected filter or sort order
- Scroll position for a specific view

Use `sessionStorage` for temporary tab-only state and `localStorage` for persistent preferences.

### 3. Small feature flags / config values
- Experiment flags
- Remote-config values that are safe to read client-side
- Version markers for cached resources

Always include a version or checksum so stale values can be invalidated.

### 4. Static or semi-static API data
- Public game rules
- Static metadata
- Leaderboard summaries
- Catalog or lookup data

Prefer caching this in IndexedDB or the Cache API rather than `localStorage` when the payload is larger or structured.

### 5. Offline-friendly queue data
- Draft messages
- Pending actions that can be retried later
- Form input that should survive refreshes

This is better suited to IndexedDB because it is more reliable for structured data and larger payloads.

---

## What should not be stored in web storage

Avoid storing:
- Authentication tokens
- Refresh tokens
- Passwords
- Payment details
- Sensitive personal data

These should remain in secure server-side storage or secure cookies.

---

## How to reduce network traffic and make the app feel snappier

### 1. Cache aggressively, but with TTLs
- Use a short expiration window for frequently changing data
- Use a longer window for mostly static resources
- Invalidate automatically when data version changes

Example strategy:
- 5 minutes for live data
- 1 day for static metadata
- 7 days for rarely changing assets

### 2. Prefer stale-while-revalidate
- Show cached data immediately
- Fetch fresh data in the background
- Update the UI when the new response arrives

This makes the app feel instant even when the network is slow.

### 3. Use the Cache API and service workers
- Cache JS/CSS/image assets for repeat visits
- Enable offline support for core screens
- Improve load times on revisits

This is especially useful for mobile web apps and PWAs.

### 4. Prefetch likely next actions
- Prefetch the next page or next game view when the user is idle
- Load likely API data ahead of time
- Warm the cache for common flows

This reduces perceived latency in normal usage.

### 5. Compress and minimize payloads
- Request only the fields you need
- Use pagination or cursor-based loading
- Avoid fetching large blobs when a summary is enough
- Enable gzip/brotli on the server where possible

### 6. Debounce and batch requests
- Debounce typing or filtering requests
- Batch updates instead of sending many tiny requests
- Merge repeated reads into one request where possible

### 7. Use optimistic UI for fast feedback
- Show the local result immediately
- Sync to the server in the background
- Roll back on failure if needed

This makes interactions feel responsive even if the network is slow.

### 8. Use request deduplication
- If multiple components request the same data, share the in-flight promise
- Avoid duplicate API calls for the same resource

This reduces both network traffic and UI jitter.

---

## Recommended storage choice

- `localStorage`: small preferences and simple flags
- `sessionStorage`: temporary UI state for one tab/session
- `IndexedDB`: larger or structured data, offline queue, cached API results
- `Cache API`: static assets and offline responses

For most modern apps, `IndexedDB` plus the Cache API gives the best balance of speed, size, and reliability.

---

## Good default strategy

A strong starting point is:
1. Store small user preferences in `localStorage`
2. Cache small API responses in IndexedDB with a TTL
3. Use a service worker to cache assets and core routes
4. Use stale-while-revalidate for the best perceived speed
5. Never store secrets or sensitive data in browser storage
