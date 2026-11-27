// Deterministic test configuration.
// The server reads teacher accounts from the environment, so the suite defines
// them here instead of depending on a local .env or repository secrets.
process.env.PORT = process.env.PORT || '3000';
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

process.env.TEACHER_EMAIL_PREMIUM = 'teacher@school.com';
process.env.TEACHER_PASSWORD_PREMIUM = 'password123';
process.env.TEACHER_EMAIL_BASIC = 'basic@school.com';
process.env.TEACHER_PASSWORD_BASIC = 'password123';
process.env.TEACHER_EMAIL_INACTIVE = 'inactive@school.com';
process.env.TEACHER_PASSWORD_INACTIVE = 'password123';

// Placeholders so modules that check for keys do not warn during tests.
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini-key';
process.env.ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'test-elevenlabs-key';
process.env.ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'test-voice-id';
