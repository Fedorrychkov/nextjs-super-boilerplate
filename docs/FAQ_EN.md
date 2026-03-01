# Common Issues and Solutions (FAQ)

Answers to typical questions when deploying and configuring the boilerplate.

---

## Certbot / Let's Encrypt

### Error: "example@example.com is an invalid email address"

**Cause:** Let's Encrypt rejects the placeholder `example@example.com`. A real email is required for certificate expiry notifications and account recovery.

**Solution:**

1. In GitHub: **Settings → Secrets and variables → Actions**, create a secret `CERTBOT_EMAIL` with your real email (e.g. `you@yourdomain.com`).
2. Or in the workflow file (e.g. `prod-deploy.yml`) set explicitly: `certbot_email: 'your-real-email@domain.com'`.
3. Re-run the deploy or the job that starts certbot-init.

---

## Nginx: Broken Containers (Naming)

### Nginx container was created with the wrong name and doesn’t get removed on deploy

**Cause:** After blue/green or restarts, “orphan” containers can remain (different name, old SUFFIX), and a normal `docker-compose down` may not remove them.

**Solution:**

1. SSH into the server.
2. Go to the app directory: `cd ~/app` (or wherever the project is deployed).
3. Run the cleanup script:
   ```bash
   ./scripts/local-containers-run.sh clean
   ```
4. Then bring the stack back up (via a new GitHub Actions deploy or manually with the right env):
   ```bash
   API_ENV=prod ENV_FILE=.env.prod DOMAINS=your-domain.com FIRST_DOMAIN=your-domain.com \
     ./scripts/local-containers-run.sh https prod -d your-domain.com
   ```

The `clean` command stops and removes all containers used by the script (nginx, api-service, mongo, redis, certbot, etc.), including those with the `-green` suffix.

---

## MongoDB: Wrong Init Data

### Registration fails; Mongo logs show "Access control is not enabled" or auth errors

**Cause:** The MongoDB container was first created with an empty volume when `MONGO_INITDB_ROOT_*` was not set, or the `env` secret (e.g. WEB_ENV_PROD) was missing or had wrong `MONGO_USER` / `MONGO_PASSWORD`. User creation runs only on the **first** start with an empty data directory.

**Solution (reset Mongo and re-create):**

1. **SSH into the server** and go to the app directory: `cd ~/app`.

2. **Stop and remove the Mongo container and its volume** (all Mongo data will be lost):
   ```bash
   API_ENV=prod ENV_FILE=.env.prod docker-compose -f docker-compose.local.yml stop mongo
   API_ENV=prod ENV_FILE=.env.prod docker-compose -f docker-compose.local.yml rm -f mongo
   docker volume ls | grep mongo
   docker volume rm <mongo_volume_name>   # e.g. service-api-network_mongo_data or mongo_data
   ```

3. **Check the GitHub secret:** In **Settings → Secrets**, the secret that holds the .env contents (e.g. `WEB_ENV_PROD`) must include:
   ```env
   MONGO_HOST=mongo
   MONGO_PORT=27017
   MONGO_USER=admin
   MONGO_PASSWORD=your_secure_password
   MONGO_DB=app
   ```
   Special characters in the password are URL-encoded automatically by the app when building the connection string.

4. **Redeploy** via GitHub Actions (push to the target branch). The workflow will recreate `.env.prod` from the secret; on the next `docker-compose up`, Mongo will start with an empty volume and create the `admin` user with the given password.

**Alternatively**, start only Mongo manually after removing the volume (with env loaded):
   ```bash
   set -a; [ -f .env.prod ] && . ./.env.prod; set +a
   export ENV_FILE=.env.prod API_ENV=prod
   docker-compose -f docker-compose.local.yml up -d mongo
   ```
   Then restart core-api if needed.

---

## Env Variables Not Visible in the App Container

### `docker inspect api-service` only shows API_ENV, PATH, etc.; no MONGO_*, JWT_*

**Cause:** Variables from `.env.prod` are provided via a mounted file and (if configured) via `env_file:` in docker-compose. `Config.Env` may not list everything if some vars are only in the file and read by the app (e.g. via env-cmd).

**What to check:**

1. On the server: `docker exec api-service cat /usr/src/api/.env.prod` — the file should contain the expected keys (MONGO_*, JWT_*, etc.).
2. Ensure the GitHub `env` secret (e.g. WEB_ENV_PROD for prod) contains the full .env content line by line.
3. After changing the secret, run a new deploy so `.env.prod` is recreated on the server.

---

## Styles Not Loading in Production

### Page renders without styles after deploy

**Possible causes:**

- In `.dockerignore`, do **not** exclude `.next`, `out`, `build`, `dist` in a way that prevents the image from containing them; they are produced by `npm run build` **inside** the image. Exclude them only so they are not copied from the host.
- If using `output: 'standalone'` in next.config, ensure the image copies the right artifacts and the app runs from the correct working directory.

Check: rebuild the image locally (`docker build -f .docker/Dockerfile ...`) and confirm that after `RUN npm run build` the image has `.next` and styles are served.

---

## More

- **Container logs:** `docker logs <container_name>` (e.g. `docker logs api-service`, `docker logs mongo`).
- **Inspect env in container:** `docker exec api-service env` or `docker exec api-service printenv MONGO_URI`.
- **Workflow reference:** Parameters and secrets are documented in the tables in the [README](../README.md).
