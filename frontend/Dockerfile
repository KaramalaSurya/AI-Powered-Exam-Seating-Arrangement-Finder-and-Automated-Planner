# Stage 1: Build the React Application
FROM node:18-alpine AS build-stage

WORKDIR /app

# Copy package descriptors first to cache npm install
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Set the production API endpoint build argument
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build the production bundle
RUN npm run build

# Stage 2: Serve the build directory using Nginx
FROM nginx:alpine

# Copy custom Nginx configuration to support SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from build-stage to Nginx public folder
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
