# Hosting Turjuman for many mosques

In **hosted mode** one server serves many mosques:
- The website is at `/`, in English, Dutch and Arabic.
- Mosques create their own account at `/signup`.
- Each mosque adds its own Soniox key and pays Soniox itself; the server's operator pays only
  for the server.
- Each mosque makes its own screens.

A single mosque does not need any of this: the default **local mode** runs one mosque per
install (see the README).

## What a mosque does

1. Signs up at `/signup` with the mosque's name, their own name, e-mail address and a password
   (at least 10 characters). The person who signs up becomes the **owner**.
2. Adds its Soniox key under **Keys**: Soniox hears the khutbah and translates it. The key is
   checked with Soniox, then stored encrypted.
3. Makes a screen: languages, layout and look. Then puts the screen link in OBS, or in any
   browser. A new screen starts off: they switch it on in the app before the khutbah.
4. Optionally adds people under **Accounts**:
   - admins manage everything;
   - users manage only their own screens.

   Members log in with their e-mail address.

Mosques never see each other's screens, accounts, looks, keys or caption history.

## Setting up the server

Use a server with Docker (Compose 2.24 or newer), git and GNU make, behind your own HTTPS
reverse proxy. Turjuman needs no domain name, certificate or token from you.

```bash
git clone https://github.com/turjuman-translator/website.git turjuman
cd turjuman
make up
```

That is the whole install. `make up` creates `config/`, `data/` and `.env`, builds the image and
returns once the server is healthy on `127.0.0.1:8765`. On its first start the server:
- makes `config/config.yaml`: `mode: hosted`, `hosted.signup: open`, `server.exposure: public`
  and `server.trustProxy: true`;
- generates the operator's admin token, in `config/admin.token` (mode 600; the CLI and the make
  targets read it there; the log says where it is, never what it is);
- downloads the Quran data (Tanzil text and translations, see `NOTICE` for their terms) into
  `data/quran/`, in the background, and again later when the internet is not reachable.

The master key that encrypts every mosque's API keys is made the first time a mosque stores a
key: `config/master.key`, mode 600 (or set `TURJUMAN_MASTER_KEY` in `.env`,
`openssl rand -base64 32`). Back it up separately from `orgs.yaml`:
- one without the other is harmless;
- together they reveal every stored key;
- without the master key, mosques must enter their keys again.

Then point your reverse proxy at `http://127.0.0.1:8765`: the [nginx block](#nginx) below.

Optional, in `config/config.yaml` (then `make restart`): `hosted.signup: closed` (no new mosques;
existing accounts keep working), `hosted.privacyUrl` and `hosted.contactUrl` (linked in the
website's footer), and `server.token` to use a token of your own instead of the generated one.

## nginx

nginx terminates HTTPS and owns the hostname. Turjuman takes the hostname of every request from
`X-Forwarded-Host` and `X-Forwarded-Proto`, which it trusts from the proxy only
(`server.trustProxy`): the website's canonical and alternate links, the sitemap, `robots.txt`,
the structured data and the app's screen links all follow it. Change `server_name` (or add
names) at any time; Turjuman needs no change and no restart.

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl;
    http2 on;
    server_name turjuman.example.org;

    ssl_certificate     /etc/letsencrypt/live/turjuman.example.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/turjuman.example.org/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;              # WebSockets: /ws and /ws/page
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;                            # caption pages stay connected for hours
        proxy_buffering off;
    }
}

server {
    listen 80;
    server_name turjuman.example.org;
    return 301 https://$host$request_uri;
}
```

`server_name` and the certificate paths are nginx's own settings, nothing else uses them. With
another `HTTP_PORT` in `.env`, use that port in `proxy_pass`. The app sees nginx's connections
as coming from this computer (natively) or from the Docker network (in Docker); both are trusted
proxies. Login cookies are marked Secure on HTTPS requests, and microphones on other devices
need HTTPS.

`hosted.publicUrl` is optional: set it only to pin one address. The website's links and the
CLI's screen links (`make screens`) then always use it, whatever the request's hostname.

## Before you open sign-up to the public

- [ ] HTTPS works through your proxy: `https://<your domain>/` shows the website, and
      `curl -s https://<your domain>/robots.txt` names your domain in its `Sitemap:` line.
- [ ] The master key is backed up, apart from `config/`.
- [ ] `pnpm turjuman doctor` (or `make doctor`) shows no failures.
- [ ] A privacy statement and a contact address are published, and set as `hosted.privacyUrl` and `hosted.contactUrl` so the website's footer links to them. You store e-mail addresses, encrypted API keys and caption transcripts for other organisations. In the EU, the GDPR asks for this.
- [ ] You decided about caption history: keep it (`pages.savePageSessions: true`) and tell the mosques, or switch it off.

## Operating it

| Command | What it does |
|---|---|
| `turjuman orgs list` | The mosques: owner, accounts, screens, whether the Soniox key is set, caption minutes this month |
| `turjuman orgs disable <id>` | Switch a mosque off: its accounts are logged out and its screens stop within seconds |
| `turjuman orgs enable <id>` | Switch it on again |
| `turjuman users list` | Every account, with its e-mail address and organisation |
| `turjuman users passwd <e-mail>` | Set a new password for someone who forgot theirs (Turjuman sends no e-mail). An owner or admin can also do this in the app |
| `turjuman usage` | Caption minutes per mosque (`org:<id>`) and day |

With Docker: `make orgs`, `make users` and `make usage`, and `make cli ARGS='…'` for the rest, for example
`make cli ARGS='orgs disable <id>'`. Without Docker: `pnpm turjuman orgs list`.

**Limits:**
- Sign-up allows 5 accounts per address per hour, and has a honeypot field.
- A mosque has at most 50 screens and 100 accounts. Key checks are limited to 20 per hour per
  address and per mosque.
- `hosted.signup: closed` stops new sign-ups.
- E-mail addresses are not verified. If an address is taken by an account that should not exist,
  remove it with `turjuman users remove <e-mail>`.

**Deleting a mosque:** an owner can delete their organisation. Its screens stop, and its
accounts, looks and keys are removed. Caption transcripts and usage numbers stay on the server
until you remove them.

## What is stored where

| Where | What |
|---|---|
| `config/config.yaml` | This server's settings (made on the first start) |
| `config/admin.token` | The operator's admin token (generated on the first start, mode 600) |
| `config/orgs.yaml` | Mosques: name, state, encrypted API keys with their last four characters |
| `config/master.key` | The master key (unless `TURJUMAN_MASTER_KEY` is set) |
| `config/users.yaml` | Accounts: e-mail, name, role, scrypt password hash |
| `config/screens.yaml` | Screens and their screen links |
| `config/presets.yaml` | Custom looks, per mosque |
| `data/transcripts/` | Caption history of each session (`pages.savePageSessions`; tell the mosques, or switch it off) |
| `data/usage/` | Caption minutes per mosque and day |
| `data/quran/` | The Tanzil Quran text and translations, with their license notices |

Back up `config/` and `data/`, and keep the master key in a separate place. `make backup`
archives `config/` and `data/transcripts/` and leaves out `.env`, `keys.yaml`, `master.key`
and `admin.token` (a new token is made on the next start).

## Updating

```bash
make backup
make update
```

`make update` pulls, rebuilds and restarts; `config/` and `data/` stay as they are, the admin
token too.
