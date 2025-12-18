## Running the Project with Docker

This project is fully containerized and can be run using Docker Compose. The setup includes three main services:

- **ts-back-end** (NestJS, Node.js v22.13.1)
- **ts-front-end** (React/Vite, Node.js v22.13.1)
- **py-image-service** (Python 3.13)

### Requirements
- Docker and Docker Compose installed on your system.
- No additional dependencies required outside of Docker.

### Environment Variables
- If you have environment-specific settings, you can provide `.env` files in the respective service directories (`./back-end/.env`, `./front-end/.env`, `./image-service/.env`).
- The Docker Compose file is pre-configured to use these files if present (uncomment the `env_file` lines as needed).

### Build and Run Instructions
1. From the project root, run:
   ```bash
   docker compose up --build
   ```
   This will build and start all services.

2. To stop the services:
   ```bash
   docker compose down
   ```

### Service Ports
- **ts-back-end**: Exposes port `3000` (NestJS API)
- **ts-front-end**: Exposes port `5173` (Vite/React app)
- **py-image-service**: Exposes port `8000` (Python image service)

### Special Configuration
- All services run as non-root users for improved security.
- Node.js version is pinned to `22.13.1` for both front-end and back-end.
- Python version is pinned to `3.13` for the image service.
- The `uploads` directories are included in the containers for file handling.
- All services are connected via the `app-network` bridge network for internal communication.

---

*Refer to the individual service directories for more details and service-specific documentation.*
