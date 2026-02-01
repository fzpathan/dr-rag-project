# DR-RAG Mobile App

React Native + Expo mobile application for the Homeopathy Remedy Finder.

## Features

- **Voice & Text Input**: Record your question or type it
- **AI-Powered Recommendations**: Get remedy suggestions from classical texts
- **Source Citations**: Every recommendation includes textbook references
- **Professional UI**: Clean, medical-themed design

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for testing)

## Setup

1. **Install dependencies**:
   ```bash
   cd dr-rag-mobile
   npm install
   ```

2. **Configure API endpoint**:
   Edit `src/constants/api.ts` and set your backend URL:
   ```typescript
   export const API_BASE_URL = 'http://your-server-ip:8000/api/v1';
   ```

3. **Add app assets** (optional):
   - Add `icon.png` (1024x1024) to `assets/images/`
   - Add `splash.png` (1284x2778) to `assets/images/`
   - Add `adaptive-icon.png` (1024x1024) to `assets/images/`

## Running

### Development (Expo Go)

```bash
# Start the development server
npm start

# Or for specific platforms
npm run android
npm run ios
npm run web
```

### Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## Project Structure

```
dr-rag-mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Auth screens (login, register)
│   ├── (tabs)/            # Main app tabs
│   └── _layout.tsx        # Root layout
├── src/
│   ├── components/        # Reusable components
│   ├── constants/         # Colors, typography, API config
│   ├── hooks/             # Custom hooks
│   ├── services/          # API services
│   ├── stores/            # Zustand state stores
│   └── types/             # TypeScript types
└── assets/                # Images and fonts
```

## Screens

- **Login/Register**: Email/password authentication
- **Home**: Main query interface with text/voice toggle
- **About**: App information and disclaimer
- **Contact**: Contact form and info
- **Coming Up**: Feature roadmap

## Testing

Make sure the FastAPI backend is running before testing the mobile app:

```bash
# In the project root
cd ..
pip install -r api_requirements.txt
uvicorn api.main:app --reload --host 0.0.0.0
```

Then test on:
- **Android Emulator**: Use `http://10.0.2.2:8000` as API URL
- **iOS Simulator**: Use `http://localhost:8000` as API URL
- **Physical Device**: Use your computer's local IP address
