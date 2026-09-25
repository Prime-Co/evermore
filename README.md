# Evermore — Clean Frontend Package

This package is a cleaned and reorganized frontend extracted from the downloaded Evermore website.

## Current architecture
- Static multi-page HTML frontend
- Shared CSS in `assets/css/styles.css`
- Shared font stylesheet in `assets/css/fonts.css`
- Shared images in `assets/images/`
- No database/backend is connected yet
- No PHP backend is included or required by this package
- Firebase is the planned backend for the next integration stage

## Pages
- `index.html` — landing page
- `auth.html` — sign-in/create-account UI shell
- `dashboard.html` — frontend dashboard shell pending backend integration
- `about.html`
- `top-earners.html`
- `blog.html`
- `faq.html`
- `download.html`
- `terms.html`
- `privacy.html`
- `scam-alert.html`

## Important
The frontend intentionally does not contain database credentials, Firebase configuration, PHP endpoints, or live authentication. The auth page has been neutralized so it does not attempt to call the old PHP backend. The next build stage should integrate Firebase Authentication, Firestore/Storage as required, and the admin/user workflows.

## Deployment
The package is structured so it can be placed in a GitHub repository and imported into Google AI Studio Build Mode or deployed as a static site.

## Legacy-domain cleanup
The downloaded site contained hard-coded absolute URLs to its former host. Those old internal URLs have been removed from the HTML source and replaced with local relative routes or omitted where a final production domain is not yet known.
