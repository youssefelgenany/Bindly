const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const Admin = require("../models/AdminModel");

// Admin creates new admin/event office accounts
exports.createAdminOrEventOffice = async (req, res) => {
   console.log("🔹 Body received:", req.body);
  try {
    const { name, email, password, role } = req.body;
    const requestingUser = req.user; // The admin making the request
    
    console.log('🔍 Creating admin account:', { name, email, role });
    console.log('🔍 Requesting user:', { id: requestingUser._id, userType: requestingUser.userType });
    
    if (!name || !email || !password || !role)
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields" 
      });

    // Validate role
    if (!["Admin", "Event Office","admin", "event_office"].includes(role))
      return res.status(400).json({ 
        success: false,
        message: "Invalid role. Must be Admin or Event Office" 
      });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ 
      success: false,
      message: "Email already exists" 
    });

<<<<<<< HEAD
    // Map human role to schema enum and satisfy required fields
    const mappedUserType = role === 'Admin' ? 'admin' : 'event_office';

    // Build payload; for admin/event_office the schema requires `name`
    const payload = {
      email,
      password,
      userType: mappedUserType,
      name: `${firstName || ''} ${lastName || ''}`.trim() || role,
      // make immediately active/verified; adjust if business rules differ
      isVerified: true,
      status: 'active'
    };

    // Optionally keep first/last for convenience
    if (firstName) payload.firstName = firstName;
    if (lastName) payload.lastName = lastName;

    const newUser = await User.create(payload);
=======
    //const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password,
      userType:
  role === "Admin"
    ? "admin"
    : role === "Event Office"
      ? "event_office"
      : role,

      isVerified: false,
      status: 'active'
    });
>>>>>>> 0f613bea9e7159d154d283ea92290f6b518f8703

    console.log('✅ Admin account created successfully:', newUser._id);

    res.status(201).json({ 
      success: true,
      message: "Account created successfully", 
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        userType: newUser.userType,
        isVerified: newUser.isVerified,
        status: newUser.status,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    console.error('❌ Error creating admin account:', err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

// Admin deletes admin or event office accounts
exports.deleteAdminOrEventOffice = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ 
      success: false,
      message: "User not found" 
    });

    if (!["admin", "event_office"].includes(user.userType.toLowerCase()))
      return res.status(400).json({ msg: "Not an admin/event office account" });

    await user.deleteOne();
    res.status(200).json({ 
      success: true,
      message: "Account deleted successfully" 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};
