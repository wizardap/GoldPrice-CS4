FROM node:23-slim
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Create db directory if it doesn't exist
RUN mkdir -p db

# Expose the application port
EXPOSE 8080

# Run the application
CMD ["npm", "start"]