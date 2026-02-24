# Deployment Security Guide — GeoLeaf

> This guide covers recommended HTTP security headers, CSP configuration, and server hardening for deploying GeoLeaf in production.

---

## Table of Contents

1. [HTTP Security Headers](#1-http-security-headers)
2. [Content Security Policy (CSP)](#2-content-security-policy-csp)
3. [Server Configuration Examples](#3-server-configuration-examples)
   - [Apache (.htaccess)](#31-apache-htaccess)
   - [Nginx](#32-nginx)
   - [Vercel (vercel.json)](#33-vercel-verceljson)
4. [Compression (gzip / Brotli)](#4-compression-gzip--brotli)
5. [HTTPS Enforcement](#5-https-enforcement)
6. [Cache-Control Headers](#6-cache-control-headers)

---

## 1. HTTP Security Headers

The following headers should be set on **all responses** from your web server:

| Header                      | Recommended Value                                  | Purpose                                           |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| `X-Content-Type-Options`    | `nosniff`                                          | Prevents MIME-type sniffing attacks               |
| `X-Frame-Options`           | `SAMEORIGIN`                                       | Prevents clickjacking via `<iframe>` embedding    |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                  | Limits referrer information leakage               |
| `Permissions-Policy`        | `geolocation=(self), camera=(), microphone=()`     | Restricts browser feature access                  |
| `Content-Security-Policy`   | See section 2                                      | Prevents XSS by whitelisting content sources      |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`              | Forces HTTPS (only set after HTTPS is confirmed)  |

---

## 2. Content Security Policy (CSP)

GeoLeaf loads resources from CDNs (unpkg, cdnjs, Google Fonts) and tile servers. Use the following CSP as a starting point and adjust to match your actual tile providers and CDN usage.

### Full CSP for a standard GeoLeaf deployment

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self'
    https://unpkg.com
    https://cdnjs.cloudflare.com;
  style-src 'self'
    'unsafe-inline'
    https://unpkg.com
    https://cdnjs.cloudflare.com
    https://fonts.googleapis.com;
  font-src
    https://fonts.gstatic.com;
  img-src 'self'
    data:
    https://*.tile.openstreetmap.org
    https://*.basemaps.cartocdn.com
    https://*.tile.opentopomap.org;
  connect-src 'self'
    https://*.tile.openstreetmap.org
    https://*.basemaps.cartocdn.com
    https://*.tile.opentopomap.org;
  worker-src 'self' blob:;
  manifest-src 'self';
  frame-ancestors 'none';
```

> **Note:** `'unsafe-inline'` in `style-src` is required by Leaflet and MapLibre GL which inject inline styles. If your CSP tooling supports nonce-based inline styles, prefer that approach.

### If you use the Service Worker (offline mode)

Add to `script-src`:
```
script-src 'self' https://unpkg.com https://cdnjs.cloudflare.com blob:;
```

### If you use MapLibre GL vector tiles

Add your vector tile server to `connect-src` and `img-src`:
```
connect-src 'self' https://your-tile-server.example.com;
img-src 'self' data: https://your-tile-server.example.com;
```

---

## 3. Server Configuration Examples

### 3.1 Apache (.htaccess)

```apache
<IfModule mod_headers.c>
    # Security headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(self), camera=(), microphone=()"

    # Content Security Policy
    Header always set Content-Security-Policy "\
        default-src 'self'; \
        script-src 'self' https://unpkg.com https://cdnjs.cloudflare.com; \
        style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://fonts.googleapis.com; \
        font-src https://fonts.gstatic.com; \
        img-src 'self' data: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; \
        connect-src 'self' https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; \
        worker-src 'self' blob:; \
        frame-ancestors 'none';"

    # HSTS (only enable after confirming HTTPS works end-to-end)
    # Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
    AddOutputFilterByType DEFLATE image/svg+xml
</IfModule>

# Serve pre-compressed Brotli files if available
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTP:Accept-Encoding} br
    RewriteCond %{REQUEST_FILENAME}.br -f
    RewriteRule (.*)$ $1.br [L]
    <FilesMatch "\.br$">
        Header set Content-Encoding br
    </FilesMatch>
</IfModule>
```

### 3.2 Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL configuration (use certbot / Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    root /var/www/your-app;
    index index.html;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(self), camera=(), microphone=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://unpkg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; connect-src 'self' https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; worker-src 'self' blob:; frame-ancestors 'none';" always;

    # HSTS (only enable after confirming HTTPS works end-to-end)
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    # Brotli compression (requires ngx_brotli module)
    # brotli on;
    # brotli_comp_level 6;
    # brotli_types text/plain text/css application/json application/javascript image/svg+xml;

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Never cache HTML
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

### 3.3 Vercel (vercel.json)

```json
{
    "headers": [
        {
            "source": "/(.*)",
            "headers": [
                {
                    "key": "X-Content-Type-Options",
                    "value": "nosniff"
                },
                {
                    "key": "X-Frame-Options",
                    "value": "SAMEORIGIN"
                },
                {
                    "key": "Referrer-Policy",
                    "value": "strict-origin-when-cross-origin"
                },
                {
                    "key": "Permissions-Policy",
                    "value": "geolocation=(self), camera=(), microphone=()"
                },
                {
                    "key": "Content-Security-Policy",
                    "value": "default-src 'self'; script-src 'self' https://unpkg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; connect-src 'self' https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; worker-src 'self' blob:; frame-ancestors 'none';"
                }
            ]
        },
        {
            "source": "/(.*)\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)",
            "headers": [
                {
                    "key": "Cache-Control",
                    "value": "public, max-age=31536000, immutable"
                }
            ]
        },
        {
            "source": "/(.*)\\.html",
            "headers": [
                {
                    "key": "Cache-Control",
                    "value": "no-cache, no-store, must-revalidate"
                }
            ]
        }
    ]
}
```

---

## 4. Compression (gzip / Brotli)

Enabling compression reduces the transfer size significantly:

| File                          | Uncompressed | gzip    | Brotli  |
| ----------------------------- | ------------ | ------- | ------- |
| `geoleaf.umd.js`              | ~100 KB      | ~35 KB  | ~28 KB  |
| `geoleaf-storage.plugin.js`   | ~60 KB       | ~20 KB  | ~16 KB  |
| `geoleaf-addpoi.plugin.js`    | ~80 KB       | ~26 KB  | ~21 KB  |
| `geoleaf-main.min.css`        | ~25 KB       | ~6 KB   | ~5 KB   |

> **Recommendation:** Enable Brotli if your server supports it (Nginx with `ngx_brotli`, Caddy natively, Vercel/Cloudflare natively). Fall back to gzip for broad compatibility.

### Pre-compressing assets (recommended for static deployments)

```bash
# Generate .gz and .br files alongside originals
find dist/ -type f \( -name "*.js" -o -name "*.css" \) | while read f; do
    gzip -k -9 "$f"
    brotli -k -q 11 "$f"
done
```

Your server can then serve `.br` or `.gz` files directly without runtime compression overhead.

---

## 5. HTTPS Enforcement

GeoLeaf itself validates URLs and permits both `http:` and `https:` by default. For production:

1. **Configure your server** to redirect all HTTP traffic to HTTPS (see examples above).
2. **Enable HSTS** once you confirm HTTPS works correctly (`Strict-Transport-Security: max-age=31536000; includeSubDomains`).
3. **Starting in v4.1+**, you can enforce HTTPS-only URL validation in the GeoLeaf config:
   ```json
   {
       "security": {
           "httpsOnly": true
       }
   }
   ```

---

## 6. Cache-Control Headers

| Resource type             | Recommended Cache-Control                    |
| ------------------------- | -------------------------------------------- |
| `index.html`              | `no-cache, no-store, must-revalidate`         |
| `*.js`, `*.css` (hashed)  | `public, max-age=31536000, immutable`         |
| `*.js`, `*.css` (generic) | `public, max-age=3600`                        |
| `*.geojson`, `*.json`     | `public, max-age=300` (5 min) or as needed   |
| `profiles/*/profile.json` | `public, max-age=86400` (1 day)              |
| Tile images               | `public, max-age=86400` (deferred to origin) |

> Versioned filenames (e.g., `geoleaf.umd.v4.0.0.js`) allow `immutable` caching safely. Generic filenames should use shorter TTLs.

---

## Related Documentation

- [`SECURITY.md`](../SECURITY.md) — Vulnerability reporting policy
- [`GUIDE_CONFIGURATIONS_COMPLET.md`](../GUIDE_CONFIGURATIONS_COMPLET.md) — Full configuration reference
- [GeoLeaf website](https://geoleaf.dev)
