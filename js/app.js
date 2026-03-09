/**
 * SoulChat — Main Application
 * Handles screens, chat, voice recognition, text-to-speech, and call mode.
 */

(function () {
    'use strict';

    // ===== STATE =====
    let currentCharacter = null;
    let currentMode = 'chat'; // 'chat' or 'call'
    let isListening = false;
    let isSpeaking = false;
    let voiceEnabled = true;
    let recognition = null;
    let synthesis = window.speechSynthesis;

    // Call state
    let callActive = false;
    let callTimerInterval = null;
    let callStartTime = null;
    let callAutoListen = true;
    let callMuted = false;

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
    const callScreen = $('#call-screen');
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

    // ===== ACCENT COLORS =====
    function setAccentColor(charId) {
        const accents = {
            kuro: ['var(--accent-kuro)', 'var(--accent-kuro-dim)'],
            yuki: ['var(--accent-yuki)', 'var(--accent-yuki-dim)'],
            aria: ['var(--accent-aria)', 'var(--accent-aria-dim)']
        };
        const [accent, accentDim] = accents[charId] || accents.kuro;
        document.documentElement.style.setProperty('--current-accent', accent);
        document.documentElement.style.setProperty('--current-accent-dim', accentDim);
    }

    // ===== CHARACTER SELECTION =====
    $$('.character-card').forEach(card => {
        card.addEventListener('click', () => {
            const charId = card.dataset.character;
            const char = AIEngine.getCharacter(charId);
            if (!char) return;

            currentCharacter = charId;
            AIEngine.clearHistory();
            setAccentColor(charId);

            // Aria defaults to call mode, others to chat
            if (char.defaultMode === 'call') {
                startCall(charId);
            } else {
                startChat(charId);
            }
        });
    });

    // ===== START CHAT MODE =====
    function startChat(charId) {
        const char = AIEngine.getCharacter(charId);
        currentMode = 'chat';

        // Update header
        $('#header-name').textContent = char.name;
        const avatarEl = $('#header-avatar');
        avatarEl.innerHTML = `<img src="img/${charId}.jpg" alt="${char.name}" onerror="this.remove(); this.parentElement.textContent='${char.name[0]}'">`;

        // Clear chat
        chatMessages.innerHTML = '<div class="chat-start-spacer"></div>';

        showScreen(chatScreen);

        // Greeting
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

    // ===== SWITCH TO CALL FROM CHAT =====
    $('#switch-to-call').addEventListener('click', () => {
        if (currentCharacter) {
            stopSpeaking();
            stopListening();
            startCall(currentCharacter);
        }
    });

    // ===== SEND MESSAGE (CHAT MODE) =====
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + 'px';
    });

    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || !currentCharacter) return;

        messageInput.value = '';
        messageInput.style.height = 'auto';

        addMessage(text, 'user');
        const typingEl = showTypingIndicator();

        const settings = loadSettings();
        const response = await AIEngine.getResponse(currentCharacter, text, settings);

        typingEl.remove();
        addMessage(response, 'character');

        if (voiceEnabled) speakText(response);
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
    voiceToggle.classList.add('active');

    // ===== TEXT-TO-SPEECH =====
    function speakText(text, onEnd) {
        if (!synthesis) { if (onEnd) onEnd(); return; }

        stopSpeaking();

        const cleanText = text.replace(/\*[^*]+\*/g, '').replace(/[♪~]/g, '').trim();
        if (!cleanText) { if (onEnd) onEnd(); return; }

        const char = AIEngine.getCharacter(currentCharacter);
        const utterance = new SpeechSynthesisUtterance(cleanText);

        const settings = loadSettings();
        utterance.rate = (settings.speechRate || 1) * (char?.voiceRate || 1);
        utterance.pitch = char?.voicePitch || 1;
        utterance.volume = 1;

        // Voice selection
        const voices = synthesis.getVoices();
        if (voices.length > 0) {
            let voice = null;
            if (currentCharacter === 'kuro') {
                voice = voices.find(v => /male/i.test(v.name) && v.lang.startsWith('en')) ||
                        voices.find(v => /daniel|james|thomas|alex|fred/i.test(v.name)) ||
                        voices.find(v => v.lang.startsWith('en'));
            } else {
                voice = voices.find(v => /female/i.test(v.name) && v.lang.startsWith('en')) ||
                        voices.find(v => /samantha|karen|victoria|kate|moira|fiona/i.test(v.name)) ||
                        voices.find(v => v.lang.startsWith('en'));
            }
            if (voice) utterance.voice = voice;
        }

        utterance.onstart = () => {
            isSpeaking = true;
            if (currentMode === 'chat') {
                speakingIndicator.classList.add('active');
                $('#speaking-name').textContent = `${char?.name || 'Character'} is speaking...`;
            } else {
                // Call mode: show speaking state
                const callActivity = $('#call-activity');
                const callViz = $('#call-visualizer');
                callActivity.textContent = `${char?.name} is speaking...`;
                callActivity.className = 'call-activity speaking';
                callViz.classList.add('active');
            }
        };

        const handleEnd = () => {
            isSpeaking = false;
            if (currentMode === 'chat') {
                speakingIndicator.classList.remove('active');
            } else {
                $('#call-visualizer').classList.remove('active');
                $('#call-activity').className = 'call-activity';
            }
            if (onEnd) onEnd();
        };

        utterance.onend = handleEnd;
        utterance.onerror = handleEnd;

        synthesis.speak(utterance);
    }

    function stopSpeaking() {
        if (synthesis) {
            synthesis.cancel();
            isSpeaking = false;
            speakingIndicator.classList.remove('active');
            if ($('#call-visualizer')) $('#call-visualizer').classList.remove('active');
        }
    }

    // Load voices
    if (synthesis) {
        synthesis.getVoices();
        synthesis.onvoiceschanged = () => synthesis.getVoices();
    }

    // ===== SPEECH RECOGNITION =====
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    micBtn.addEventListener('click', () => {
        if (isListening) stopListening();
        else startListening();
    });

    voiceCancel.addEventListener('click', stopListening);

    function startListening(onResult, onCancel) {
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser. Please use Chrome or Safari.');
            if (onCancel) onCancel();
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
            if (currentMode === 'chat') {
                micBtn.classList.add('listening');
                voiceOverlay.classList.add('active');
                voiceStatus.textContent = 'Listening...';
            } else {
                // Call mode
                const callActivity = $('#call-activity');
                const callViz = $('#call-visualizer');
                callActivity.textContent = 'Listening...';
                callActivity.className = 'call-activity listening';
                callViz.classList.add('active');
            }
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }

            if (currentMode === 'chat') {
                voiceStatus.textContent = transcript || 'Listening...';
            } else {
                $('#call-transcript').textContent = transcript || '';
            }

            if (event.results[event.results.length - 1].isFinal) {
                stopListening();
                if (transcript.trim()) {
                    if (onResult) {
                        onResult(transcript.trim());
                    } else {
                        messageInput.value = transcript.trim();
                        sendMessage();
                    }
                } else {
                    if (onCancel) onCancel();
                }
            }
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                if (currentMode === 'chat') {
                    voiceStatus.textContent = 'Microphone access denied';
                } else {
                    $('#call-activity').textContent = 'Mic access denied';
                }
                setTimeout(() => { stopListening(); if (onCancel) onCancel(); }, 1500);
            } else {
                stopListening();
                if (onCancel) onCancel();
            }
        };

        recognition.onend = () => {
            if (isListening) {
                stopListening();
                // If no result came through, treat as cancel
                if (onCancel) onCancel();
            }
        };

        try {
            recognition.start();
        } catch (e) {
            console.warn('Could not start recognition:', e);
            if (onCancel) onCancel();
        }
    }

    function stopListening() {
        isListening = false;
        micBtn.classList.remove('listening');
        voiceOverlay.classList.remove('active');
        if (currentMode === 'call') {
            $('#call-visualizer').classList.remove('active');
        }
        if (recognition) {
            try { recognition.stop(); } catch {}
            recognition = null;
        }
    }

    // ==========================================================
    //  CALL MODE
    // ==========================================================

    function startCall(charId) {
        const char = AIEngine.getCharacter(charId);
        if (!char) return;

        currentMode = 'call';
        callActive = true;
        callMuted = false;

        // Set avatars
        const avatarHTML = `<img src="img/${charId}.jpg" alt="${char.name}" onerror="this.remove(); this.parentElement.textContent='${char.name[0]}'">`;
        $('#call-avatar-inner').innerHTML = avatarHTML;
        $('#call-avatar-small').innerHTML = avatarHTML;
        $('#call-name').textContent = char.name;
        $('#call-active-name').textContent = char.name;
        $('#call-timer').textContent = '00:00';
        $('#call-transcript').textContent = '';
        $('#call-activity').textContent = 'Connected';
        $('#call-activity').className = 'call-activity';

        // Show connecting state
        $('#call-connecting').style.display = '';
        $('#call-active').style.display = 'none';
        $('#call-status-text').textContent = 'Calling...';

        // Reset mute/speaker buttons
        $('#call-mute').classList.remove('active');
        $('#call-speaker').classList.add('active');

        showScreen(callScreen);

        // Simulate connection delay
        setTimeout(() => {
            if (!callActive) return;
            $('#call-status-text').textContent = 'Connected';

            setTimeout(() => {
                if (!callActive) return;
                // Switch to active state
                $('#call-connecting').style.display = 'none';
                $('#call-active').style.display = '';

                // Start timer
                callStartTime = Date.now();
                callTimerInterval = setInterval(updateCallTimer, 1000);

                // Character greets
                const greeting = AIEngine.getGreeting(charId);
                speakText(greeting, () => {
                    // After greeting ends, auto-listen
                    if (callActive && callAutoListen && !callMuted) {
                        callListenCycle();
                    }
                });
            }, 500);
        }, 2000);
    }

    function updateCallTimer() {
        if (!callStartTime) return;
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        const timerEl = $('#call-timer');
        if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }

    function endCall() {
        callActive = false;
        callAutoListen = true;
        stopSpeaking();
        stopListening();

        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }
        callStartTime = null;

        showScreen(selectScreen);
        currentCharacter = null;
        currentMode = 'chat';
    }

    // Auto-listen cycle: listen → send to AI → speak response → listen again
    function callListenCycle() {
        if (!callActive || callMuted) {
            // If muted, show waiting state
            if (callActive) {
                $('#call-activity').textContent = 'Muted — tap mic to unmute';
                $('#call-activity').className = 'call-activity';
            }
            return;
        }

        // Small pause before listening (feels natural)
        setTimeout(() => {
            if (!callActive || callMuted) return;

            startListening(
                // onResult
                async (transcript) => {
                    if (!callActive) return;

                    $('#call-transcript').textContent = `"${transcript}"`;
                    $('#call-activity').textContent = 'Thinking...';
                    $('#call-activity').className = 'call-activity';
                    $('#call-visualizer').classList.remove('active');

                    // Get AI response
                    const settings = loadSettings();
                    const response = await AIEngine.getResponse(currentCharacter, transcript, settings);

                    if (!callActive) return;

                    // Speak response, then listen again
                    speakText(response, () => {
                        if (callActive && callAutoListen && !callMuted) {
                            callListenCycle();
                        }
                    });
                },
                // onCancel — no speech detected, try again
                () => {
                    if (callActive && callAutoListen && !callMuted) {
                        $('#call-activity').textContent = 'Connected';
                        $('#call-activity').className = 'call-activity';
                        callListenCycle();
                    }
                }
            );
        }, 800);
    }

    // Call controls
    $('#call-end').addEventListener('click', endCall);

    $('#call-mute').addEventListener('click', () => {
        callMuted = !callMuted;
        $('#call-mute').classList.toggle('active', !callMuted);

        if (callMuted) {
            stopListening();
            $('#call-activity').textContent = 'Muted — tap mic to unmute';
            $('#call-activity').className = 'call-activity';
            $('#call-mute span').textContent = 'Unmute';
        } else {
            $('#call-mute span').textContent = 'Mic';
            if (callActive && !isSpeaking) {
                callListenCycle();
            }
        }
    });

    $('#call-speaker').addEventListener('click', () => {
        const btn = $('#call-speaker');
        btn.classList.toggle('active');
        // Toggle voice output
        voiceEnabled = btn.classList.contains('active');
    });

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
