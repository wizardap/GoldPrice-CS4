# AI Agent Task Definition: Refactor and Enhance Real-time Key-Value Store

## ROLE:

Act as a Senior Software Engineer / System Architect AI Agent.

## CONTEXT:

You are tasked with planning and generating components for refactoring an existing simple Node.js/Express application.

- **Current State:** The application stores key-value pairs (likely in a basic file/memory store), has a POST endpoint (`/add`) to update values, a GET endpoint (`/get/:keyID`) to retrieve values, and a viewer page (`/viewer/:keyID`) that uses client-side polling (e.g., `setInterval` with fetch) to display near real-time updates.
- **Goal:** Modernize the application for better scalability, reliability, maintainability, and real-time performance using specified technologies and architectural patterns.

## OBJECTIVE:

Provide designs, code snippets, configuration files, and analysis to fulfill the enhancement requirements outlined below.

## REQUIRED TASKS:

1.  **Database Migration and ORM Integration:**

    - **Action:** Design the migration strategy from the current implied storage to **MongoDB**.
    - **Output:** Generate **Mongoose** schema definition(s) suitable for storing key-value pairs with potential metadata (e.g., last updated timestamp). Generate example code snippets for CRUD operations (especially create/update and read) using Mongoose within the Express application context.
    - **Constraint:** Must use MongoDB and Mongoose.

2.  **Real-time Communication Implementation:**

    - **Action:** Replace the client-side polling mechanism in the viewer component (`viewer.html`) with a **Socket.IO** based solution.
    - **Output:**
      - Generate server-side Node.js/Express code to initialize Socket.IO, manage client connections (potentially room-based for specific keys), and emit update events.
      - Generate client-side JavaScript code for `viewer.html` to establish a Socket.IO connection and listen for update events for the relevant `keyID`, updating the UI accordingly without page reloads.
    - **Constraint:** Must use Socket.IO.

3.  **Architectural Refactoring (Publisher-Subscriber with Kafka):**

    - **Action:** Redesign the data update flow using a **Publisher-Subscriber** pattern with **Apache Kafka** as the message broker.
    - **Output:**
      - Provide code examples for modifying the `/add` endpoint (or a dedicated service) to act as a Kafka **Producer**, publishing messages containing key-value update information to a specific Kafka topic.
      - Provide code examples for creating a separate Node.js Kafka **Consumer** service (or integrating into the main app) that subscribes to the topic. This consumer should:
        - Process incoming messages.
        - Update the corresponding data in **MongoDB** (using Mongoose).
        - Emit the update via **Socket.IO** to relevant connected clients.
      - Specify necessary Kafka client library (e.g., `kafkajs` or `node-rdkafka`) and basic configuration.
    - **Constraint:** Must use Apache Kafka and the Pub/Sub pattern.

4.  **Frontend Enhancement:**

    - **Action:** Design a more complete UI for the `/viewer/:keyID` page.
    - **Output:** Generate basic HTML structure, CSS styling suggestions, and JavaScript (integrating the Socket.IO client from Task 2) for a cleaner viewer page. Consider displaying the key, current value, and potentially a timestamp or connection status indicator.

5.  **Quality Attribute Analysis:**

    - **Action:** Analyze the weaknesses of the _original_ described application (polling, basic storage) concerning quality attributes.
    - **Output:** Provide a textual analysis explaining the specific problems related to:
      - Performance (e.g., polling inefficiency, I/O bottlenecks).
      - Scalability (e.g., connection limits, database scaling issues).
      - Reliability (e.g., message loss, data consistency).
      - Maintainability (e.g., tight coupling, lack of structure).
    - Explain clearly how the proposed solutions (MongoDB, Socket.IO, Kafka, ORM, Pub/Sub) directly address these identified weaknesses.

6.  **Containerization Setup:**
    - **Action:** Define the containerization strategy using Docker.
    - **Output:**
      - Generate a `Dockerfile` suitable for building an image for the refactored Node.js application (including Kafka producer/consumer logic and Socket.IO server).
      - Generate a `docker-compose.yml` version 3+ file that defines and orchestrates the necessary services:
        - The Node.js application service.
        - A **MongoDB** service.
        - An **Apache Kafka** service.
        - A **Zookeeper** service (as required by Kafka).
      - Include necessary configurations like ports, volumes (for data persistence), networks, and service dependencies (`depends_on`).

## OPTIONAL TASK:

1.  **Code Optimization:**
    - **Action:** Analyze the conceptual structure of the Node.js/Express application.
    - **Output:** Suggest specific code-level optimizations (e.g., asynchronous operation handling, error handling patterns, potential caching strategies) applicable to the refactored application.

## OUTPUT FORMAT:

Present the results clearly, separating code blocks (with language identifiers), configuration files (`Dockerfile`, `docker-compose.yml`), and textual analysis/design explanations for each task. Use Markdown formatting.

## INTERACTION:

If requirements are ambiguous, ask for clarification. Proceed task by task or provide a consolidated response as appropriate.
