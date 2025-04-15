Collecting workspace information# Project Requirements for Case Study 4

Based on the README.md, this project is a simple key-value store application using Express.js that provides real-time updates, potentially for gold prices or other time-sensitive data.

## Core Functionality

The application currently:

- Uses Express.js with SQLite database
- Stores and retrieves key-value pairs
- Includes a web viewer that polls for updates every 2 seconds

## API Endpoints

| Endpoint         | Method | Purpose                           |
| ---------------- | ------ | --------------------------------- |
| `/add`           | POST   | Add/edit values in database       |
| `/get/:keyID`    | GET    | Return value for specified key    |
| `/viewer/:keyID` | GET    | Web page to monitor a key's value |

## Implementation Requirements

### Required Tasks:

1. Replace polling in viewer.html with better technology (e.g., Socket.io)
2. Add ORM layer for persistence
3. Implement Publisher-Subscriber architecture with a message broker
4. Identify quality issues and evaluate performance improvements

### Optional Tasks:

1. Optimize the program
2. Enhance the web interface
3. Replace the current database system

The project aims to improve the real-time capabilities and architecture of the application while addressing quality and performance concerns.
