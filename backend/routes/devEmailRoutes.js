const express = require('express');
const router = express.Router();
const {
  getAllEmails,
  getEmailById,
  deleteEmail,
  clearAllEmails
} = require('../controllers/devEmailController');

// Development email routes (only in development)
if (process.env.NODE_ENV !== 'production') {
  // Get all emails
  router.get('/emails', getAllEmails);
  
  // Get email by ID
  router.get('/emails/:id', getEmailById);
  
  // Delete email
  router.delete('/emails/:id', deleteEmail);
  
  // Clear all emails
  router.delete('/emails', clearAllEmails);
  
  // Development email viewer page
  router.get('/email-viewer', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Development Email Viewer</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0; }
          .email-list { display: grid; gap: 15px; }
          .email-item { border: 1px solid #ddd; border-radius: 5px; padding: 15px; cursor: pointer; transition: all 0.3s; }
          .email-item:hover { background: #f8f9fa; border-color: #007bff; }
          .email-item.unread { background: #e3f2fd; border-left: 4px solid #2196f3; }
          .email-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
          .email-to { font-weight: bold; color: #333; }
          .email-time { color: #666; font-size: 0.9em; }
          .email-subject { font-size: 1.1em; color: #007bff; margin-bottom: 5px; }
          .email-preview { color: #666; font-size: 0.9em; }
          .btn { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 10px; }
          .btn:hover { background: #0056b3; }
          .btn-danger { background: #dc3545; }
          .btn-danger:hover { background: #c82333; }
          .email-content { margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 5px; }
          .verification-link { background: #28a745; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 10px 0; }
          .verification-link:hover { background: #218838; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Development Email Viewer</h1>
            <div>
              <button class="btn" onclick="loadEmails()">Refresh</button>
              <button class="btn btn-danger" onclick="clearAllEmails()">Clear All</button>
            </div>
          </div>
          <div id="emailList" class="email-list">
            <p>Loading emails...</p>
          </div>
          <div id="emailContent" class="email-content" style="display: none;">
            <h3>Email Content</h3>
            <div id="emailDetails"></div>
          </div>
        </div>

        <script>
          let emails = [];
          
          async function loadEmails() {
            try {
              const response = await fetch('/api/dev/emails');
              const data = await response.json();
              emails = data.emails || [];
              displayEmails();
            } catch (error) {
              console.error('Error loading emails:', error);
              document.getElementById('emailList').innerHTML = '<p>Error loading emails</p>';
            }
          }
          
          function displayEmails() {
            const emailList = document.getElementById('emailList');
            if (emails.length === 0) {
              emailList.innerHTML = '<p>No emails found</p>';
              return;
            }
            
            emailList.innerHTML = emails.map(email => \`
              <div class="email-item \${email.isRead ? '' : 'unread'}" onclick="viewEmail('\${email._id}')">
                <div class="email-header">
                  <div class="email-to">To: \${email.to}</div>
                  <div class="email-time">\${new Date(email.sentAt).toLocaleString()}</div>
                </div>
                <div class="email-subject">\${email.subject}</div>
                <div class="email-preview">User: \${email.userInfo.name} | Type: \${email.userInfo.userType}</div>
              </div>
            \`).join('');
          }
          
          async function viewEmail(emailId) {
            try {
              const response = await fetch(\`/api/dev/emails/\${emailId}\`);
              const data = await response.json();
              const email = data.email;
              
              document.getElementById('emailDetails').innerHTML = \`
                <h4>Email Details</h4>
                <p><strong>To:</strong> \${email.to}</p>
                <p><strong>Subject:</strong> \${email.subject}</p>
                <p><strong>Sent:</strong> \${new Date(email.sentAt).toLocaleString()}</p>
                <p><strong>User:</strong> \${email.userInfo.name} (\${email.userInfo.userType})</p>
                <hr>
                <h4>Email Content</h4>
                <div style="border: 1px solid #ddd; padding: 15px; background: white; border-radius: 5px;">
                  \${email.html}
                </div>
                <hr>
                <h4>Verification Link</h4>
                <a href="\${email.verificationUrl}" class="verification-link" target="_blank">
                  🔗 Click to Verify Account
                </a>
                <p><small>Token: \${email.verificationToken}</small></p>
              \`;
              
              document.getElementById('emailContent').style.display = 'block';
              
              // Mark as read
              loadEmails();
            } catch (error) {
              console.error('Error viewing email:', error);
            }
          }
          
          async function clearAllEmails() {
            if (confirm('Are you sure you want to clear all emails?')) {
              try {
                await fetch('/api/dev/emails', { method: 'DELETE' });
                loadEmails();
              } catch (error) {
                console.error('Error clearing emails:', error);
              }
            }
          }
          
          // Load emails on page load
          loadEmails();
        </script>
      </body>
      </html>
    `);
  });
}

module.exports = router;
