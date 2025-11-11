# Test Users Creation Script

This script creates test users for all user types to facilitate testing of the event filtering functionality.

## User Types Created

The script creates the following test users:

1. **Student** - `student.test@student.guc.edu.eg`
2. **Admin** - `admin.test@guc.edu.eg`
3. **Professor** - `professor.test@guc.edu.eg`
4. **Staff** - `staff.test@guc.edu.eg`
5. **TA** - `ta.test@student.guc.edu.eg`
6. **Events Office** - `events.office.test@guc.edu.eg`

## Usage

### Option 1: Using npm script (Recommended)
```bash
cd backend
npm run create-test-users
```

### Option 2: Direct node execution
```bash
cd backend
node scripts/create-test-users.js
```

## Credentials

All test users have the same password for simplicity:
- **Password**: `password123`

## User Details

| User Type | Email | Password | Name |
|-----------|-------|----------|------|
| Student | student.test@student.guc.edu.eg | password123 | Ahmed Ali |
| Admin | admin.test@guc.edu.eg | password123 | Admin User |
| Professor | professor.test@guc.edu.eg | password123 | Dr. Mohamed Hassan |
| Staff | staff.test@guc.edu.eg | password123 | Sara Ibrahim |
| TA | ta.test@student.guc.edu.eg | password123 | Omar Mohamed |
| Events Office | events.office.test@guc.edu.eg | password123 | Events Office User |

## Notes

- The script checks if users already exist before creating them
- All users are created with `isVerified: true` and `status: 'active'` for testing purposes
- Students are automatically verified by the user model's pre-save hook
- Professor, Staff, TA, Admin, and Events Office users are manually verified after creation
- The script will display a summary of created users and their credentials

## Requirements

- MongoDB connection must be configured in `.env` file
- The script requires the `MONGO_URI` environment variable to be set
- Make sure the backend server is not running (or use a different database) to avoid conflicts

## Troubleshooting

If you encounter errors:
1. Ensure MongoDB is running and accessible
2. Check that `MONGO_URI` is correctly set in the `.env` file
3. Verify that the database connection is working
4. Check that no users with the same emails already exist (the script will skip them)

