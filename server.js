require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Local Tools
const geminiTool = require('./tools/gemini');
const ttsTool = require('./tools/tts');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = process.env.PORT || 3000;

// Serve static files from 'public' directory
app.use(express.static('public'));
app.use(express.json());

// Prevent 404 logs for favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// --- MOCK DATABASE (In-Memory for Starter) ---
// In a real app, replace this with Supabase Client queries
const MOCK_DB = {
    // Teachers (Paying Customers/Clients)
    users: [
        {
            id: 't1',
            email: process.env.TEACHER_EMAIL_PREMIUM,
            password: process.env.TEACHER_PASSWORD_PREMIUM,
            name: 'Sara Teacher',
            plan: 'Premium'
        },
        {
            id: 't2',
            email: process.env.TEACHER_EMAIL_INACTIVE,
            password: process.env.TEACHER_PASSWORD_INACTIVE,
            name: 'Inactive Teacher',
            plan: 'Basic',
            status: 'inactive'
        },
        {
            id: 't3',
            email: process.env.TEACHER_EMAIL_BASIC,
            password: process.env.TEACHER_PASSWORD_BASIC,
            name: 'Bob Basic',
            plan: 'Basic'
        }
    ],
    // Students (Profiles under a Teacher)
    students: [
        { id: 's1', name: 'Student A', teacherId: 't1', level: 'Beginner' },
        { id: 's2', name: 'Student B', teacherId: 't1', level: 'Intermediate' },
        { id: 's3', name: 'Student C', teacherId: 't1', level: 'Advanced' },
        { id: 's4', name: 'Basic Student', teacherId: 't3', level: 'Beginner' }
    ],
    lessons: [
        {
            id: 'l1',
            teacher_id: 't1', // Content ownership (optional)
            title: 'At the Airport',
            skybox_url: '/img/officer_hd_composite.png',
            system_prompt: 'You are an immigration officer at an airport. Ask the student for their passport and purpose of visit. Start with "Next please!".',
            initial_message: 'Next please! May I see your passport?',
            labels: [
                { text: "Gates 1-20 ->", pos: "5 3 1", rot: "0 -90 0", scale: "2.5 2.5 2.5" },
                { text: "<- Baggage Claim", pos: "-5 3 1", rot: "0 90 0", scale: "2.5 2.5 2.5" },
                { text: "Security Check", pos: "0 4 6", rot: "0 180 0", scale: "4 4 4" }
            ]
        },
        {
            id: 'l2',
            teacher_id: 't1',
            title: 'Coffee Shop / Restaurant',
            skybox_url: 'img/restaurant.png',
            system_prompt: 'You are a waiter at a cozy restaurant. Welcome the customer and ask for their order. Be polite and helpful.',
            initial_message: 'Welcome! Here is your menu. What can I get for you today?',
            labels: [
                { text: "Menu", pos: "-2 1.5 -1", rot: "0 45 0", scale: "1.5 1.5 1.5" },
                { text: "Pastries", pos: "2 2 -3", rot: "0 -30 0", scale: "2 2 2" },
                { text: "Order Here", pos: "0 2.5 -3", rot: "0 0 0", scale: "2 2 2" }
            ]
        },
        {
            id: 'l3',
            teacher_id: 't1',
            title: 'Hotel Check-in',
            skybox_url: 'img/hotel.png',
            skybox_rotation: '0 -90 0', // Rotates background to face the desk
            system_prompt: 'You are a receptionist at a luxury hotel. Welcome the guest and ask for their reservation details.',
            initial_message: 'Good afternoon! Welcome to the Grand Hotel. Do you have a reservation?',
            labels: [
                { text: "Reception Desk", pos: "0 2.2 -3", rot: "0 0 0", scale: "2 2 2" },
                { text: "Elevators ->", pos: "4 2 0", rot: "0 -90 0", scale: "2 2 2" },
                { text: "Lounge", pos: "-4 2 0", rot: "0 90 0", scale: "2 2 2" }
            ]
        }
    ],
    sessions: [],
    active_conversations: {}
};

// --- API ENDPOINTS ---

