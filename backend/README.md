# Attend Ease Backend

## Database Setup Required

The application is trying to connect to PostgreSQL but authentication failed.

### Please set up the database:

**Option 1: Update the password in `.env` file**
```env
DATABASE_URL="postgresql://seed:YOUR_ACTUAL_PASSWORD@localhost:5432/attendease?schema=public"
```

**Option 2: Create/Reset the database user**
```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE attendease;

-- Create user with password
CREATE USER seed WITH PASSWORD 'your_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE attendease TO seed;

-- Connect to the database
\c attendease

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO seed;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO seed;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO seed;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO seed;
```

**Option 3: Use default postgres user** (for development)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/attendease?schema=public"
```

## After fixing the database connection:

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start the application
npm run start:dev
```

## Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production  
- `npm run start:prod` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:seed` - Seed the database with initial data

## API Documentation

Once the server is running, visit:
- http://localhost:3000/api/docs - Swagger UI

## Environment Variables

Copy `.env` and update with your values:
- DATABASE_URL - PostgreSQL connection string
- JWT_SECRET - Secret key for JWT tokens
- PORT - Server port (default: 3000)
