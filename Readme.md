How to Run
1. Start the Backend API

# Install API dependencies
pip install -r api_requirements.txt

# Add JWT_SECRET_KEY to your .env file
echo "JWT_SECRET_KEY=ZORIF$(openssl rand -hex 32)" >> .env

# Start the server
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
API docs available at: http://localhost:8000/docs

2. Start the Mobile App

cd dr-rag-mobile

# Install dependencies
npm install

# Start Expo
npm start
Then scan the QR code with Expo Go on your phone.

3. Configure API URL
Edit dr-rag-mobile/src/constants/api.ts to set your backend URL:

Android Emulator: http://10.0.2.2:8000/api/v1
iOS Simulator: http://localhost:8000/api/v1
Physical Device: http://<your-ip>:8000/api/v1
App Features
Professional teal/medical color scheme
Text or voice input toggle
Voice recording with animated pulse effect
AI-generated remedy recommendations with markdown rendering
Collapsible source citations
Query caching (24h TTL)
JWT authentication with auto-refresh


Then try logging in with:

Email: test@example.com
Password: password123