// 1. Teacher Login -> Returns Teacher + Students + Lessons
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt:', req.body);

    // Find Teacher (User)
    const user = MOCK_DB.users.find(u => u.email === email && u.password === password);

    if (!user) {
        return res.status(401).json({ error: 'Invalid Email or Password' });
    }

    if (user.status === 'inactive') {
        return res.status(403).json({ error: 'Account is inactive' });
    }

    // Get Students for this Teacher
    const myStudents = MOCK_DB.students.filter(s => s.teacherId === user.id);

    // Get Available Lessons (Global or Teacher specific)
    const lessons = MOCK_DB.lessons;

    res.json({
        user: { id: user.id, name: user.name, plan: user.plan, email: user.email },
        students: myStudents,
        lessons: lessons
    });
});

// Friendly error for GET requests to /api/chat
app.get('/api/chat', (req, res) => {
    res.status(405).send('This endpoint expects a POST request with audio data. usage: POST /api/chat');
});

// 2. Chat Processing (Modified: Gemini 2.5 Flash Multimodal + MEMORY)
app.post('/api/chat', upload.single('audio'), async (req, res) => {

    // --- In-Memory Conversation History logic ---
    // Key: "userId_lessonId", Value: Array of { role: 'user'|'teacher', text: string }
    const sessionHistory = MOCK_DB.active_conversations || {};

    try {
        const { lessonId, userId } = req.body;
        const sessionKey = `${userId}_${lessonId}`;

        // Initialize history if new
        if (!sessionHistory[sessionKey]) {
            sessionHistory[sessionKey] = [];
            MOCK_DB.active_conversations = sessionHistory; // persist ref
        }

        const history = sessionHistory[sessionKey];
        // Format last 100 turns for context (Gemini has large context window)
        const recentHistoryText = history.slice(-100).map(turn => `${turn.role === 'user' ? 'Student' : 'Teacher'}: ${turn.text}`).join('\n');

        const lesson = MOCK_DB.lessons.find(l => l.id === lessonId);
        const systemPrompt = lesson ? lesson.system_prompt : 'You are a helpful English teacher.';

        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        // 1. Process Chat with Gemini
        const mimeType = req.file.mimetype;
        const audioBase64 = req.file.buffer.toString('base64');
        const { transcript, replyText } = await geminiTool.processChat(
            systemPrompt,
            recentHistoryText,
            mimeType,
            audioBase64
        );

        // Update History
        history.push({ role: 'user', text: transcript });
        history.push({ role: 'teacher', text: replyText });

        // 2. Generate Speech
        const audioUrl = await ttsTool.generateSpeech(replyText);

        res.json({
            transcript: transcript || "(Audio processed directly)",
            replyText: replyText,
            audioUrl: audioUrl
        });

    } catch (error) {
        console.error('Error processing chat:', error);
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const stack = error.stack;
        fs.appendFileSync('server_error.log', `[${new Date().toISOString()}] ${errorMsg}\n${stack}\n\n`);
        res.status(500).json({ error: 'Internal server error processing your request.' });
    }
});

// 3. End Session (Analytics)
app.post('/api/session/end', async (req, res) => {
    const { userId, lessonId, transcript } = req.body;

    // Generate AI Feedback
    const feedback = await geminiTool.generateFeedback(transcript);

    const session = {
        id: 'sess_' + Date.now(),
        userId,
        lessonId,
        transcript,
        feedback,
        created_at: new Date()
    };
    MOCK_DB.sessions.push(session);

    console.log('Session Saved:', session);
    res.json({ success: true, feedback });
});

// 4. Get Student History
app.get('/api/student/:studentId/history', (req, res) => {
    const { studentId } = req.params;
    // Filter sessions for this student
    const history = MOCK_DB.sessions
        .filter(s => s.userId === studentId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Newest first

    // Enrich with Lesson Title if needed (though lessonId is there)
    const enrichedHistory = history.map(s => {
        const lesson = MOCK_DB.lessons.find(l => l.id === s.lessonId);
        return { ...s, lessonTitle: lesson ? lesson.title : 'Unknown Lesson' };
    });

    res.json(enrichedHistory);
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`VR English Teacher Server running at http://localhost:${port}`);
    });
}

module.exports = app;
