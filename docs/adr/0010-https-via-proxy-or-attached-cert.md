# HTTPS via the self-hoster's proxy or an attached certificate; plain HTTP gets nowhere

cooka does no certificate work of its own. It runs in one of two modes, chosen by file presence: if `/data/tls/cert.pem` and `key.pem` exist it serves HTTPS itself on `8443` (**attached-cert mode**, reloading the files when they change, failing startup on a broken or mismatched pair); otherwise it serves plain HTTP on `8080` for a TLS-terminating reverse proxy (**proxy mode**). Proxy mode is the preferred, documented path, with `compose.yaml` recipes for Caddy + DNS-01 (recommended), Traefik + DNS-01, Nginx Proxy Manager + DNS challenge and Tailscale `serve`, all ending in a publicly trusted certificate. Attached-cert mode gets a short reference section and no trust or installation guides.

Plain HTTP serves nothing, integrations included: attached-cert mode has no HTTP listener, and in proxy mode a request without `X-Forwarded-Proto: https` / `Forwarded: proto=https` gets a static "Open cooka through your HTTPS address" page or, under `/api`, `403 https_required`. Nothing redirects. The base URL is learned from the HTTPS request's host when it is confirmed before the first print (or pinned by `COOKA_BASE_URL`); in attached-cert mode it must be covered by the certificate. Other HTTPS host names are served too — labels only ever print the base URL.

We rejected built-in ACME (dependency and DNS-provider surface for a job proxies already do), a cooka-generated local CA and generated self-signed certificates (untrusted on every guest phone; service workers refuse certificate errors, so the offline shopping list would silently break — the same goes for recipes like Caddy `tls internal`). We rejected plain-HTTP access for integrations, whether by exempting a public API prefix or by trusting internal source addresses: one rule — HTTPS or nothing — beats a rule with exceptions. We rejected an HTTP redirect listener because a redirect hides a broken setup and labels, bookmarks and the installed app already carry `https://`.

## Consequences

- In practice a self-hoster needs a real domain (DNS-01, pointing at a LAN address) or Tailscale; a bare `cooka.lan` works only with a CA they trust themselves, via attached-cert mode.
- Integrations (Home Assistant, scripts) call cooka's HTTPS address, not the container directly.
- Certificate expiry is shown only as information in a settings/system-info area, never as a banner; renewal is the proxy's or the self-hoster's job.
- HTTP/2 for the event stream comes from Go's TLS server in attached-cert mode and from the proxy otherwise.
