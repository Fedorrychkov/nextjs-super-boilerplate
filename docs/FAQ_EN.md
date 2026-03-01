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

## Build on server: "no space left on device"

### Service 'core-api' failed to build, write … next-swc.linux-x64-gnu.node: no space left on device

**Cause:** The server has run out of disk space. The build (npm install, Next.js build, copying into the image) writes to temporary dirs and the image; when space is exhausted the write fails with this error.

**Solution:**

1. SSH to the server: `df -h` to check disk usage.
2. Free space by cleaning Docker: unused images, containers, build cache:
   ```bash
   cd ~/app
   ./scripts/local-containers-run.sh prune-images
   docker system prune -a -f --volumes
   ```
   `prune-images` removes old app images (keeps the one used by api-service). `docker system prune -a` removes all unused images/containers/networks and unused volumes (be careful: do not remove volumes with data you need, e.g. mongo_data, unless they are unused).
3. Safer option without removing unused volumes: `docker system prune -a -f` (no `--volumes`).
4. If you keep running out of space: switch to `deploy_mode: registry` in the workflow — build runs in CI, only the built image is pulled on the server, so less disk is needed there.

**Why you got a success notification:** Previously, when the build failed inside the deploy SSH script, the step could still finish successfully (the script kept running). The workflow deploy script now has `set -e`: any failed command (including a failed build) fails the step, so the job is marked failed and success-notify is not sent.

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

## MongoDB: Authentication Errors and Recreating the Database

### Mongo logs: "UserNotFound", "Authentication failed", "Could not find user \"admin\" for db \"admin\""

**What’s going on:** MongoDB creates the root user (`MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD`) **only on the first run**, when the data directory is **empty**. If the container was ever started without these variables (or with different values), the volume already contains data from that run — the `admin` user was never created, but authorization is enabled. Starting again with the correct env vars does not re-run init; the init script runs only once.

**Typical causes:**

- The volume was created before `MONGO_INITDB_*` was added to compose, or before the deploy workflow started sourcing `.env` into the shell before `docker-compose up`.
- The secret (e.g. `WEB_ENV_PROD`) was missing or had wrong `MONGO_USER` / `MONGO_PASSWORD`, so the first start used defaults or empty values.
- The wrong volume was removed: Docker Compose names volumes with a project prefix (e.g. `app_mongo_data` instead of just `mongo_data`), so the old volume without the user was still in use.

---

### Manual MongoDB recreation steps

Run these on the server in the app directory (e.g. `cd ~/app`). **All data in this MongoDB instance will be lost.**

1. **Stop and remove the mongo container**
   ```bash
   docker-compose -f docker-compose.local.yml stop mongo
   docker-compose -f docker-compose.local.yml rm -f mongo
   ```

2. **Find the volume that holds MongoDB data**
   ```bash
   docker volume ls | grep mongo
   ```
   You may see both `app_mongo_data` (project-directory prefix) and `mongo_data`. The one in use is the one mounted by your compose file — usually the volume name from the `volumes:` section (e.g. `mongo_data`) shown with the project prefix, e.g. `app_mongo_data` or `<project_dir>_mongo_data`. You must remove **the volume that was actually used**, or the next `up` will mount the old data again.

3. **Remove the volume(s)**
   ```bash
   docker volume rm app_mongo_data
   docker volume rm mongo_data
   ```
   If a volume doesn’t exist, the command will error — that’s fine. The important part is removing the one that had mongo data (often `app_mongo_data` when the project lives in a directory named `app`).

4. **Load env into the shell** (so docker-compose can substitute MONGO_USER / MONGO_PASSWORD into the mongo container)
   ```bash
   set -a
   [ -f .env.prod ] && . ./.env.prod
   set +a
   export ENV_FILE=.env.prod API_ENV=prod
   ```

5. **Start mongo again**
   ```bash
   docker-compose -f docker-compose.local.yml up -d mongo
   ```
   On first start with an empty volume, MongoDB will run init and create the user from the environment.

6. **Restart the app container if needed**
   ```bash
   docker-compose -f docker-compose.local.yml up -d core-api
   ```

**Verify:** connect with the same credentials as in `.env.prod`:
   ```bash
   docker exec -it mongo mongosh -u admin -p 'YOUR_PASSWORD' --authenticationDatabase admin --eval "db.adminCommand({ ping: 1 })"
   ```
   You should get `ok: 1`.

---

**GitHub secret:** In **Settings → Secrets**, the secret that holds the .env body (e.g. `WEB_ENV_PROD`) must include:
   ```env
   MONGO_HOST=mongo
   MONGO_PORT=27017
   MONGO_USER=admin
   MONGO_PASSWORD=your_secure_password
   MONGO_DB=app
   ```
Special characters in the password are URL-encoded by the app when building the connection string.

**Using deploy instead:** After removing the container and the correct volume, you can skip manual mongo start and redeploy via GitHub Actions (push to the target branch). The workflow will create `.env.prod` from the secret; on the next `docker-compose up`, mongo will start with an empty volume and create the user.

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

## Cleaning Old Docker Images

### Server fills up with ghcr.io/… images (~2 GB each)

**Cause:** With `deploy_mode: registry`, each deploy pushes a new image tagged with the commit SHA. The server pulls the new image on each deploy; old images stay and consume disk space.

**What the template does:**

- After each deploy, the workflow **Cleanup** step on the server removes all images of your app’s repository (e.g. `ghcr.io/owner/nextjs-super-boilerplate`) **except** the one used by the `api-service` container. So only the current image is kept.
- The script `local-containers-run.sh` has a **prune-images** command that removes old images of the same repository, keeping the one used by `api-service`.

**Manual cleanup on the server:**

```bash
cd ~/app
./scripts/local-containers-run.sh prune-images
```

If `api-service` is not running, the command only lists `ghcr.io` images; you can remove them manually: `docker rmi ghcr.io/owner/name:sha`.

**Cleaning GitHub Container Registry (ghcr.io):**

Images in GHCR accumulate as well. Options:

1. **Manual:** GitHub → repository → **Packages** (right side) → your package → **Package settings** → delete the package or individual versions if the UI allows. Or: profile → **Packages** → select package → **Manage versions** and delete old tags.
2. **Retention:** In the package settings, check if there is an option to automatically remove old versions.
3. **Via API:** The [GitHub Packages API](https://docs.github.com/en/rest/packages) lets you delete package versions. You can run a monthly workflow that lists versions and deletes all but the last N (e.g. using `gh api` or curl).

Recommendation: with automatic cleanup on the server (already in the template), most space is freed there; clean GHCR manually or with a script if needed.

---

## More

- **Container logs:** `docker logs <container_name>` (e.g. `docker logs api-service`, `docker logs mongo`).
- **Inspect env in container:** `docker exec api-service env` or `docker exec api-service printenv MONGO_URI`.
- **Workflow reference:** Parameters and secrets are documented in the tables in the [README](../README.md).
