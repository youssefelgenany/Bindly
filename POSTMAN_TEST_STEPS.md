# 🧪 Complete Postman Test: Comment Warning Email

## Full Testing Flow

### Step 1: Login as Events Office

**POST** `http://localhost:5000/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "eventoffice@example.com",
  "password": "your_password"
}
```

**✅ Save the `token`** → This is your `EVENTS_OFFICE_TOKEN`

---

### Step 2: Create an Event (as Events Office)

**POST** `http://localhost:5000/api/events`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_EVENTS_OFFICE_TOKEN
```

**Body (raw JSON):**
```json
{
  "title": "Test Event for Comments",
  "description": "This is a test event to test comment functionality",
  "type": "workshop",
  "startDate": "2024-12-31T10:00:00.000Z",
  "endDate": "2024-12-31T18:00:00.000Z",
  "location": "Main Hall",
  "capacity": 50,
  "price": 0
}
```

**✅ Save the `event._id`** → This is your `EVENT_ID`

---

### Step 3: Login as Student

**POST** `http://localhost:5000/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "student@example.com",
  "password": "your_password"
}
```

**✅ Save the `token`** → This is your `STUDENT_TOKEN`
**✅ Save the `user.email`** → This is your `STUDENT_EMAIL`

---

### Step 4: Register Student for the Event

**IMPORTANT**: Student must register/attend before they can comment!

**POST** `http://localhost:5000/api/events/{EVENT_ID}/register`

**Headers:**
```
Authorization: Bearer YOUR_STUDENT_TOKEN
```

**Body:** 
- **Option 1**: Don't include `Content-Type: application/json` header (no body needed)
- **Option 2**: If you must include the header, use an empty JSON object: `{}`
- **Option 3**: Remove the `Content-Type` header entirely from Postman

**Expected Response (201):**
```json
{
  "msg": "Successfully registered for event",
  "holderType": "event",
  "registration": { ... }
}
```

**OR if it's a workshop/trip, use:**

**POST** `http://localhost:5000/api/student-registrations/{EVENT_ID}`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_STUDENT_TOKEN
```

**Body (raw JSON):**
```json
{
  "studentName": "John Doe",
  "studentId": "12345",
  "studentEmail": "YOUR_STUDENT_EMAIL"
}
```

---

### Step 5: Try to Comment WITHOUT Registration (Should Fail)

**POST** `http://localhost:5000/api/events/{EVENT_ID}/comments`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_STUDENT_TOKEN
```

**Body (raw JSON):**
```json
{
  "text": "This comment should fail because I'm not registered"
}
```

**❌ Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "msg": "You can only comment on events you have attended/registered for"
}
```

---

### Step 6: Comment on Event (After Registration - Should Succeed)

**POST** `http://localhost:5000/api/events/{EVENT_ID}/comments`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_STUDENT_TOKEN
```

**Body (raw JSON):**
```json
{
  "text": "This is a test comment that might be inappropriate"
}
```

**✅ Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Comment submitted successfully",
  "comment": {
    "_id": "COMMENT_ID_HERE",
    "text": "This is a test comment that might be inappropriate",
    "user": { ... },
    "createdAt": "..."
  }
}
```

**✅ Save the `comment._id`** → This is your `COMMENT_ID`

---

### Step 7: Verify Comment Was Created

**GET** `http://localhost:5000/api/events/{EVENT_ID}/comments`

**Headers:**
```
Authorization: Bearer YOUR_STUDENT_TOKEN
```

**✅ Should see your comment in the response**

---

### Step 8: Login as Admin

**POST** `http://localhost:5000/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "admin@example.com",
  "password": "your_password"
}
```

**✅ Save the `token`** → This is your `ADMIN_TOKEN`

---

### Step 9: Delete Comment with Warning Email (as Admin)

**⚠️ IMPORTANT**: You MUST be logged in as **Admin** or **Event Office** to delete someone else's comment!

