# Prof. Dr. Cornelia Sindermann Website

Static, GitHub Pages-ready website for `c-sindermann.com`.

## Files

- `index.html` detects the visitor language and redirects to `de/` or `en/`.
- `en/index.html` contains the English website version.
- `de/index.html` contains the German website version.
- `styles.css` contains the visual design. Change the color values in `:root` if you want exact hex colors later.
- `script.js` controls the mobile navigation and active navigation state.
- `data/publications.json` contains the current publication data exported from Google Scholar.
- `scripts/update-publications.mjs` refreshes the publication data.
- `.github/workflows/update-publications.yml` runs the publication refresh weekly on GitHub.
- `assets/cornelia-sindermann-portrait.jpg` is the portrait copied from the current Google Sites page.
- `assets/favicon.svg` is the browser tab icon.
- `CNAME` sets the GitHub Pages custom domain to `www.c-sindermann.com`.

## Editing

The site is intentionally plain HTML/CSS/JS. Edit English text in `en/index.html` and German text in `de/index.html`.

Common updates:

- Edit the on-page CV content directly in the Academic CV section of `en/index.html` and `de/index.html`.
- Run `node scripts/update-publications.mjs` to refresh publication data manually.
- Add confirmed talk titles, logos, or testimonials to the Speaker section.
- Replace the portrait with a newer image using the same filename.
- The main colors are `#8CB9C3` and `#58585A`; lighter derived colors are defined in `styles.css`.

## Bilingual Setup

The root `index.html` checks `localStorage.preferredLanguage` first. If no manual choice is stored, it reads the visitor browser languages via `navigator.languages`. German browser settings are redirected to `de/`; all other settings are redirected to `en/`.

Both language versions include a visible `DE` / `EN` switch in the header. Clicking it stores the preferred language for future visits.

## GitHub Pages Deployment

1. Create a new GitHub repository.
2. Upload these files to the root of the repository.
3. Go to repository `Settings` -> `Pages`.
4. Choose deployment from the main branch, root folder.
5. Keep the `CNAME` file if the site should live at `www.c-sindermann.com`.
6. Configure your domain provider so `www` points to your GitHub Pages host.

## Domain Setup

GitHub recommends adding the custom domain in GitHub Pages settings before
changing DNS records, and verifying the domain to reduce takeover risk:
https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

For `www.c-sindermann.com`, create this DNS record at your domain provider:

| Type | Name | Value |
| --- | --- | --- |
| `CNAME` | `www` | `CSindermann.github.io` |

Do not include the repository name in the DNS value.

For `c-sindermann.com` without `www`, GitHub currently lists these apex-domain
records:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `@` | `185.199.108.153` |
| `A` | `@` | `185.199.109.153` |
| `A` | `@` | `185.199.110.153` |
| `A` | `@` | `185.199.111.153` |
| `AAAA` | `@` | `2606:50c0:8000::153` |
| `AAAA` | `@` | `2606:50c0:8001::153` |
| `AAAA` | `@` | `2606:50c0:8002::153` |
| `AAAA` | `@` | `2606:50c0:8003::153` |

DNS changes can take up to 24 hours. After GitHub sees the DNS records, enable
`Enforce HTTPS` in repository `Settings` -> `Pages`.

## Publication Updates

The site does not scrape Google Scholar from the visitor's browser. Instead, the
GitHub Action refreshes `data/publications.json` every Monday and commits the
changed data file. GitHub Pages then republishes the site automatically.

If Google Scholar temporarily blocks automated access, the workflow will fail
without damaging the current website; the previously committed publication list
will remain online. You can rerun the workflow manually from the repository's
`Actions` tab.
