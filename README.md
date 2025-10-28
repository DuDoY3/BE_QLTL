#https://zed.dev/native_app_signin?native_app_port=62669&native_app_public_key=MIIBCgKCAQEAtteCEyztd4qY00UTiJVzmnCuffQ5QCz_pOJMyGN1NfKyF1HqlipYQnjmpb0VHVlK8onKqFpMyvbrzxUmpAJgIUniEegWWKIrnGrTXcbSuKQseARr5BlGap9PcBCSykxuYh3ReDEW3_XcBCJmiTV-HHfJDro0jazYF9byjxQF7oFN4pAD3gS6Fxs5nTogp7xmrDTKC_fXg08vDBgYkq89zXvbEQX3FYEwl0ZgtO4HrOcT8GwUsA0LC30EnDd5roL3k9s4K6PQGqjvwh2tJajHSCFcxg9G2qmcLXAgRS9G5OXlkqg3EA7z74_N4oX6FzO5Us5nD6EK-qhNZAweAh7H5wIDAQAB HPC Drive - Backend Service README

Hello, frontend team! This guide will help you connect your application to the HPC Drive backend microservice.

This document covers setup, API endpoints, authentication, and other essential information to ensure a smooth integration.

## Table of Contents

1.  [Overview](#-overview)
2.  [Getting Started](#-getting-started)
    *   [Docker Setup (Recommended)](#-docker-setup-recommended)
    *   [Local Machine Setup](#-local-machine-setup)
3.  [Environment Variables](#-environment-variables)
4.  [Authentication Flow](#-authentication-flow)
5.  [API Endpoints](#-api-endpoints)
    *   [Authentication](#authentication)
    *   [File & Folder Management](#file--folder-management)
    *   [Sharing](#sharing)
    *   [Search](#search)
    *   [Admin](#admin)
6.  [User Roles & Permissions](#-user-roles--permissions)
7.  [Response & Error Handling](#-response--error-handling)

## 🚀 Overview

The HPC Drive backend is a **document management microservice** for managing files and folders with user-specific permissions. Its key features include:

*   **File/Folder Management**: Full CRUD operations for files and folders.
*   **Advanced Search**: Full-text search within file content and metadata.
*   **Sharing System**: Securely share items with other users with `VIEWER` or `EDITOR` permissions.
*   **Admin Dashboard**: Endpoints for user and system management.
*   **JWT Token Verification**: Verifies JWT tokens from a separate authentication service to identify user roles (ADMIN, TEACHER, STUDENT).

**Note**: This microservice does NOT handle user registration or login. Authentication is handled by a separate auth service. This backend only verifies tokens to identify user roles.

## 🏁 Getting Started

You can run the backend service using either Docker (recommended for ease of use) or by setting it up locally on your machine.

### 🐳 Docker Setup (Recommended)

Using Docker is the simplest way to get the backend and its database running without installing Node.js or PostgreSQL on your machine.

**Prerequisites:**
*   [Docker](https://www.docker.com/get-started)
*   [Docker Compose](https://docs.docker.com/compose/install/)

**Steps:**

1.  **Create an Environment File**: Create a `.env` file in the project root and add the following configuration. The database will be created and run inside a Docker container.

    ```env
    # Database Configuration for Docker
    DATABASE_URL="postgresql://postgres:password@db:5432/hpc_drive_dev"

    # JWT Secret
    JWT_SECRET="your-super-secret-jwt-key"
    JWT_EXPIRES_IN="7d"

    # Server Port
    PORT=8001
    NODE_ENV=development
    ```

2.  **Start the Services**: Run the following command from the project root:

    ```bash
    docker-compose -f Docker/compose.yaml up -d --build
    ```

3.  **Run Database Migrations**: Once the containers are running, execute the database migration command:

    ```bash
    docker-compose -f Docker/compose.yaml exec app npx prisma migrate dev
    ```

The API server will be available at `http://localhost:8001`.

### 💻 Local Machine Setup

If you prefer to run the service directly on your machine, follow these steps.

**Prerequisites:**
*   Node.js v18+
*   pnpm
*   PostgreSQL v12+

**Steps:**

1.  **Install Dependencies**:
    ```bash
    pnpm install
    ```

2.  **Setup Database**: Ensure your PostgreSQL server is running and create a new database for this project.

3.  **Create Environment File**: Create a `.env` file in the project root and update `DATABASE_URL` with your local PostgreSQL connection string.

    ```env
    # Database
    DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DB_NAME"

    # JWT
    JWT_SECRET="your-super-secret-jwt-key"
    JWT_EXPIRES_IN="7d"

    # Server
    PORT=8001
    NODE_ENV=development
    ```

4.  **Run Database Migrations**:
    ```bash
    npx prisma migrate dev
    ```

5.  **Start the Server**:
    ```bash
    pnpm dev
    ```

The API server will be available at `http://localhost:8001`.

## 🔑 Environment Variables

The following variables are required in your `.env` file:

| Variable         | Description                                        | Example                                               |
| ---------------- | -------------------------------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`   | Connection string for the PostgreSQL database.     | `postgresql://user:pass@host:5432/db`                 |
| `JWT_SECRET`     | A secret key for signing JWT tokens.               | `a-very-strong-and-secret-key`                        |
| `JWT_EXPIRES_IN` | Expiration time for JWT tokens.                    | `7d`                                                  |
| `PORT`           | The port on which the server will run.             | `8001`                                                |
| `NODE_ENV`       | The application environment.                       | `development` or `production`                         |


## 🔐 Authentication Flow

All protected endpoints require a JSON Web Token (JWT) from your authentication service.

**Important**: This microservice does NOT provide authentication endpoints. User registration and login are handled by a separate authentication service.

1.  **Get Token from Auth Service**: Your authentication service handles user registration and login, returning a JWT token.
2.  **Include Token in Requests**: For all requests to protected endpoints, you must include the token in the `Authorization` header:

    ```http
    Authorization: Bearer <your_jwt_token>
    ```
3.  **Token Verification**: This backend verifies the token and extracts user information (userId, role) to enforce permissions.

## 🌐 API Endpoints

The base URL for all API endpoints is `/api/v1`.

### Authentication

**Note**: Authentication endpoints (register/login) are NOT provided by this backend. They are handled by a separate authentication service.

This backend only verifies JWT tokens to identify user roles (ADMIN, TEACHER, STUDENT) for permission enforcement.

### File & Folder Management

| Method   | Endpoint                | Description                                     |
| -------- | ----------------------- | ----------------------------------------------- |
| `GET`    | `/items`                | Get items in a specific folder (`?parentId=...`). |
| `GET`    | `/items/{itemId}`       | Get details of a single item.                   |
| `GET`    | `/items/{itemId}/download`| Download a file.                                |
| `POST`   | `/items`                | Create a folder or upload a file.               |
| `PUT`    | `/items/{itemId}`       | Update an item's name or parent folder.         |
| `DELETE` | `/items/{itemId}`       | Delete an item.                                 |

**Note on File Uploads**: File uploads must use `Content-Type: multipart/form-data`. The request should contain a `file` part (the binary data) and a `document` part (a JSON string with `name`, `itemType`, and optional `parentId`).

### Sharing

| Method   | Endpoint                            | Description                              |
| -------- | ----------------------------------- | ---------------------------------------- |
| `GET`    | `/items/shared-with-me`             | Get all items shared with the current user.|
| `POST`   | `/items/{itemId}/shares`            | Share an item with another user.         |
| `GET`    | `/items/{itemId}/shares`            | See who an item is shared with.          |
| `PUT`    | `/items/{itemId}/shares/{shareId}`  | Update a user's permission level.        |
| `DELETE` | `/items/{itemId}/shares/{shareId}`  | Revoke a user's access to an item.       |

### Search

| Method | Endpoint            | Description                                   |
| ------ | ------------------- | --------------------------------------------- |
| `GET`  | `/search`           | Search items by name (`?q=...`).              |
| `GET`  | `/search/content`   | Full-text search within document content.     |
| `GET`  | `/search/recent`    | Get recently accessed items.                  |

### Admin

These endpoints require an `ADMIN` role.

| Method   | Endpoint                  | Description                           |
| -------- | ------------------------- | ------------------------------------- |
| `GET`    | `/admin/dashboard`        | Get system statistics.                |
| `GET`    | `/admin/users`            | Get a list of all users.              |
| `PUT`    | `/admin/users/{userId}/role`| Update a user's role.               |
| `DELETE` | `/admin/users/{userId}`   | Delete a user.                        |

## 👑 User Roles & Permissions

| Role      | Permissions                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `ADMIN`   | Full control over all users and documents in the system.                                                |
| `TEACHER` | Can create, share, and manage their own documents.                                                      |
| `STUDENT` | Can create, share, and manage their own documents.                                                      |

**Share Permissions:**
*   `VIEWER`: Can view and download the item.
*   `EDITOR`: Can view, download, and edit the item's metadata (e.g., name).

## 🚨 Response & Error Handling

The API uses a standardized JSON response format.

**Success Response (`2xx` status code):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response (`4xx` or `5xx` status code):**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "A description of what went wrong."
  }
}
```

**Common Error Codes:**
| Code                | Description                                   |
| ------------------- | --------------------------------------------- |
| `UNAUTHORIZED`      | JWT is missing, invalid, or expired.          |
| `ACCESS_DENIED`     | User does not have permission for the action. |
| `FILE_NOT_FOUND`    | The requested item does not exist.            |
| `VALIDATION_ERROR`  | The request body or parameters are invalid.   |
| `INVALID_CREDENTIALS` | Incorrect username or password during login.  |

---

Happy coding! If you have any questions, feel free to reach out to the backend team.