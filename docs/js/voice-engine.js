/**
 * SoulChat Voice Engine
 * Natural human-like TTS with ElevenLabs integration + enhanced Web Speech fallback.
 * Speaks sentence-by-sentence with natural pauses, pitch variation, and emotional modulation.
 */

const VoiceEngine = (() => {
    'use strict';

    const synthesis = window.speechSynthesis;
    let currentAudio = null;       // For ElevenLabs audio playback
    let utteranceQueue = [];       // For sentence-by-sentence Web Speech
    let isSpeaking = false;
    let aborted = false;

    // ElevenLabs voice IDs — natural, expressive voices
    const ELEVENLABS_VOICES = {
        kuro: {
            voiceId: 'onwK4e9ZLuTAKqWW03F9',  // Daniel — deep, masculine, intense
            stability: 0.35,
            similarity: 0.80,
            style: 0.45,
            speakerBoost: true
        },
        yuki: {
            voiceId: 'EXAVITQu4vr4xnSDxMaL',  // Bella — energetic, young, expressive
            stability: 0.30,
            similarity: 0.75,
            style: 0.65,
            speakerBoost: true
        },
        aria: {
            voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel — warm, calm, empathetic
            stability: 0.50,
            similarity: 0.85,
            style: 0.35,
            speakerBoost: true
        }
    };

    // Preferred Web Speech voices per character (ranked by naturalness)
    const WEB_VOICE_PREFS = {
        kuro: {
            gender: 'male',
            names: [
                // Premium/Enhanced voices first (macOS/iOS)
                'Aaron', 'Daniel (Enhanced)', 'Daniel', 'James',
                'Alex', 'Tom', 'Oliver', 'Liam',
                // Google voices (Chrome)
                'Google UK English Male',
                // Generic fallback
                'Male'
            ],
            pitch: 0.78,
            rate: 0.88
        },
        yuki: {
            gender: 'female',
            names: [
                'Samantha (Enhanced)', 'Samantha', 'Karen (Enhanced)', 'Karen',
                'Fiona', 'Moira', 'Tessa',
                'Google UK English Female',
                'Female'
            ],
            pitch: 1.25,
            rate: 1.05
        },
        aria: {
            gender: 'female',
            names: [
                'Samantha (Enhanced)', 'Samantha', 'Karen (Enhanced)', 'Karen',
                'Victoria', 'Kate', 'Moira (Enhanced)', 'Moira',
                'Google US English',
                'Female'
            ],
            pitch: 1.05,
            rate: 0.82
        }
    };

    // ===== TEXT PREPROCESSING FOR NATURAL SPEECH =====

    /**
     * Clean text: remove action markers, emojis, special chars
     */
    function cleanText(text) {
        return text
            .replace(/\*[^*]+\*/g, ' ')      // Remove *actions*
            .replace(/[♪~]+/g, '')            // Remove music notes
            .replace(/\.{3,}/g, '...')         // Normalize ellipsis
            .replace(/!{2,}/g, '!')            // Normalize exclamation
            .replace(/\?{2,}/g, '?')           // Normalize questions
            .replace(/\s{2,}/g, ' ')           // Collapse whitespace
            .trim();
    }

    /**
     * Split text into natural sentence chunks for speaking.
     * Groups short fragments together so speech flows naturally.
     */
    function splitIntoSentences(text) {
        // Split on sentence boundaries but keep the delimiters
        const raw = text.split(/(?<=[.!?])\s+|(?<=\.{3})\s*/);
        const sentences = [];
        let buffer = '';

        for (const part of raw) {
            const trimmed = part.trim();
            if (!trimmed) continue;

            buffer += (buffer ? ' ' : '') + trimmed;

            // If buffer is long enough to be a natural phrase, flush it
            if (buffer.length > 20 || /[.!?]$/.test(buffer)) {
                sentences.push(buffer);
                buffer = '';
            }
        }
        if (buffer.trim()) sentences.push(buffer.trim());

        return sentences.length > 0 ? sentences : [text];
    }

    /**
     * Detect emotional tone of a sentence for pitch/rate modulation.
     */
    function detectEmotion(sentence) {
        const s = sentence.toLowerCase();
        if (/[!]/.test(sentence) && /\b(love|amazing|yes|yay|happy|excited|great)\b/.test(s)) return 'excited';
        if (/\?/.test(sentence)) return 'question';
        if (/\b(sorry|sad|hurt|cry|pain|heavy|alone|lonely)\b/.test(s)) return 'soft';
        if (/\b(breathe|calm|slow|gentle|safe|okay|here)\b/.test(s)) return 'calm';
        if (/\b(angry|mad|hate|furious|damn)\b/.test(s)) return 'intense';
        if (/\.{3}|—/.test(sentence)) return 'trailing';
        if (/!/.test(sentence)) return 'emphatic';
        return 'neutral';
    }

    /**
     * Get pitch/rate modifiers based on emotion for natural intonation.
     */
    function getEmotionModifiers(emotion) {
        switch (emotion) {
            case 'excited':  return { pitchMod: 1.08, rateMod: 1.10, pauseAfter: 200 };
            case 'question': return { pitchMod: 1.05, rateMod: 0.95, pauseAfter: 400 };
            case 'soft':     return { pitchMod: 0.94, rateMod: 0.85, pauseAfter: 500 };
            case 'calm':     return { pitchMod: 0.97, rateMod: 0.88, pauseAfter: 450 };
            case 'intense':  return { pitchMod: 0.92, rateMod: 1.05, pauseAfter: 300 };
            case 'trailing': return { pitchMod: 0.95, rateMod: 0.80, pauseAfter: 600 };
            case 'emphatic': return { pitchMod: 1.04, rateMod: 1.02, pauseAfter: 250 };
            default:         return { pitchMod: 1.00, rateMod: 1.00, pauseAfter: 300 };
        }
    }

    // ===== WEB SPEECH API (ENHANCED) =====

    /**
     * Find the best voice for a character from available system voices.
     */
    function findBestVoice(charId) {
        if (!synthesis) return null;
        const voices = synthesis.getVoices();
        if (!voices.length) return null;

        const prefs = WEB_VOICE_PREFS[charId] || WEB_VOICE_PREFS.aria;

        // Try each preferred voice name in order
        for (const name of prefs.names) {
            const v = voices.find(voice =>
                voice.lang.startsWith('en') &&
                voice.name.toLowerCase().includes(name.toLowerCase())
            );
            if (v) return v;
        }

        // Fallback: any English voice
        return voices.find(v => v.lang.startsWith('en')) || voices[0];
    }

    /**
     * Speak text using Web Speech API — sentence-by-sentence with emotion.
     */
    function speakWebSpeech(text, charId, settings, onStart, onEnd) {
        if (!synthesis) { if (onEnd) onEnd(); return; }

        const cleaned = cleanText(text);
        if (!cleaned) { if (onEnd) onEnd(); return; }

        const sentences = splitIntoSentences(cleaned);
        const voice = findBestVoice(charId);
        const prefs = WEB_VOICE_PREFS[charId] || WEB_VOICE_PREFS.aria;
        const userRate = settings.speechRate || 1;

        aborted = false;
        isSpeaking = true;
        let started = false;
        let sentenceIndex = 0;

        function speakNext() {
            if (aborted || sentenceIndex >= sentences.length) {
                isSpeaking = false;
                if (onEnd) onEnd();
                return;
            }

            const sentence = sentences[sentenceIndex];
            const emotion = detectEmotion(sentence);
            const mods = getEmotionModifiers(emotion);

            const utterance = new SpeechSynthesisUtterance(sentence);
            if (voice) utterance.voice = voice;
            utterance.pitch = prefs.pitch * mods.pitchMod;
            utterance.rate = prefs.rate * mods.rateMod * userRate;
            utterance.volume = 1;

            utterance.onstart = () => {
                if (!started) {
                    started = true;
                    if (onStart) onStart();
                }
            };

            utterance.onend = () => {
                sentenceIndex++;
                if (aborted) {
                    isSpeaking = false;
                    if (onEnd) onEnd();
                    return;
                }
                // Natural pause between sentences
                setTimeout(speakNext, mods.pauseAfter);
            };

            utterance.onerror = () => {
                sentenceIndex++;
                if (sentenceIndex >= sentences.length || aborted) {
                    isSpeaking = false;
                    if (onEnd) onEnd();
                } else {
                    setTimeout(speakNext, 200);
                }
            };

            synthesis.speak(utterance);
        }

        speakNext();
    }

    // ===== ELEVENLABS TTS =====

    /**
     * Speak using ElevenLabs API — ultra-realistic human voice.
     * Returns true if successful, false if should fallback.
     */
    async function speakElevenLabs(text, charId, apiKey, settings, onStart, onEnd) {
        const cleaned = cleanText(text);
        if (!cleaned) { if (onEnd) onEnd(); return true; }

        const voiceConfig = ELEVENLABS_VOICES[charId] || ELEVENLABS_VOICES.aria;
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey
                },
                body: JSON.stringify({
                    text: cleaned,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: voiceConfig.stability,
                        similarity_boost: voiceConfig.similarity,
                        style: voiceConfig.style,
                        use_speaker_boost: voiceConfig.speakerBoost
                    }
                })
            });

            if (!response.ok) {
                console.warn('ElevenLabs error:', response.status);
                return false; // Fallback to Web Speech
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            return new Promise((resolve) => {
                const audio = new Audio(audioUrl);
                currentAudio = audio;

                // Apply playback rate from settings
                audio.playbackRate = settings.speechRate || 1;

                audio.onplay = () => {
                    isSpeaking = true;
                    if (onStart) onStart();
                };

                audio.onended = () => {
                    isSpeaking = false;
                    URL.revokeObjectURL(audioUrl);
                    currentAudio = null;
                    if (onEnd) onEnd();
                    resolve(true);
                };

                audio.onerror = () => {
                    isSpeaking = false;
                    URL.revokeObjectURL(audioUrl);
                    currentAudio = null;
                    if (onEnd) onEnd();
                    resolve(false);
                };

                if (aborted) {
                    URL.revokeObjectURL(audioUrl);
                    resolve(true);
                    return;
                }

                audio.play().catch(() => {
                    URL.revokeObjectURL(audioUrl);
                    resolve(false);
                });
            });

        } catch (err) {
            console.warn('ElevenLabs request failed:', err);
            return false;
        }
    }

    // ===== PUBLIC API =====

    return {
        get isSpeaking() { return isSpeaking; },

        /**
         * Speak text with the best available voice engine.
         * @param {string} text - Text to speak
         * @param {string} charId - Character ID (kuro, yuki, aria)
         * @param {object} settings - User settings from localStorage
         * @param {function} onStart - Called when speaking begins
         * @param {function} onEnd - Called when speaking finishes
         */
        async speak(text, charId, settings, onStart, onEnd) {
            this.stop();
            aborted = false;

            const elevenLabsKey = settings.elevenLabsKey;

            // Try ElevenLabs first if key is provided
            if (elevenLabsKey) {
                const success = await speakElevenLabs(text, charId, elevenLabsKey, settings, onStart, onEnd);
                if (success) return;
                // Fall through to Web Speech on failure
            }

            // Enhanced Web Speech fallback
            speakWebSpeech(text, charId, settings, onStart, onEnd);
        },

        /**
         * Stop all speech immediately.
         */
        stop() {
            aborted = true;
            isSpeaking = false;

            // Stop ElevenLabs audio
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
                currentAudio = null;
            }

            // Stop Web Speech
            if (synthesis) {
                synthesis.cancel();
            }
        },

        /**
         * Preload voices (call on app startup).
         */
        init() {
            if (synthesis) {
                synthesis.getVoices();
                synthesis.onvoiceschanged = () => synthesis.getVoices();
            }
        }
    };
})();
