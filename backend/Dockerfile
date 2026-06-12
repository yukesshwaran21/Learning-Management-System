FROM node:20-alpine

# Install FFmpeg for video processing
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Install dependencies first (Docker layer cache optimisation)
COPY package*.json ./
RUN npm install --production=false

# Copy source
COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
