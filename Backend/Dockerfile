# Use Node.js 18 alpine as base
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Create uploads folder if not exists
RUN mkdir -p uploads

# Expose the port (same as .env or default)
EXPOSE 5000

# Start the application
CMD ["node", "src/index.js"]
