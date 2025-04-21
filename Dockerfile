FROM node:23-slim

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose application port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]