FROM node:24.13.1
WORKDIR /usr/src/api

# Validate and set API_ENV
ARG API_ENV=prod
ARG PUBLIC_ENV

RUN if [ "$API_ENV" != "prod" ] && [ "$API_ENV" != "stage" ]; then \
    echo "Error: API_ENV must be either 'prod' or 'stage'" && exit 1; \
    fi
ENV API_ENV=$API_ENV

RUN echo "API_ENV: $API_ENV"
RUN echo "PUBLIC_ENV: $PUBLIC_ENV"

# Pin the package manager: the repo lockfile is pnpm-lock.yaml (lockfileVersion 9)
RUN npm install -g pnpm@10

# Copy only necessary files for installing dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig*.json ./

# Reproducible install strictly from the lockfile — fail the build if it is out of sync
RUN HUSKY=0 pnpm install --frozen-lockfile

# Copy source files and build the application
COPY . .

# Minimum .env for build step (without secrets). PUBLIC_ENV contains only NEXT_PUBLIC_*
RUN if [ "$API_ENV" = "stage" ]; then \
      echo "NODE_ENV=production" > .env.stage && \
      echo "APP_ENV=stage" >> .env.stage && \
      echo "NEXT_PUBLIC_APP_ENV=stage" >> .env.stage && \
      if [ -n "$PUBLIC_ENV" ]; then printf '%s\n' "$PUBLIC_ENV" >> .env.stage; fi; \
    else \
      echo "NODE_ENV=production" > .env.prod && \
      echo "APP_ENV=production" >> .env.prod && \
      echo "NEXT_PUBLIC_APP_ENV=production" >> .env.prod && \
      if [ -n "$PUBLIC_ENV" ]; then printf '%s\n' "$PUBLIC_ENV" >> .env.prod; fi; \
    fi

# Defense-in-depth HTML sanitizer tests (also run in CI when deploy_mode != registry)
RUN pnpm run test

RUN pnpm run build:${API_ENV}

# Drop dev dependencies from node_modules (runtime deps like env-cmd/tsx stay: they are in "dependencies")
RUN pnpm prune --prod

HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/healthcheck || exit 1

# Run the application according to the environment
CMD ["sh", "-c", "pnpm run start:${API_ENV}"]
