Environment setup

Required variables
- MONGO_URI: Your MongoDB connection string
- PORT: Optional. Defaults to 5000

Local setup
1) Create a file named .env inside the backend directory with:

   MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/<db-name>?retryWrites=true&w=majority
   PORT=5000

2) Start the server:

   npm --prefix backend run start

Windows PowerShell (temporary)
- Set environment variable for the current session only:

  $env:MONGO_URI = "your-connection-string"
  npm --prefix backend run start

Troubleshooting
- If you see: The `uri` parameter to `openUri()` must be a string
  Ensure MONGO_URI is set in backend/.env or your shell before starting.

