// Custom A-Frame Component to make entities face the camera (Billboard)
AFRAME.registerComponent('billboard', {
    tick: function () {
        const camera = this.el.sceneEl.camera;
        if (!camera) return;
        this.el.object3D.lookAt(camera.el.object3D.position);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('VR English Teacher App Initialized');

    // UI Elements
    const loginOverlay = document.getElementById('login-overlay');
    const dashboardOverlay = document.getElementById('dashboard-overlay');
    const feedbackOverlay = document.getElementById('feedback-overlay');

    // Login Details
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');

    // Dashboard Details
    const welcomeMsg = document.getElementById('welcome-msg');
    const studentSelect = document.getElementById('student-select');
    const lessonSelect = document.getElementById('lesson-select');
    const startSessionBtn = document.getElementById('start-session-btn');

    // Feedback
    const aiFeedbackDiv = document.getElementById('ai-feedback');

    // VR Elements
    const teacherText = document.querySelector('#teacher-text');
    const teacherEntity = document.querySelector('#teacher');
    const skybox = document.querySelector('#skybox');
    const endSessionBtn = document.querySelector('#end-session-btn');
    const recordingIndicator = document.querySelector('#recording-indicator');

    // State
    let currentTeacher = null;
    let currentStudent = null; // Selected student for the session
    let currentLesson = null;
    let sessionTranscript = []; // Store {role, text}

    // Audio
    let audioContext;
    let analyser;
    let dataArray;
    let isPlaying = false;
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    // --- 1. TEACHER LOGIN ---
    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Login Failed');
            }

            const data = await res.json();
            currentTeacher = data.user;
            const students = data.students;
            const lessons = data.lessons;

            console.log('Logged in as Teacher:', currentTeacher.name);

            // Populate Dashboard
            welcomeMsg.textContent = `Welcome, ${currentTeacher.name}`;

            // Clear & Fill Student Select
            studentSelect.innerHTML = '<option value="">-- Choose Student --</option>';
            students.forEach(s => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(s); // Store full object
                opt.textContent = `${s.name} (${s.level || 'General'})`;
                studentSelect.appendChild(opt);
            });

            // Clear & Fill Lesson Select
            lessonSelect.innerHTML = '<option value="">-- Choose Lesson --</option>';
            lessons.forEach(l => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(l); // Store full object
                opt.textContent = l.title;
                lessonSelect.appendChild(opt);
            });

            // Switch to Dashboard
            loginOverlay.style.display = 'none';
            dashboardOverlay.style.display = 'flex';

        } catch (err) {
            console.error(err);
            loginError.innerText = err.message;
            loginError.style.display = 'block';
        }
    });

    // --- HISTORY / FEEDBACK LOGIC ---
    const viewFeedbackBtn = document.getElementById('view-feedback-btn');
    const historyOverlay = document.getElementById('history-overlay');
    const historyList = document.getElementById('history-list');
    const closeHistoryBtn = document.getElementById('close-history-btn');

    viewFeedbackBtn.addEventListener('click', async () => {
        // 1. Premium Check
        if (currentTeacher.plan !== 'Premium') {
            alert("🔒 Premium Feature\n\nPlease upgrade your plan to view detailed Student Feedback History.");
            return;
        }

        const studentVal = studentSelect.value;
        if (!studentVal) {
            alert("Please select a student first.");
            return;
        }
        const student = JSON.parse(studentVal);

        // Show Loading
        historyList.innerHTML = '<p style="text-align:center">Loading history...</p>';
        dashboardOverlay.style.display = 'none';
        historyOverlay.style.display = 'flex';

        try {
            const res = await fetch(`/api/student/${student.id}/history`);
            if (!res.ok) throw new Error("Failed to fetch history");
            const sessions = await res.json();

            historyList.innerHTML = '';
            if (sessions.length === 0) {
                historyList.innerHTML = '<p style="text-align:center; color:#aaa">No saved sessions yet.</p>';
            } else {
                sessions.forEach(sess => {
                    const dateStr = new Date(sess.created_at).toLocaleString();
                    const card = document.createElement('div');
                    card.style.cssText = "background: #444; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 5px solid #4CC3D9; box-shadow: 0 4px 6px rgba(0,0,0,0.3);";

                    const formattedFeedback = formatFeedback(sess.feedback);

                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #666; padding-bottom:10px; margin-bottom:15px;">
                            <h3 style="margin:0; color:#4CC3D9">${sess.lessonTitle || 'Lesson'}</h3>
                            <span style="font-size:0.85em; color:#aaa; font-style:italic;">${dateStr}</span>
                        </div>
                        <div style="font-size: 1em; line-height: 1.6; color: #eee;">
                            ${formattedFeedback}
                        </div>
                    `;
                    historyList.appendChild(card);
                });
            }

        } catch (e) {
            console.error(e);
            historyList.innerHTML = '<p style="color:red; text-align:center">Error loading history.</p>';
        }
    });

    // Helper to pretify markdown feedback
    function formatFeedback(text) {
        if (!text) return '<span style="color:#888">No feedback recorded.</span>';

        let html = text
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #FFC65D;">$1</strong>')
            // Bullet points (handle newlines)
            .replace(/\* /g, '• ')
            // Line breaks
            .replace(/\n/g, '<br>');

        return html;
    }

    closeHistoryBtn.addEventListener('click', () => {
        historyOverlay.style.display = 'none';
        dashboardOverlay.style.display = 'flex';
    });

    // --- 2. DASHBOARD: START SESSION ---
    startSessionBtn.addEventListener('click', () => {
        const studentVal = studentSelect.value;
        const lessonVal = lessonSelect.value;

        if (!studentVal || !lessonVal) {
            alert("Please select both a student and a lesson.");
            return;
        }

        currentStudent = JSON.parse(studentVal);
        currentLesson = JSON.parse(lessonVal);

        console.log('Starting Session for:', currentStudent.name);
        console.log('Lesson:', currentLesson.title);

        // Load Lesson Environment
        skybox.setAttribute('src', currentLesson.skybox_url);
        if (currentLesson.skybox_rotation) {
            skybox.setAttribute('rotation', currentLesson.skybox_rotation);
        } else {
            skybox.setAttribute('rotation', '0 0 0'); // Reset default
        }
        teacherText.setAttribute('value', currentLesson.initial_message || "Hello!");

        // Dynamic Environment Labels
        const labelsContainer = document.getElementById('environment-labels');
        labelsContainer.innerHTML = ''; // Clear previous
        if (currentLesson.labels) {
            currentLesson.labels.forEach((lbl) => {
                const textEl = document.createElement('a-text');
                textEl.setAttribute('value', lbl.text);
                textEl.setAttribute('position', lbl.pos);
                textEl.setAttribute('rotation', lbl.rot);
                textEl.setAttribute('scale', lbl.scale);
                textEl.setAttribute('align', 'center');
                textEl.setAttribute('color', '#FFF');
                // Standard blackboard style for visibility
                textEl.setAttribute('geometry', 'primitive: plane; height: 0.5; width: ' + (lbl.text.length * 0.3));
                textEl.setAttribute('material', 'color: #000; opacity: 0.5');
                labelsContainer.appendChild(textEl);
            });
        }

        // Add initial system message to transcript
        sessionTranscript.push({ role: 'teacher', text: currentLesson.initial_message });

        // Hide Dashboard, Show VR
        dashboardOverlay.style.display = 'none';
        teacherEntity.setAttribute('visible', 'true');
        endSessionBtn.setAttribute('visible', 'true');

        // Init Audio
        initAudio();
    });

    // --- END SESSION LOGIC ---
    // --- END SESSION LOGIC ---
    function handleEndSession() {
        console.log('End Session Button Triggered!');
        // Simple click sound
        const audio = new Audio('https://cdn.aframe.io/360-image-gallery-boilerplate/audio/click.mp3');
        audio.play().catch(e => console.log('Audio play failed', e));
        endSession();
    }

    if (endSessionBtn) {
        endSessionBtn.addEventListener('click', handleEndSession);
        // Sometimes click is hard to trigger in VR, mousedown can feel more responsive
        endSessionBtn.addEventListener('mousedown', handleEndSession);
    } else {
        console.error('End Session Button not found in DOM');
    }
    // Removed direct listener to allow wrapper logic above

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') endSession();
    });

    async function endSession() {
        if (!currentStudent || feedbackOverlay.style.display === 'flex') return;

        console.log('Ending Session...');
        // Exit VR to show overlay
        const scene = document.querySelector('a-scene');
        if (scene.is('vr-mode')) scene.exitVR();

        feedbackOverlay.style.display = 'flex';
        aiFeedbackDiv.innerHTML = 'Analyzing your session...';

        try {
            // NOTE: We send "userId" as the Student ID because we want the session 
            // and history to be attributed to the student.
            const res = await fetch('/api/session/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentStudent.id,
                    lessonId: currentLesson.id,
                    transcript: sessionTranscript
                })
            });
            const data = await res.json();

            // Format Feedback
            aiFeedbackDiv.innerHTML = `
                <h3>Excellent work, ${currentStudent.name}!</h3>
                <p><strong>Lesson:</strong> ${currentLesson.title}</p>
                <div style="margin-top: 15px; color: #ddd;">
                    ${data.feedback ? data.feedback.replace(/\n/g, '<br>') : 'No feedback generated.'}
                </div>
            `;
        } catch (err) {
            aiFeedbackDiv.innerText = "Error saving session.";
            console.error(err);
        }
    }

    // --- AUDIO & CHAT LOGIC ---
    async function initAudio() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks = [];
                sendAudioToBackend(audioBlob);
            };
            return true;
        } catch (err) {
            console.error('Mic Error:', err);
            teacherText.setAttribute('value', 'Mic Access Denied');
        }
    }

    async function sendAudioToBackend(blob) {
        teacherText.setAttribute('value', 'Thinking...');

        const formData = new FormData();
        formData.append('audio', blob, 'input.webm');
        formData.append('lessonId', currentLesson.id);
        // Attributing chat to Student ID
        formData.append('userId', currentStudent.id);

        try {
            const response = await fetch('/api/chat', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('API Error');

            const data = await response.json();

            // Update Transcript
            sessionTranscript.push({ role: 'user', text: data.transcript });
            sessionTranscript.push({ role: 'teacher', text: data.replyText });

            teacherText.setAttribute('value', data.replyText);
            playResponseAudio(data.audioUrl, data.replyText);

        } catch (error) {
            console.error(error);
            teacherText.setAttribute('value', 'Connection Error');
        }
    }

    function playResponseAudio(audioUrl, textFallback) {
        if (!audioUrl) {
            console.log("No audio URL provided, assuming TTS failure. Using Browser Fallback.");
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(textFallback);
                const voices = window.speechSynthesis.getVoices();
                const maleVoice = voices.find(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Google US English'));
                if (maleVoice) utterance.voice = maleVoice;

                utterance.onstart = () => { isPlaying = true; animateMouthFallback(); };
                utterance.onend = () => { isPlaying = false; };

                window.speechSynthesis.speak(utterance);
                return;
            }
        }

        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        }

        const audio = new Audio(audioUrl);
        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        audio.play();
        isPlaying = true;
        animateMouth();

        audio.onended = () => { isPlaying = false; };
    }

    function animateMouthFallback() {
        if (!isPlaying) return;
        requestAnimationFrame(animateMouthFallback);
        // Simple animation
    }

    function animateMouth() {
        if (!isPlaying) return;
        requestAnimationFrame(animateMouth);
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const scaleFactor = 1 + (avg / 255) * 0.2;
        teacherEntity.object3D.scale.set(1, scaleFactor, 1);
    }

    // --- CONTROLLERS ---
    const controllers = [document.querySelector('#leftHand'), document.querySelector('#rightHand')];
    controllers.forEach(c => {
        if (!c) return;
        c.addEventListener('triggerdown', () => {
            if (mediaRecorder && mediaRecorder.state === 'inactive') {
                audioChunks = [];
                mediaRecorder.start();
                isRecording = true;
                teacherText.setAttribute('value', 'Listening...');
                recordingIndicator.setAttribute('material', 'visible: true');
            }
        });
        c.addEventListener('triggerup', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                isRecording = false;
                recordingIndicator.setAttribute('material', 'visible: false');
            }
        });
    });

    // Spacebar Fallback
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        if (e.code === 'Space') {
            if (!mediaRecorder) {
                console.warn('Space pressed but mediaRecorder not ready.');
                teacherText.setAttribute('value', 'Mic not ready. Click screen?');
                initAudio();
                return;
            }

            if (mediaRecorder.state === 'inactive') {
                audioChunks = [];
                mediaRecorder.start();
                isRecording = true;
                teacherText.setAttribute('value', 'Listening...');
                recordingIndicator.setAttribute('material', 'visible: true');
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        if (e.code === 'Space' && mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            isRecording = false;
            recordingIndicator.setAttribute('material', 'visible: false');
        }
    });
});
