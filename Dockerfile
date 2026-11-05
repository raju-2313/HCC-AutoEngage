FROM node:20-alpine

# Install tzdata for accurate Asia/Kolkata timezone support
RUN apk add --no-cache tzdata

ENV TZ=Asia/Kolkata
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Run the Discord bot process
CMD ["node", "src/index.js"]
