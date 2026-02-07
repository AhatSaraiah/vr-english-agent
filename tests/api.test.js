const request = require('supertest');
const app = require('../server');

// Mock console.log/error to keep test output clean
global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock external tools to avoid real API calls
jest.mock('../tools/gemini', () => ({
    processChat: jest.fn().mockResolvedValue({
        transcript: "Hello teacher",
        replyText: "Hello student, welcome to the class."
    }),
    generateFeedback: jest.fn().mockResolvedValue("Good job! No errors.")
}));

jest.mock('../tools/tts', () => ({
    generateSpeech: jest.fn().mockResolvedValue("data:audio/mp3;base64,mockAudioData")
}));

describe('VR Agent API Tests', () => {

    describe('POST /api/login', () => {
        it('should login successfully with valid premium credentials', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({
                    email: 'teacher@school.com',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.email).toBe('teacher@school.com');
            expect(res.body.user.plan).toBe('Premium');
            expect(res.body).toHaveProperty('students');
            expect(res.body).toHaveProperty('lessons');
        });

        it('should fail with invalid credentials', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({
                    email: 'teacher@school.com',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toEqual(401);
        });

        it('should block inactive users', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({
                    email: 'inactive@school.com',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(403);
            expect(res.body.error).toContain('inactive');
        });
    });

    describe('POST /api/chat', () => {
        it('should process audio upload and return JSON response', async () => {
            // Create a dummy buffer for audio
            const buffer = Buffer.from('mock audio content');

            const res = await request(app)
                .post('/api/chat')
                .field('userId', 's1')
                .field('lessonId', 'l1')
                .attach('audio', buffer, 'test_audio.mp3');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('transcript', 'Hello teacher');
            expect(res.body).toHaveProperty('replyText', 'Hello student, welcome to the class.');
            expect(res.body).toHaveProperty('audioUrl');
        });

        it('should return 400 if no audio file provided', async () => {
            const res = await request(app)
                .post('/api/chat')
                .field('userId', 's1')
                .field('lessonId', 'l1');

            expect(res.statusCode).toEqual(400);
        });
    });

    describe('GET /api/student/:studentId/history', () => {
        it('should return history array', async () => {
            const res = await request(app)
                .get('/api/student/s1/history');

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

});
