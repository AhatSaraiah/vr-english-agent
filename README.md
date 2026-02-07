# VR English Teacher (AI-Powered)

Experience an immersive English learning session in Virtual Reality with an AI teacher that listens, speaks, and remembers your conversation. Designed for teachers to manage student sessions, with premium features for detailed feedback tracking.

## 🚀 Features

### 1. Teacher-Centric Workflow
- **Secure Login**: Authentication for Teachers (Email/Password).
- **Student Profiles**: Teachers manage multiple student profiles under one account.
- **Dashboard**: Select a specific Student and Lesson before starting the VR session to track individual progress.

### 2. Immersive VR Environments
- **Dynamic 360° Scenes**: High-resolution backgrounds for "Airport Terminal", "Restaurant", and "Hotel Lobby".
- **Contextual Labels**: Floats helpful vocabulary (e.g., "Reception Desk", "Menu") in 3D space relevant to the current lesson.
- **Interactive UI**: Gaze-based interaction and controller support for VR headsets.

### 3. Multimodal AI Teacher
- **Brain**: Powered by **Google Gemini 2.5 Flash** (Pay-As-You-Go) for instant, context-aware responses.
- **Voice**: Powered by **ElevenLabs Turbo v2** (Paid Tier) for hyper-realistic speech.
- **Memory**: Remembers conversation history (up to 100 turns) to maintain context (e.g., remembering names, travel details).

### 4. Premium Feedback History
- **Automatic Analysis**: After every session, the AI generates constructive feedback on grammar and vocabulary.
- **History View**: Premium teachers see a beautiful, scrollable timeline of past feedback for each student.
- **Access Control**: Basic plan users are restricted from viewing detailed history.

### 5. Robust Engineering (Refactored)
- **Modular Codebase**: Core logic is separated into `tools/gemini.js` (AI) and `tools/tts.js` (Speech) for maintainability.
- **Fallback Systems**:
  - **No Paid Subscription?**: Automatically falls back to **Google TTS (Free)** if ElevenLabs fails.
  - **Rate Limits?**: Handles Gemini rate limits gracefully with natural conversational fillers ("I see, go on...").

## 🛠️ Project Structure

```
vr-agent/
├── public/              # Frontend assets (HTML, CSS, JS, Images)
│   ├── js/app.js        # Main frontend logic (VR, Audio, UI)
│   └── index.html       # VR Scene and Overlay UI
├── tools/               # Backend modules for AI capabilities
│   ├── gemini.js        # Google Gemini integration (Chat & Feedback)
│   └── tts.js           # Text-to-Speech logic (ElevenLabs + Google)
├── server.js            # Express server (Routes, API, MOCK_DB)
└── .env                 # API Keys and Configuration
```

## 📦 Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd vr-agent
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env` file in the root directory:
    ```ini
    PORT=3000
    GEMINI_API_KEY=AIzaSy...
    GEMINI_MODEL=gemini-2.5-flash
    ELEVENLABS_API_KEY=xi...
    ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

    # User Secrets (Add these to GitHub Secrets if deploying)
    TEACHER_EMAIL_PREMIUM=<your_premium_email>
    TEACHER_PASSWORD_PREMIUM=<your_premium_password>
    TEACHER_EMAIL_BASIC=<your_basic_email>
    TEACHER_PASSWORD_BASIC=<your_basic_password>
    TEACHER_EMAIL_INACTIVE=<your_inactive_email>
    TEACHER_PASSWORD_INACTIVE=<your_inactive_password>
    ```

## ▶️ Usage

1.  **Start the Server**:
    ```bash
    npm start
    ```

2.  **Open the App**:
    - Go to [http://localhost:3000](http://localhost:3000).
    - **Premium Login**: `teacher@school.com` / `password123` (Full Access)
    - **Basic Login**: `basic@school.com` / `password123` (Limited Access)

3.  **Run Session**: Select a student and lesson, then click "Start VR Session".

## 🔮 Roadmap

1.  **Database Integration**: Migrate `MOCK_DB` to Supabase/PostgreSQL for persistent data.
2.  **Content Management System**: UI for teachers to create custom lessons and upload 360° images.
3.  **Analytics Dashboard**: Visual charts showing student progress (vocabulary growth, error rates).
4.  **Multi-User Deployment**: Deploy to cloud (Vercel/Render) for global access.

## 📄 License

This project is proprietary and confidential. Unauthorized copying of this file, via any medium is strictly prohibited.
