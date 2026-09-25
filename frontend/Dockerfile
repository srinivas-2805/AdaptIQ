# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ARG VITE_API_BASE_URL=http://localhost:8080/api
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_GITHUB_CLIENT_ID=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GITHUB_CLIENT_ID=$VITE_GITHUB_CLIENT_ID
RUN npm run build

# ---- Runtime stage ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