**DELETE** `http://localhost:5000/api/events/{EVENT_ID}/comments/{COMMENT_ID}`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**⚠️ Make sure you're using the ADMIN_TOKEN, not the STUDENT_TOKEN!**

**Body (raw JSON):**
```json
{
  "reason": "inappropriate"
}
```

**OR use query parameter (if body doesn't work):**
- **URL**: `http://localhost:5000/api/events/{EVENT_ID}/comments/{COMMENT_ID}?reason=inappropriate`
- **Headers**: Only `Authorization: Bearer YOUR_ADMIN_TOKEN`

**✅ Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Comment deleted successfully",
  "deletedCommentId": "COMMENT_ID_HERE"
}
```

---

### Step 10: Check Warning Email Was Sent

#### Option A: Development Mode (SMTP not configured)

**GET** `http://localhost:5000/api/dev/emails`

**✅ Look for email with:**
- **Subject**: "Comment Removed - Policy Violation Warning - Test Event for Comments"
- **To**: Your student email address
- **Content**: Should contain event title, removed comment text, and warning message

#### Option B: Production Mode (SMTP configured)

- Check the **Student's email inbox**
- Check **spam folder**
- Check **backend console logs** for:
  ```
  ✅ Comment warning email sent successfully to: student@example.com
  ```

---

## ✅ Complete Test Checklist

- [ ] Events Office can login
- [ ] Events Office can create an event
- [ ] Student can login
- [ ] Student can register for the event
- [ ] Student **CANNOT** comment without registration (403 error)
- [ ] Student **CAN** comment after registration (201 success)
- [ ] Comment appears in GET comments response
- [ ] Admin can login
- [ ] Admin can delete comment with reason "inappropriate"
- [ ] Warning email is sent to student
- [ ] Email contains correct event title
- [ ] Email contains removed comment text
- [ ] Email contains warning message

---

## 🔧 Troubleshooting

### Issue: "You can only comment on events you have attended/registered for" (403)

**Solution**: Make sure you completed Step 4 (Register Student for Event) before trying to comment.

### Issue: Registration endpoint returns error

**Check:**
- Event exists and is approved
- Event hasn't started yet (if it has a start date)
- Event has capacity available
- You're not already registered

### Issue: Email not sending

1. **Check backend console** for email logs
2. **Check** `http://localhost:5000/api/dev/emails` (if SMTP not configured)
3. **Verify SMTP settings** in `.env` file (if SMTP configured)
4. **Check spam folder** in student's email

### Issue: 401 Unauthorized

- Token expired → Login again
- Wrong token → Use correct token for each step

---

## 📋 Quick Reference: All Endpoints

| Step | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 1 | POST | `/api/auth/login` | Login Events Office |
| 2 | POST | `/api/events` | Create event |
| 3 | POST | `/api/auth/login` | Login Student |
| 4 | POST | `/api/events/{id}/register` | Register for event |
| 5 | POST | `/api/events/{id}/comments` | Try comment (should fail) |
| 6 | POST | `/api/events/{id}/comments` | Comment (should succeed) |
| 7 | GET | `/api/events/{id}/comments` | Get comments |
| 8 | POST | `/api/auth/login` | Login Admin |
| 9 | DELETE | `/api/events/{id}/comments/{commentId}` | Delete comment |
| 10 | GET | `/api/dev/emails` | Check email sent |

---

## 🎯 Expected Flow Summary

1. **Events Office** creates event → Gets `EVENT_ID`
2. **Student** registers for event → Can now comment
3. **Student** tries to comment without registration → ❌ 403 Forbidden
4. **Student** comments after registration → ✅ 201 Created
5. **Admin** deletes comment with reason "inappropriate" → ✅ 200 OK
6. **Student** receives warning email → ✅ Email sent

---

## 💡 Tips

- **Save tokens in Postman environment variables** for easier testing
- **Use Postman Collections** to organize all requests
- **Check backend console logs** for detailed error messages
- **Test with different user types** (Student, Staff, TA, Professor)

