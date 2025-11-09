const mongoose = require('mongoose');
const Event = require('../models/eventModel');
const User = require('../models/userModel');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Helper function to add days to a date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Helper function to create date from string
function createDate(year, month, day, hours = 10, minutes = 0) {
  return new Date(year, month - 1, day, hours, minutes);
}

async function createTestEvents() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get test users for createdBy field
    const adminUser = await User.findOne({ email: 'admin.test@guc.edu.eg' });
    const professorUser = await User.findOne({ email: 'professor.test@guc.edu.eg' });
    const eventsOfficeUser = await User.findOne({ email: 'events.office.test@guc.edu.eg' });
    const staffUser = await User.findOne({ email: 'staff.test@guc.edu.eg' });

    // Use admin as default creator if available, otherwise events office, otherwise null
    const defaultCreator = adminUser || eventsOfficeUser || staffUser || null;

    if (!defaultCreator) {
      console.log('⚠️  No test users found. Please run create-test-users.js first.');
      console.log('   Events will be created without createdBy field.\n');
    } else {
      console.log(`✅ Using creator: ${defaultCreator.email} (${defaultCreator.userType})\n`);
    }

    // Get current date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Test events data with varied dates
    const testEvents = [
      // WORKSHOP EVENTS
      {
        title: 'Python Programming Workshop',
        description: 'Learn Python programming from scratch. Perfect for beginners.',
        type: 'workshop',
        startDate: addDays(today, 5), // 5 days from now
        endDate: addDays(today, 5),
        location: 'GUC Cairo - Building C, Room 301',
        capacity: 50,
        status: 'approved',
        createdBy: defaultCreator?._id,
        faculty: 'IET',
        professors: 'Dr. Mohamed Hassan',
        agenda: 'Introduction to Python, Data Types, Control Structures, Functions, OOP',
        extraResources: 'Laptops required. Python 3.8+ installed.',
        registrationDeadline: addDays(today, 3)
      },
      {
        title: 'Machine Learning Fundamentals',
        description: 'Introduction to ML concepts and algorithms.',
        type: 'workshop',
        startDate: addDays(today, 15), // 15 days from now
        endDate: addDays(today, 16),
        location: 'GUC Cairo - Building A, Lab 205',
        capacity: 30,
        status: 'approved',
        createdBy: professorUser?._id || defaultCreator?._id,
        faculty: 'MET',
        professors: 'Dr. Sara Ibrahim, Dr. Ahmed Ali',
        agenda: 'ML Basics, Supervised Learning, Unsupervised Learning, Neural Networks',
        extraResources: 'Python, NumPy, Pandas, Scikit-learn',
        registrationDeadline: addDays(today, 12)
      },
      {
        title: 'Web Development Bootcamp',
        description: 'Full-stack web development workshop covering React and Node.js.',
        type: 'workshop',
        startDate: addDays(today, 30), // 30 days from now
        endDate: addDays(today, 32),
        location: 'GUC Cairo - Building B, Room 401',
        capacity: 40,
        status: 'approved',
        createdBy: defaultCreator?._id,
        faculty: 'IET',
        professors: 'Dr. Omar Mohamed',
        agenda: 'HTML/CSS, JavaScript, React, Node.js, MongoDB, Deployment',
        extraResources: 'VS Code, Node.js, Git',
        registrationDeadline: addDays(today, 25)
      },
      {
        title: 'Database Design Workshop',
        description: 'Learn database design principles and SQL.',
        type: 'workshop',
        startDate: addDays(today, 1), // 1 day from now (nearest)
        endDate: addDays(today, 1),
        location: 'GUC Cairo - Building C, Room 202',
        capacity: 35,
        status: 'approved',
        createdBy: defaultCreator?._id,
        faculty: 'IET',
        professors: 'Dr. Mohamed Hassan',
        agenda: 'ER Modeling, Normalization, SQL Queries, Database Administration',
        registrationDeadline: addDays(today, 0) // Today
      },

      // BAZAAR EVENTS
      {
        title: 'Spring Bazaar 2025',
        description: 'Annual spring bazaar with food, clothes, and handmade items.',
        type: 'bazaar',
        startDate: addDays(today, 7), // 7 days from now
        endDate: addDays(today, 9),
        location: 'GUC Cairo - Central Plaza',
        capacity: 500,
        status: 'approved',
        createdBy: defaultCreator?._id,
        registrationDeadline: addDays(today, 5)
      },
      {
        title: 'Summer Festival Bazaar',
        description: 'Summer festival with vendors selling various products.',
        type: 'bazaar',
        startDate: addDays(today, 45), // 45 days from now
        endDate: addDays(today, 47),
        location: 'GUC Cairo - Student Center',
        capacity: 300,
        status: 'approved',
        createdBy: defaultCreator?._id,
        registrationDeadline: addDays(today, 40)
      },
      {
        title: 'Winter Market Bazaar',
        description: 'Winter market with hot beverages and warm clothing.',
        type: 'bazaar',
        startDate: addDays(today, 90), // 90 days from now (furthest)
        endDate: addDays(today, 92),
        location: 'GUC Cairo - Main Entrance',
        capacity: 400,
        status: 'approved',
        createdBy: defaultCreator?._id,
        registrationDeadline: addDays(today, 85)
      },

      // TRIP EVENTS
      {
        title: 'Alexandria Day Trip',
        description: 'Visit the beautiful city of Alexandria for a day trip.',
        type: 'trip',
        startDate: addDays(today, 10), // 10 days from now
        endDate: addDays(today, 10),
        location: 'Alexandria, Egypt',
        capacity: 40,
        price: 500,
        status: 'approved',
        createdBy: defaultCreator?._id,
        registrationDeadline: addDays(today, 7)
      },
      {
        title: 'Sinai Desert Adventure',
        description: '3-day adventure trip to Sinai desert with camping.',
        type: 'trip',
        startDate: addDays(today, 20), // 20 days from now
        endDate: addDays(today, 22),
        location: 'Sinai, Egypt',
        capacity: 25,
        price: 1500,
        status: 'approved',
        createdBy: defaultCreator?._id,
        registrationDeadline: addDays(today, 15)
      },
      {
        title: 'Luxor Historical Tour',
        description: '2-day tour to Luxor to visit ancient Egyptian temples.',
        type: 'trip',
        startDate: addDays(today, 60), // 60 days from now
        endDate: addDays(today, 61),
        location: 'Luxor, Egypt',
        capacity: 30,
        price: 1200,
        status: 'approved',
        createdBy: defaultCreator?._id,
        registrationDeadline: addDays(today, 55)
      },

      // CONFERENCE EVENTS
      {
        title: 'AI and Machine Learning Conference',
        description: 'Annual conference on AI and ML research and applications.',
        type: 'conference',
        startDate: addDays(today, 25), // 25 days from now
        endDate: addDays(today, 27),
        location: 'GUC Cairo - Main Auditorium',
        capacity: 200,
        status: 'approved',
        createdBy: defaultCreator?._id,
        agenda: 'Keynote speeches, Research presentations, Panel discussions, Workshops',
        website: 'https://guc.edu.eg/ai-conference-2025',
        budget: 50000,
        fundingSource: 'external',
        registrationDeadline: addDays(today, 20)
      },
      {
        title: 'Sustainable Development Conference',
        description: 'Conference on sustainable development and environmental issues.',
        type: 'conference',
        startDate: addDays(today, 50), // 50 days from now
        endDate: addDays(today, 51),
        location: 'GUC Cairo - Conference Hall',
        capacity: 150,
        status: 'approved',
        createdBy: defaultCreator?._id,
        agenda: 'Climate change, Renewable energy, Sustainable practices, Green technology',
        website: 'https://guc.edu.eg/sustainability-conference',
        budget: 30000,
        fundingSource: 'GUC',
        registrationDeadline: addDays(today, 45)
      },

      // BOOTH EVENTS
      {
        title: 'Tech Innovation Booth',
        description: 'Booth showcasing innovative tech products and startups.',
        type: 'booth',
        startDate: addDays(today, 12), // 12 days from now
        endDate: addDays(today, 14),
        location: 'GUC Cairo - Student Center',
        capacity: 100,
        status: 'approved',
        createdBy: defaultCreator?._id,
        registrationDeadline: addDays(today, 10)
      },
      {
        title: 'Career Fair Booth',
        description: 'Career fair with companies recruiting students.',
        type: 'booth',
        startDate: addDays(today, 35), // 35 days from now
        endDate: addDays(today, 36),
        location: 'GUC Cairo - Main Hall',
        capacity: 200,
        status: 'approved',
        createdBy: defaultCreator?._id,
        registrationDeadline: addDays(today, 30)
      },

      // SPORTS EVENTS
      {
        title: 'Basketball Tournament',
        description: 'Inter-department basketball tournament.',
        type: 'sports',
        startDate: addDays(today, 8), // 8 days from now
        endDate: addDays(today, 10),
        location: 'GUC Cairo - Sports Complex',
        capacity: 100,
        status: 'approved',
        createdBy: defaultCreator?._id,
        registrationDeadline: addDays(today, 5)
      },
      {
        title: 'Football Championship',
        description: 'Annual football championship between student teams.',
        type: 'sports',
        startDate: addDays(today, 40), // 40 days from now
        endDate: addDays(today, 42),
        location: 'GUC Cairo - Football Field',
        capacity: 200,
        status: 'approved',
        createdBy: defaultCreator?._id,
        registrationDeadline: addDays(today, 35)
      },

      // SEMINAR EVENTS
      {
        title: 'Entrepreneurship Seminar',
        description: 'Learn how to start your own business and become an entrepreneur.',
        type: 'seminar',
        startDate: addDays(today, 3), // 3 days from now
        endDate: addDays(today, 3),
        location: 'GUC Cairo - Building A, Auditorium',
        capacity: 150,
        status: 'approved',
        createdBy: defaultCreator?._id,
        registrationDeadline: addDays(today, 1)
      },
      {
        title: 'Career Development Seminar',
        description: 'Tips and strategies for career development and job searching.',
        type: 'seminar',
        startDate: addDays(today, 18), // 18 days from now
        endDate: addDays(today, 18),
        location: 'GUC Cairo - Building B, Room 301',
        capacity: 80,
        status: 'approved',
        createdBy: defaultCreator?._id,
        registrationDeadline: addDays(today, 15)
      },

      // STANDALONE BOOTH EVENTS
      {
        title: 'Standalone Booth #1',
        description: 'Standalone booth available for vendors.',
        type: 'standaloneBooth',
        startDate: addDays(today, 6), // 6 days from now
        endDate: addDays(today, 20),
        location: 'GUC Cairo - Main Entrance',
        capacity: 1,
        status: 'approved',
        createdBy: defaultCreator?._id,
        boothNumber: 1,
        boothSize: '2x2',
        amenities: ['power-outlet', 'wifi', 'lighting'],
        boothStatus: 'free'
      },
      {
        title: 'Standalone Booth #2',
        description: 'Standalone booth available for vendors.',
        type: 'standaloneBooth',
        startDate: addDays(today, 22), // 22 days from now
        endDate: addDays(today, 36),
        location: 'GUC Cairo - Food Court',
        capacity: 1,
        status: 'approved',
        createdBy: defaultCreator?._id,
        boothNumber: 2,
        boothSize: '4x4',
        amenities: ['power-outlet', 'wifi', 'storage', 'refrigeration'],
        boothStatus: 'free'
      },

      // EVENTS WITH DIFFERENT STATUSES (for testing)
      {
        title: 'Pending Workshop',
        description: 'This workshop is pending approval.',
        type: 'workshop',
        startDate: addDays(today, 70), // 70 days from now
        endDate: addDays(today, 70),
        location: 'GUC Cairo - Building C, Room 301',
        capacity: 30,
        status: 'pending',
        createdBy: professorUser?._id || defaultCreator?._id,
        faculty: 'IET',
        professors: 'Dr. Mohamed Hassan',
        registrationDeadline: addDays(today, 65)
      },
      {
        title: 'Cancelled Event',
        description: 'This event has been cancelled.',
        type: 'seminar',
        startDate: addDays(today, 55), // 55 days from now
        endDate: addDays(today, 55),
        location: 'GUC Cairo - Building A, Room 101',
        capacity: 50,
        status: 'cancelled',
        createdBy: defaultCreator?._id,
        registrationDeadline: addDays(today, 50)
      }
    ];

    console.log('🔍 Creating test events...\n');

    const createdEvents = [];
    const existingEvents = [];
    const errors = [];

    for (const eventData of testEvents) {
      try {
        // Check if event with same title and startDate already exists
        const existingEvent = await Event.findOne({ 
          title: eventData.title,
          startDate: eventData.startDate
        });
        
        if (existingEvent) {
          console.log(`⚠️  Event already exists: ${eventData.title} (${eventData.type})`);
          existingEvents.push(eventData);
          continue;
        }

        // Create new event
        const newEvent = new Event(eventData);
        await newEvent.save();
        
        console.log(`✅ Created ${eventData.type}: ${eventData.title} (${eventData.startDate.toISOString().split('T')[0]})`);
        createdEvents.push({
          title: eventData.title,
          type: eventData.type,
          startDate: eventData.startDate,
          status: eventData.status
        });
      } catch (error) {
        console.error(`❌ Error creating event ${eventData.title}:`, error.message);
        errors.push({ title: eventData.title, error: error.message });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Created: ${createdEvents.length} event(s)`);
    console.log(`⚠️  Already existed: ${existingEvents.length} event(s)`);
    console.log(`❌ Errors: ${errors.length} event(s)`);
    
    if (createdEvents.length > 0) {
      console.log('\n📅 Created Events (sorted by startDate):');
      console.log('-'.repeat(70));
      
      // Sort events by startDate to show they're ready for testing
      const sortedEvents = [...createdEvents].sort((a, b) => {
        return new Date(a.startDate) - new Date(b.startDate);
      });
      
      sortedEvents.forEach((event, index) => {
        const dateStr = new Date(event.startDate).toISOString().split('T')[0];
        const daysFromNow = Math.ceil((new Date(event.startDate) - today) / (1000 * 60 * 60 * 24));
        console.log(`${index + 1}. [${event.type.toUpperCase()}] ${event.title}`);
        console.log(`   Date: ${dateStr} (${daysFromNow > 0 ? `in ${daysFromNow} days` : daysFromNow === 0 ? 'today' : `${Math.abs(daysFromNow)} days ago`}) | Status: ${event.status}`);
      });
    }

    if (existingEvents.length > 0) {
      console.log('\n⚠️  Existing Events (not created):');
      console.log('-'.repeat(70));
      existingEvents.forEach(event => {
        console.log(`  ${event.type}: ${event.title}`);
      });
    }

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      console.log('-'.repeat(70));
      errors.forEach(err => {
        console.log(`  ${err.title}: ${err.error}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ Test events creation completed!');
    console.log('='.repeat(70));
    console.log('\n💡 Note: Events are sorted by startDate (nearest first) when fetched.');
    console.log('   The event with the nearest date should appear first in the list.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createTestEvents();

