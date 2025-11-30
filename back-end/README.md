# Fashion House API

A comprehensive NestJS application with MySQL database for managing a fashion house database. Features include full CRUD operations, JWT authentication, Swagger documentation, and raw SQL execution capabilities.

## Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

3. Update the `.env` file with your MySQL database credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=fashion_house
DB_SYNCHRONIZE=true
DB_LOGGING=true
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
ALLOW_UNRESTRICTED_SQL=false
```

4. Create the MySQL database:
```sql
CREATE DATABASE fashion_house CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

The application will be available at `http://localhost:3000`
**Swagger documentation available at:** `http://localhost:3000/api`

## API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/profile` - Get current user profile (Protected)

### Users (`/users`) - Protected
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create a new user
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Suppliers (`/suppliers`) - Protected
- `GET /suppliers` - Get all suppliers
- `GET /suppliers/:id` - Get supplier by ID
- `POST /suppliers` - Create a new supplier
- `PATCH /suppliers/:id` - Update supplier
- `DELETE /suppliers/:id` - Delete supplier

### Categories (`/categories`) - Protected
- `GET /categories` - Get all categories (with subcategories)
- `GET /categories/:id` - Get category by ID
- `POST /categories` - Create a new category
- `PATCH /categories/:id` - Update category
- `DELETE /categories/:id` - Delete category

### SubCategories (`/subcategories`) - Protected
- `GET /subcategories` - Get all subcategories
- `GET /subcategories?categoryId=1` - Get subcategories by category
- `GET /subcategories/:id` - Get subcategory by ID
- `POST /subcategories` - Create a new subcategory
- `PATCH /subcategories/:id` - Update subcategory
- `DELETE /subcategories/:id` - Delete subcategory

### Logs (`/logs`) - Protected
- `GET /logs` - Get all logs
- `GET /logs?level=error` - Get logs by level
- `GET /logs?userId=123` - Get logs by user ID
- `GET /logs/:id` - Get log by ID
- `POST /logs` - Create a new log entry
- `DELETE /logs/:id` - Delete a log
- `DELETE /logs` - Delete all logs

### SQL Execution (`/sql`) - Protected
- `POST /sql/execute` - Execute raw SQL queries (SELECT, INSERT, UPDATE only)

## Database Tables

The application includes the following tables:
- **users** - User accounts with authentication
- **suppliers** - Supplier information
- **categories** - Product categories
- **subcategories** - Subcategories linked to categories
- **logs** - Application activity logs
- **products** - Product information (sample entity)

## Features

### Authentication & Authorization
- JWT-based authentication
- Password hashing with bcrypt
- Protected routes with JWT guards
- User roles support

### Swagger Documentation
- Complete API documentation at `/api`
- Interactive API testing
- Request/Response schemas
- Authentication support in Swagger UI

### Raw SQL Execution
- Execute SELECT, INSERT, UPDATE queries directly
- Security restrictions on dangerous operations (DROP, DELETE, TRUNCATE, etc.)
- Set `ALLOW_UNRESTRICTED_SQL=true` in `.env` to allow all SQL operations (development only!)
- Useful for custom queries and data analysis

### Database Features
- TypeORM with MySQL
- Automatic entity synchronization
- UTF8MB4 charset support
- Connection pooling
- Query logging
- Entity relationships (Category ↔ SubCategory)

## Project Structure

```
src/
├── entities/              # Database entities
│   ├── user.entity.ts
│   ├── supplier.entity.ts
│   ├── category.entity.ts
│   ├── subcategory.entity.ts
│   ├── log.entity.ts
│   └── product.entity.ts
├── users/                 # User module
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── suppliers/             # Supplier module
├── categories/            # Category module
├── subcategories/         # SubCategory module
├── auth/                  # Authentication module
│   ├── dto/
│   ├── guards/
│   ├── strategies/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── logs/                  # Log module
├── sql/                   # SQL execution module
├── database/              # Database configuration
├── app.module.ts          # Root module
└── main.ts                # Application entry point
```

## Usage Examples

### 1. Register a User
```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### 2. Login
```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 3. Access Protected Endpoints
Add the JWT token to the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### 4. Execute Raw SQL
```bash
POST /sql/execute
Authorization: Bearer <your-jwt-token>
{
  "query": "SELECT * FROM users WHERE role = 'admin'"
}
```

## Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build the application
- `npm run start:prod` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests

## Security Notes

- Change `JWT_SECRET` in production
- The SQL execution endpoint restricts dangerous operations by default
- Set `ALLOW_UNRESTRICTED_SQL=true` only in development environments
- All protected endpoints require valid JWT token
- Passwords are hashed using bcrypt

## License

MIT

