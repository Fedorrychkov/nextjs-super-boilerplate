FROM node:24.13.1
WORKDIR /usr/src/api

# Validate and set API_ENV
ARG API_ENV=prod
RUN if [ "$API_ENV" != "prod" ] && [ "$API_ENV" != "stage" ]; then \
    echo "Error: API_ENV must be either 'prod' or 'stage'" && exit 1; \
    fi
ENV API_ENV=$API_ENV

RUN echo "API_ENV: $API_ENV"

# Copy only necessary files for installing dependencies
COPY package*.json ./
COPY tsconfig*.json ./

# Check for package-lock.json and install dependencies
RUN if [ -f "package-lock.json" ]; then \
        echo 'package-lock.json found, using npm ci...' && \
        HUSKY=0 npm ci --prefer-offline --no-audit --legacy-peer-deps; \
    else \
        echo 'package-lock.json not found, falling back to npm install...' && \
        HUSKY=0 npm install --prefer-offline --no-audit --legacy-peer-deps; \
    fi

# Copy source files and build the application
COPY . .

# Minimum .env for build step (without secrets). Secrets are substituted when running from mounted file.
RUN if [ "$API_ENV" = "stage" ]; then \
      echo "NODE_ENV=production" > .env.stage && echo "APP_ENV=stage" >> .env.stage && echo "NEXT_PUBLIC_APP_ENV=stage" >> .env.stage; \
    else \
      echo "NODE_ENV=production" > .env.prod && echo "APP_ENV=production" >> .env.prod && echo "NEXT_PUBLIC_APP_ENV=production" >> .env.prod; \
    fi

RUN npm run build:${API_ENV}

# Clean up dev dependencies with --legacy-peer-deps flag
RUN npm prune --production --legacy-peer-deps

HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/healthcheck || exit 1

# Run the application according to the environment
CMD ["sh", "-c", "npm run start:${API_ENV}"]
