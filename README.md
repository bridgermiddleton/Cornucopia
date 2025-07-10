🌽 Cornucopia
Smart Grocery Planning Made Simple
Cornucopia is a cross-platform mobile application built with React Native and Expo that revolutionizes how you manage your grocery shopping and meal planning. With intelligent features and a sleek interface, Cornucopia helps you stay organized, reduce food waste, and make grocery shopping more efficient.
✨ Features
🔐 User Authentication

Secure Firebase Authentication
Email/Password sign-up and login
Persistent user sessions

📍 Location Services

GPS location tracking for finding nearby grocery stores
Permission-based location access
Location-aware features

🏠 Core Functionality

Smart Home Dashboard: Personalized welcome screen with quick access to all features
Fridge Inventory Management: Track what's in your fridge and pantry
Meal Planning: Plan your meals and generate shopping lists
Grocery Shopping: Streamlined shopping experience with location integration
Settings Management: Customize your app experience

🎨 User Experience

Clean, modern interface with Material Design principles
Intuitive navigation with tab-based layout
Responsive design for both iOS and Android
Haptic feedback and smooth animations

🛠 Technology Stack
Frontend

React Native (0.76.7) - Cross-platform mobile development
Expo (~52.0.36) - Development platform and tools
Expo Router - File-based navigation system
TypeScript - Type-safe development

Navigation & UI

React Navigation - Bottom tabs and native navigation
Expo Vector Icons - Beautiful iconography
React Native Reanimated - Smooth animations
React Native Gesture Handler - Touch interactions

Backend & Services

Firebase (11.3.0) - Backend as a Service

Authentication
Firestore Database
Cloud Storage


OpenAI (4.87.3) - AI-powered features

Device Integration

Expo Location - GPS and location services
React Native Permissions - Runtime permissions
React Native Image Picker - Camera and photo library access
Expo Haptics - Tactile feedback

Additional Features

Google Places Autocomplete - Location search and autocomplete
React Native Date Picker - Date/time selection
React Native WebView - In-app browser functionality

🚀 Getting Started
Prerequisites

Node.js (18 or higher)
npm or yarn
Expo CLI
iOS Simulator (for iOS development)
Android Studio/Emulator (for Android development)

Installation

Clone the repository
bashgit clone <your-repo-url>
cd cornucopia

Install dependencies
bashnpm install

Set up Firebase

Create a Firebase project at Firebase Console
Enable Authentication, Firestore, and Storage
Download configuration files:

GoogleService-Info.plist for iOS (place in ios/Cornucopia/)
google-services.json for Android (place in android/app/)




Start the development server
bashnpm start
# or
npx expo start

Run on device/simulator

Press i for iOS Simulator
Press a for Android Emulator
Scan QR code with Expo Go app for physical device testing



Building for Production
iOS
bashnpm run ios
Android
bashnpm run android
📱 App Structure
app/
├── (auth)/                 # Protected routes
│   ├── home.tsx           # Main dashboard
│   └── _layout.tsx        # Auth layout
├── _layout.tsx            # Root layout with auth logic
└── index.tsx              # Login/signup screen
🔧 Configuration
Environment Setup
The app uses Firebase for backend services. Ensure you have:

Firebase project configured
Authentication providers enabled
Firestore security rules set up
Storage bucket configured

Permissions
The app requests the following permissions:

Location - For finding nearby stores
Camera - For taking photos of receipts/items
Storage - For saving images and data

🧪 Testing
Run the test suite:
bashnpm test
For continuous testing:
bashnpm run test -- --watchAll
📋 Available Scripts

npm start - Start Expo development server
npm run android - Run on Android
npm run ios - Run on iOS
npm run web - Run in web browser
npm test - Run tests
npm run lint - Lint code
npm run reset-project - Reset to blank project

🤝 Contributing

Fork the repository
Create a feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add some amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

📄 License
This project is private and proprietary.
🆘 Support
For support and questions:

Check the Expo Documentation
Review React Native Documentation
Contact the development team

🗺 Roadmap

 AI-powered meal suggestions
 Barcode scanning for inventory
 Social sharing of recipes
 Advanced analytics and insights
 Integration with grocery store APIs
 Voice commands and accessibility improvements


Made with ❤️ using React Native and Expo