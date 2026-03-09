/**
 * SoulChat — Main Application
 * Handles screens, chat, voice recognition, and text-to-speech.
 */

(function () {
    'use strict';

    // ===== STATE =====
    let currentCharacter = null;
    let isListening = false;
    let isSpeaking = false;
    let voiceEnabled = true;
    let recognition = null;
    let synthesis = window.speechSynthesis;

    // ===== SETTINGS =====
    function loadSettings() {
        try {
            return JSON.parse(localStorage.getItem('soulchat_settings')) || {};
        } catch { return {}; }
    }
    function saveSettings(s) {
        localStorage.setItem('soulchat_settings', JSON.stringify(s));
    }

    // ===== DOM REFS =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const loadingScreen = $('#loading-screen');
    const selectScreen = $('#select-screen');
    const chatScreen = $('#chat-screen');
    const chatMessages = $('#chat-messages');
    const messageInput = $('#message-input');
    const sendBtn = $('#send-btn');
    const micBtn = $('#mic-btn');
    const backBtn = $('#back-to-select');
    const voiceToggle = $('#voice-toggle');
    const voiceOverlay = $('#voice-overlay');
    const voiceStatus = $('#voice-status');
    const voiceCancel = $('#voice-cancel');
    const speakingIndicator = $('#speaking-indicator');
    const settingsModal = $('#settings-modal');

    // ===== SCREEN MANAGEMENT =====
    function showScreen(screen) {
        $$('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

    // ===== LOADING =====
    setTimeout(() => {
        showScreen(selectScreen);
    }, 1800);

    // ===== CHARACTER SELECTION =====
    $$('.character-card').forEach(card => {
        card.addEventListener('click', () => {
            const charId = card.dataset.character;
            selectCharacter(charId);
        });
    });

    function selectCharacter(charId) {
        const char = AIEngine.getCharacter(charId);
        if (!char) return;

        currentCharacter = charId;
        AIEngine.clearHistory();

        // Set accent color
        const accent = charId === 'kuro' ? 'var(--accent-kuro)' : 'var(--accent-yuki)';
        const accentDim = charId === 'kuro' ? 'var(--accent-kuro-dim)' : 'var(--accent-yuki-dim)';
        document.documentElement.style.setProperty('--current-accent', accent);
        document.documentElement.style.setProperty('--current-accent-dim', accentDim);

        // Update header
        $('#header-name').textContent = char.name;

        // Set avatar
        const avatarEl = $('#header-avatar');
        avatarEl.innerHTML = `<img src="img/${charId}.jpg" alt="${char.name}" onerror="this.remove(); this.parentElement.textContent='${char.name[0]}'">`;

        // Clear chat
        chatMessages.innerHTML = '<div class="chat-start-spacer"></div>';

        // Show chat screen
        showScreen(chatScreen);

        // Send greeting after a short delay
        setTimeout(() => {
            const greeting = AIEngine.getGreeting(charId);
            addMessage(greeting, 'character');
            if (voiceEnabled) speakText(greeting);
        }, 600);
    }

    // ===== BACK BUTTON =====
    backBtn.addEventListener('click', () => {
        stopSpeaking();
        stopListening();
        showScreen(selectScreen);
        currentCharacter = null;
    });

    // ===== SEND MESSAGE =====
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + 'px';
    });

    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || !currentCharacter) return;

        messageInput.value = '';
        messageInput.style.height = 'auto';

        // Add user message
        addMessage(text, 'user');

        // Show typing indicator
        const typingEl = showTypingIndicator();

        // Get AI response
        const settings = loadSettings();
        const response = await AIEngine.getResponse(currentCharacter, text, settings);

        // Remove typing, show response
        typingEl.remove();
        addMessage(response, 'character');

        if (voiceEnabled) {
            speakText(response);
        }
    }

    function addMessage(text, sender) {
        const msg = document.createElement('div');
        msg.className = `message ${sender}`;

        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        msg.innerHTML = `
            <div class="message-bubble">${escapeHTML(text)}</div>
            <div class="message-time">${time}</div>
        `;

        chatMessages.appendChild(msg);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        chatMessages.appendChild(typing);
        scrollToBottom();
        return typing;
    }

    function scrollToBottom() {
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ===== VOICE TOGGLE =====
    voiceToggle.addEventListener('click', () => {
        voiceEnabled = !voiceEnabled;
        voiceToggle.classList.toggle('active', voiceEnabled);
        const iconOn = voiceToggle.querySelector('.icon-voice-on');
        const iconOff = voiceToggle.querySelector('.icon-voice-off');
        iconOn.style.display = voiceEnabled ? '' : 'none';
        iconOff.style.display = voiceEnabled ? 'none' : '';
        if (!voiceEnabled) stopSpeaking();
    });
    // Init state
    voiceToggle.classList.add('active');

    // ===== TEXT-TO-SPEECH =====
    function speakText(text) {
        if (!synthesis || !voiceEnabled) return;

        stopSpeaking();

        // Clean text of action markers like *action*
        const cleanText = text.replace(/\*[^*]+\*/g, '').replace(/[♪~]/g, '').trim();
        if (!cleanText) return;

        const char = AIEngine.getCharacter(currentCharacter);
        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Set voice parameters based on character
        const settings = loadSettings();
        utterance.rate = (settings.speechRate || 1) * (char?.voiceRate || 1);
        utterance.pitch = char?.voicePitch || 1;
        utterance.volume = 1;

        // Try to find a good voice
        const voices = synthesis.getVoices();
        if (voices.length > 0) {
            let voice = null;
            if (currentCharacter === 'kuro') {
                // Prefer male voices
                voice = voices.find(v => /male/i.test(v.name) && v.lang.startsWith('en')) ||
                        voices.find(v => /daniel|james|thomas|alex|fred/i.test(v.name)) ||
                        voices.find(v => v.lang.startsWith('en'));
            } else {
                // Prefer female voices
                voice = voices.find(v => /female/i.test(v.name) && v.lang.startsWith('en')) ||
                        voices.find(v => /samantha|karen|victoria|kate|moira|fiona/i.test(v.name)) ||
                        voices.find(v => v.lang.startsWith('en'));
            }
            if (voice) utterance.voice = voice;
        }

        utterance.onstart = () => {
            isSpeaking = true;
            speakingIndicator.classList.add('active');
            const speakName = $('#speaking-name');
            speakName.textContent = `${char?.name || 'Character'} is speaking...`;
        };
        utterance.onend = () => {
            isSpeaking = false;
            speakingIndicator.classList.remove('active');
        };
        utterance.onerror = () => {
            isSpeaking = false;
            speakingIndicator.classList.remove('active');
        };

        synthesis.speak(utterance);
    }

    function stopSpeaking() {
        if (synthesis) {
            synthesis.cancel();
            isSpeaking = false;
            speakingIndicator.classList.remove('active');
        }
    }

    // Load voices (they load async on some browsers)
    if (synthesis) {
        synthesis.getVoices();
        synthesis.onvoiceschanged = () => synthesis.getVoices();
    }

    // ===== SPEECH RECOGNITION =====
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    micBtn.addEventListener('click', () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    });

    voiceCancel.addEventListener('click', stopListening);

    function startListening() {
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser. Please use Chrome or Safari.');
            return;
        }

        stopSpeaking();

        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('listening');
            voiceOverlay.classList.add('active');
            voiceStatus.textContent = 'Listening...';
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            voiceStatus.textContent = transcript || 'Listening...';

            // If final result, send it
            if (event.results[event.results.length - 1].isFinal) {
                stopListening();
                if (transcript.trim()) {
                    messageInput.value = transcript.trim();
                    sendMessage();
                }
            }
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                voiceStatus.textContent = 'Microphone access denied';
                setTimeout(stopListening, 1500);
            } else {
                stopListening();
            }
        };

        recognition.onend = () => {
            if (isListening) {
                stopListening();
            }
        };

        try {
            recognition.start();
        } catch (e) {
            console.warn('Could not start recognition:', e);
        }
    }

    function stopListening() {
        isListening = false;
        micBtn.classList.remove('listening');
        voiceOverlay.classList.remove('active');
        if (recognition) {
            try { recognition.stop(); } catch {}
            recognition = null;
        }
    }

    // ===== SETTINGS =====
    $('#open-settings').addEventListener('click', () => {
        const settings = loadSettings();
        $('#ai-provider').value = settings.provider || 'builtin';
        $('#api-key').value = settings.apiKey || '';
        $('#api-url').value = settings.apiUrl || '';
        $('#api-model').value = settings.model || '';
        $('#voice-enabled').checked = voiceEnabled;
        $('#speech-rate').value = settings.speechRate || 1;
        $('#speech-rate-value').textContent = (settings.speechRate || 1).toFixed(1) + 'x';
        updateSettingsVisibility();
        settingsModal.classList.add('active');
    });

    $('#close-settings').addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.remove('active');
    });

    $('#ai-provider').addEventListener('change', updateSettingsVisibility);

    function updateSettingsVisibility() {
        const provider = $('#ai-provider').value;
        const apiGroups = $$('.api-key-group');
        const customUrlGroup = $('#custom-url-group');
        const modelGroup = $('#model-group');
        const helpText = $('#api-key-help');

        if (provider === 'builtin') {
            apiGroups.forEach(g => g.style.display = 'none');
        } else {
            apiGroups.forEach(g => g.style.display = '');
            customUrlGroup.style.display = provider === 'custom' ? '' : 'none';

            if (provider === 'groq') {
                helpText.textContent = 'Get a free key at console.groq.com';
                modelGroup.style.display = '';
                $('#api-model').placeholder = 'llama-3.3-70b-versatile';
            } else if (provider === 'openrouter') {
                helpText.textContent = 'Get a free key at openrouter.ai — some models are free!';
                modelGroup.style.display = '';
                $('#api-model').placeholder = 'meta-llama/llama-3.3-70b-instruct:free';
            } else {
                helpText.textContent = 'Enter your API key';
                modelGroup.style.display = '';
                $('#api-model').placeholder = 'model name';
            }
        }
    }

    $('#speech-rate').addEventListener('input', (e) => {
        $('#speech-rate-value').textContent = parseFloat(e.target.value).toFixed(1) + 'x';
    });

    $('#save-settings').addEventListener('click', () => {
        const settings = {
            provider: $('#ai-provider').value,
            apiKey: $('#api-key').value.trim(),
            apiUrl: $('#api-url').value.trim(),
            model: $('#api-model').value.trim(),
            speechRate: parseFloat($('#speech-rate').value)
        };
        voiceEnabled = $('#voice-enabled').checked;
        voiceToggle.classList.toggle('active', voiceEnabled);
        const iconOn = voiceToggle.querySelector('.icon-voice-on');
        const iconOff = voiceToggle.querySelector('.icon-voice-off');
        iconOn.style.display = voiceEnabled ? '' : 'none';
        iconOff.style.display = voiceEnabled ? 'none' : '';

        saveSettings(settings);
        settingsModal.classList.remove('active');
    });

    // ===== SERVICE WORKER =====
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        });
    }

    // ===== PREVENT ZOOM ON INPUT FOCUS (iOS) =====
    document.addEventListener('gesturestart', (e) => e.preventDefault());

})();
