# Test Events Creation Script

This script creates test events of all types with varied dates to test the date sorting functionality.

## Event Types Created

The script creates test events for the following types:

1. **Workshop** - 4 events
   - Required fields: `faculty`, `professors`
   - Optional fields: `agenda`, `extraResources`

2. **Bazaar** - 3 events
   - Required fields: `registrationDeadline`

3. **Trip** - 3 events
   - Required fields: `price`

4. **Conference** - 2 events
   - Required fields: `agenda`, `website`, `budget`, `fundingSource`

5. **Booth** - 2 events
   - Standard event fields

6. **Sports** - 2 events
   - Standard event fields

7. **Seminar** - 2 events
   - Standard event fields

8. **Standalone Booth** - 2 events
   - Required fields: `boothNumber`, `boothSize`, `amenities`, `boothStatus`

## Date Distribution

Events are created with dates ranging from:
- **Nearest**: 1 day from today (Database Design Workshop)
- **Mid-range**: 5-60 days from today
- **Furthest**: 90 days from today (Winter Market Bazaar)

This distribution allows you to test:
- Sorting by startDate (nearest first)
- Events with different time ranges
- Past, present, and future events

## Usage

### Option 1: Using npm script (Recommended)
```bash
cd backend
npm run create-test-events
```

### Option 2: Direct node execution
```bash
cd backend
node scripts/create-test-events.js
```

## Prerequisites

1. **Test Users**: It's recommended to run `create-test-users.js` first to create test users. The script will use these users as event creators. If no test users exist, events will be created without a `createdBy` field.

2. **Database**: MongoDB must be running and accessible via `MONGO_URI` in your `.env` file.

## Event Details

### Workshop Events
- Python Programming Workshop (5 days from now)
- Machine Learning Fundamentals (15 days from now)
- Web Development Bootcamp (30 days from now)
- Database Design Workshop (1 day from now) - **Nearest event**

### Bazaar Events
- Spring Bazaar 2025 (7 days from now)
- Summer Festival Bazaar (45 days from now)
- Winter Market Bazaar (90 days from now) - **Furthest event**

### Trip Events
- Alexandria Day Trip (10 days from now)
- Sinai Desert Adventure (20 days from now)
- Luxor Historical Tour (60 days from now)

### Conference Events
- AI and Machine Learning Conference (25 days from now)
- Sustainable Development Conference (50 days from now)

### Other Events
- Various booth, sports, and seminar events with dates spread across the timeline

## Testing Date Sorting

After running the script, you can test the sorting functionality by:

1. **Fetching all events** using any of the event endpoints:
   - `GET /api/events` - All events (general)
   - `GET /api/events/student` - Events for students/staff/TA/professors
   - `GET /api/events/admin/all` - All events for admin

2. **Verify sorting**: Events should be returned sorted by `startDate` in ascending order (nearest date first, furthest date last).

3. **Expected order**: The event with the nearest date (Database Design Workshop - 1 day from now) should appear first in the list, and the event with the furthest date (Winter Market Bazaar - 90 days from now) should appear last.

## Event Statuses

Most events are created with `status: 'approved'` for testing. The script also includes:
- 1 event with `status: 'pending'` (Pending Workshop)
- 1 event with `status: 'cancelled'` (Cancelled Event)

## Notes

- The script checks for existing events with the same title and startDate to avoid duplicates
- Events are created with realistic data including descriptions, locations, and capacities
- All event types include their required attributes as per the Event model schema
- Events are assigned to test users (admin, professor, events office, or staff) if available

## Troubleshooting

If you encounter errors:
1. Ensure MongoDB is running and accessible
2. Check that `MONGO_URI` is correctly set in the `.env` file
3. Verify that test users exist (run `create-test-users.js` first)
4. Check that no events with the same title and startDate already exist

## Output

The script will display:
- Number of events created
- Number of events that already existed (skipped)
- Number of errors (if any)
- A sorted list of created events showing their dates and types

