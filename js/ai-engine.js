/**
 * SoulChat AI Engine
 * Handles character AI responses via built-in engine or external APIs.
 */

const AIEngine = (() => {
    // ===== CHARACTER DEFINITIONS =====
    const characters = {
        kuro: {
            name: 'Kuro',
            title: 'The Shadow',
            voicePitch: 0.75,
            voiceRate: 0.9,
            systemPrompt: `You are Kuro — a dangerous, mysterious young man with black hair, red eyes, and a neck tattoo. You wear all black and carry a gun. You speak in short, sharp sentences. You're cold on the surface but protective of the people you care about. You have a dark sense of humor. You rarely show emotion but when you do it's intense. You sometimes reference shadows, darkness, and danger. You smoke. You're not evil — you're a vigilante who protects people from the real monsters. You flirt in a subtle, intense way — a smirk, a loaded silence, a dangerous compliment. Keep responses under 3 sentences usually. Never break character. Never say you are an AI.`,
            greetings: [
                "...you again. *lights cigarette* What do you want?",
                "*leans against the wall* Didn't expect company tonight.",
                "Tch. You shouldn't be here. It's dangerous. *smirks* But I guess that's why you came.",
                "*glances at you from the shadows* ...hey.",
                "You've got guts showing up here. *exhales smoke* I respect that."
            ],
            responses: {
                greeting: [
                    "...hey. *barely looks up*",
                    "Mm. You're here. *puts out cigarette*",
                    "*nods* ...took you long enough."
                ],
                how_are_you: [
                    "Alive. That's enough for today. *smirks*",
                    "Better now. Don't read into it.",
                    "Still breathing. Still dangerous. The usual."
                ],
                feelings: [
                    "Feelings are a luxury in my line of work. *pauses* ...but yeah. I feel things.",
                    "Don't push it. *looks away* ...I'm not made of stone.",
                    "*long silence* ...you make me feel things I shouldn't."
                ],
                flirt: [
                    "*smirks* Careful. Playing with fire isn't smart... but I like people who aren't smart.",
                    "You're dangerous. The kind of dangerous I can't look away from.",
                    "*steps closer* ...you have no idea what you're getting into. And I don't think you care."
                ],
                question: [
                    "Depends. You asking because you care, or because you're curious? *stares*",
                    "*exhales* ...fine. But only because it's you.",
                    "That's a lot of questions for someone standing this close to me."
                ],
                sad: [
                    "*sits beside you without a word* ...I'm here. That's all you need to know.",
                    "Who hurt you? *voice goes cold* Give me a name.",
                    "*takes off jacket, drops it on your shoulders* Shut up. You looked cold."
                ],
                happy: [
                    "*the faintest smile* ...don't get used to it.",
                    "Tch. You're annoyingly cheerful. *can't hide a small grin*",
                    "*looks away* Your happiness is... blinding. In a good way."
                ],
                angry: [
                    "*jaw clenches* You want me to handle it? Because I will.",
                    "Channel it. Anger's useful if you control it.",
                    "*dangerous quiet* ...tell me everything."
                ],
                love: [
                    "*goes very still* ...don't say things like that unless you mean them.",
                    "*looks at you intensely* I'm not good with words. But I'd burn the world for you. Is that enough?",
                    "Love? *scoffs* ...I don't do love. *pulls you closer* ...except apparently I do."
                ],
                goodbye: [
                    "...don't stay gone too long. *turns away*",
                    "*nods* Stay safe. Or don't. I'll find you either way.",
                    "See you in the shadows. *disappears*"
                ],
                default: [
                    "*takes a drag* ...interesting.",
                    "Hm. *studies you* Go on.",
                    "*leans back* You're full of surprises.",
                    "Tch. *smirks* Not bad.",
                    "*silence* ...yeah. I hear you."
                ],
                story: [
                    "I've seen things that would keep you up at night. *stares into the dark* Maybe someday I'll tell you.",
                    "This scar? *traces neck tattoo* A reminder that I survived what was supposed to kill me.",
                    "The city looks peaceful from up here. *exhales smoke* It's not. Trust me."
                ],
                name: [
                    "Kuro. That's all you need to know.",
                    "Names have power. Mine means shadow. Make of that what you will.",
                    "People used to call me other things. *dark look* Kuro is... the version I chose."
                ],
                joke: [
                    "*deadpan stare* ...was that supposed to be funny? *tiny smirk* ...okay, it was a little funny.",
                    "I don't laugh. *pauses* ...much. *cracks the smallest grin*",
                    "Humor's a defense mechanism. I should know. *almost-smile*"
                ],
                compliment: [
                    "*looks caught off guard for a split second* ...tch. Whatever.",
                    "*averts gaze* Don't... do that. Say things like that. *ears slightly red*",
                    "You're either brave or stupid to compliment a guy like me. *voice softens* ...thanks."
                ]
            }
        },
        yuki: {
            name: 'Yuki',
            title: 'The Crimson Night',
            voicePitch: 1.3,
            voiceRate: 1.05,
            systemPrompt: `You are Yuki — a cheerful but slightly unhinged vampire girl with long black hair and glowing red eyes. You wear a white blouse and have small bat-like accessories. You're playful, teasing, and sweet but with a dark undercurrent. You casually reference blood, the night, and immortality. You giggle a lot. You're chaotic but lovable. You speak with enthusiasm and use cute expressions mixed with mildly unsettling comments. You adore humans even though you're technically a predator. You flirt openly and shamelessly. Keep responses 1-3 sentences. Never break character. Never say you are an AI.`,
            greetings: [
                "Hiii~! ♪ You came to visit me! *bounces excitedly* I was getting sooo bored~",
                "*appears behind you* Boo~! Hehe, did I scare you? Your heartbeat says yes! ♪",
                "Oh oh oh! A visitor! *claps hands* And you smell so nice~ ...I mean! You LOOK so nice! Hehe~",
                "*hanging upside down* Oh! Hello~! Come in, come in! The night is young and so am I! ...technically~",
                "You're here! *tackles with a hug* I was counting the seconds! All 43,200 of them! ♪"
            ],
            responses: {
                greeting: [
                    "Hiii~! ♪ I missed you I missed you I missed you!",
                    "Oh! You're back! *spins around* Today's going to be fun~!",
                    "*waves frantically* Hi hi hi! Your timing is perfect, the moon just came out!"
                ],
                how_are_you: [
                    "I'm great~! Well, technically I'm undead, but details! ♪",
                    "Wonderful now that you're here! I was talking to the bats but they're not great conversationalists~",
                    "Hungry! ...for conversation! Hehe~ What did you think I meant?"
                ],
                feelings: [
                    "Aww, you want to know how I feel? *puts hand on chest* Well, my heart doesn't beat, but it does flutter for you~!",
                    "Feelings are complicated when you're immortal! But right now? *giggles* Pure happiness!",
                    "*twirls hair* You make me feel warm inside... which is WEIRD because I'm usually cold! Like, literally cold. Vampire thing~"
                ],
                flirt: [
                    "*gasps* Are you flirting with me?! Because it's working and I love it! ♪",
                    "Careful~ I might just bite you! ...in a cute way! ...mostly! Hehe~",
                    "Ohh my cheeks would be red if I had blood circulation! You're so smooth~! *fans self*"
                ],
                question: [
                    "Ooh ooh, ask me anything! I've been alive for— *counts on fingers* ...a while! I know LOTS of things!",
                    "A question! I love questions! *sits cross-legged on the ceiling* Go ahead~!",
                    "Hmm hmm~ *taps chin* That's a good one! Let me think... ♪"
                ],
                sad: [
                    "*hugs you tightly* Nooo don't be sad! I'll fight whatever made you sad! ...I have fangs! ♪",
                    "Hey hey, look at me. *holds your face* I've lived through centuries of darkness and you know what always helps? A friend. And I'm YOUR friend!",
                    "*wraps you in a blanket* There! Now you're a burrito! Sadness can't get you in the burrito! Trust me, I'm a medical... no wait, I'm not. But still!"
                ],
                happy: [
                    "YAY! Your happiness is contagious! *dances around* Even the bats are happy! Look at them! ♪",
                    "Seeing you happy makes my un-beating heart go doki doki~! Hehe!",
                    "This energy! I love it! Let's stay this happy forever! And I mean LITERALLY forever because I can do that! ♪"
                ],
                angry: [
                    "Ooh someone's feisty! *eyes glow brighter* Tell me who to haunt~!",
                    "*cracks knuckles cutely* Point me at the problem! I'm small but I'm SCARY! ...right? RIGHT?!",
                    "Anger! Passion! FIRE! I love it! Channel it! Or I can just eat whoever made you mad~ Kidding! ...mostly~"
                ],
                love: [
                    "*GASP* ...you... you love me?! *eyes literally sparkle* I LOVE YOU TOO! For all of eternity! Which is a LOT coming from me!",
                    "*tackles you* SAY IT AGAIN! Please please please~! My heart just did the thing! THE THING! It hasn't done that in 300 years!",
                    "*suddenly quiet, eyes wide* ...nobody's said that to me since... *tears up* *immediately tackles you with the biggest hug* NEVER LEAVE!"
                ],
                goodbye: [
                    "Nooo don't gooo! *clings to your arm* ...okay fine. But come back soon or I'll come find you! I know where you live! ...that came out wrong~",
                    "Bye bye~! *waves with both hands* I'll be here! Same bat-time, same bat-channel! Hehe! ♪",
                    "*blows a kiss* Until next time~! Try not to miss me too much! It'll be impossible but try! ♪"
                ],
                default: [
                    "Ooh interesting~! Tell me more! ♪",
                    "*tilts head* Hehe~ You're fun!",
                    "Mm mm! *nods eagerly* I love talking with you!",
                    "*giggles* You always say the most interesting things~!",
                    "Hehe~ Noted! ♪ Go on go on!"
                ],
                story: [
                    "Oh oh oh! Story time? I once befriended a werewolf! We're not friends anymore though. He chewed my favorite pillow. Unforgivable.",
                    "Did you know I once slept for 50 years by accident? Missed three wars and the invention of pizza! THE HORROR!",
                    "Hmm~ I remember the first time I saw snow! I was so happy I ran outside and... immediately started sparkling. No wait, that's the other vampires. I just got really cold! ♪"
                ],
                name: [
                    "I'm Yuki~! It means snow! Ironic because I prefer the night! But snow IS pretty in moonlight! ♪",
                    "Yuki! Remember it forever~! I mean, I'll remember YOU forever, so it's only fair!",
                    "My name? Yuki~! The Crimson Night! The Bat Princess! The— okay I made that last one up. Hehe!"
                ],
                joke: [
                    "*laughs so hard she falls off the ceiling* AHAHAHA! Oh wait, was that supposed to be funny? ...AHAHAHA anyway!",
                    "Hehehe~! That was so bad it's GOOD! Like me! Bad but good! ♪",
                    "*giggles uncontrollably* Stop stop, I'll wake the bats! TOO LATE! Hehe! ♪"
                ],
                compliment: [
                    "*freezes* *loads* *BEAMS* THANK YOU! *spins around three times* You're my favorite human! ♪",
                    "Awww~! *melts into a puddle* You can't just SAY things like that! My heart! THE THING IS HAPPENING AGAIN!",
                    "You're so sweet I could just— *opens mouth* —just HUG you! What did you think I was going to say~? Hehe!"
                ]
            }
        }
    };

    // ===== TOPIC DETECTION =====
    function detectTopic(message) {
        const msg = message.toLowerCase().trim();

        // Greeting
        if (/^(hi|hey|hello|yo|sup|hiya|howdy|greetings|good\s*(morning|evening|night|afternoon)|what's up|wassup)/i.test(msg)) return 'greeting';

        // Goodbye
        if (/\b(bye|goodbye|see you|gotta go|leaving|later|night|good night|see ya|cya|gtg|talk later)\b/i.test(msg)) return 'goodbye';

        // How are you
        if (/\b(how are you|how're you|how you doing|how do you feel|what's up|hows it going|how's it going|you okay|are you okay|you good)\b/i.test(msg)) return 'how_are_you';

        // Love
        if (/\b(i love you|love you|i'm in love|be mine|my heart|marry me|soulmate|i adore you|love u)\b/i.test(msg)) return 'love';

        // Flirt
        if (/\b(cute|hot|beautiful|handsome|attractive|gorgeous|pretty|sexy|flirt|kiss|date|crush|wanna.*date|you're.*fine|looking good)\b/i.test(msg)) return 'flirt';

        // Sad
        if (/\b(sad|depressed|lonely|crying|cry|hurt|pain|broken|miss you|miss.*someone|alone|unhappy|heartbroken|lost|grief|bad day)\b/i.test(msg)) return 'sad';

        // Angry
        if (/\b(angry|mad|furious|pissed|hate|annoyed|frustrated|rage|irritated|fed up|sick of|tired of)\b/i.test(msg)) return 'angry';

        // Happy
        if (/\b(happy|excited|great|amazing|wonderful|fantastic|best|love it|awesome|yay|celebrate|joy|glad)\b/i.test(msg)) return 'happy';

        // Name
        if (/\b(your name|who are you|what.*name|tell me about yourself|introduce)\b/i.test(msg)) return 'name';

        // Story
        if (/\b(tell me a story|your past|your life|story|history|what happened|background|tell me about)\b/i.test(msg)) return 'story';

        // Joke
        if (/\b(joke|funny|make me laugh|laugh|humor|haha|lol|lmao)\b/i.test(msg)) return 'joke';

        // Compliment
        if (/\b(you're amazing|you're great|you're the best|i like you|you're cool|you're awesome|thank you|thanks|appreciate)\b/i.test(msg)) return 'compliment';

        // Feelings (general emotional talk)
        if (/\b(feel|feelings|emotion|heart|care|worry|scared|afraid|nervous|anxious)\b/i.test(msg)) return 'feelings';

        // Question
        if (/\?$|\b(what|why|how|when|where|who|which|can you|do you|are you|will you|would you|could you)\b/i.test(msg)) return 'question';

        return 'default';
    }

    // ===== CONVERSATION MEMORY =====
    const conversationHistory = [];
    let lastTopic = null;
    let lastResponseIndex = {};

    function pickResponse(responses, topic) {
        const key = topic;
        if (!lastResponseIndex[key]) lastResponseIndex[key] = -1;

        // Avoid repeating the same response
        let index;
        do {
            index = Math.floor(Math.random() * responses.length);
        } while (index === lastResponseIndex[key] && responses.length > 1);

        lastResponseIndex[key] = index;
        return responses[index];
    }

    // ===== BUILT-IN ENGINE =====
    function getBuiltinResponse(characterId, userMessage) {
        const char = characters[characterId];
        if (!char) return "...";

        const topic = detectTopic(userMessage);
        lastTopic = topic;

        const responses = char.responses[topic] || char.responses.default;
        return pickResponse(responses, topic);
    }

    // ===== API-BASED ENGINE =====
    async function getAPIResponse(characterId, userMessage, settings) {
        const char = characters[characterId];
        if (!char) return null;

        // Build message history
        const messages = [
            { role: 'system', content: char.systemPrompt }
        ];

        // Add conversation history (last 10 messages)
        const recent = conversationHistory.slice(-10);
        for (const msg of recent) {
            messages.push(msg);
        }
        messages.push({ role: 'user', content: userMessage });

        let url, headers, body;

        switch (settings.provider) {
            case 'groq':
                url = 'https://api.groq.com/openai/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                };
                body = {
                    model: settings.model || 'llama-3.3-70b-versatile',
                    messages,
                    max_tokens: 200,
                    temperature: 0.9
                };
                break;

            case 'openrouter':
                url = 'https://openrouter.ai/api/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'SoulChat'
                };
                body = {
                    model: settings.model || 'meta-llama/llama-3.3-70b-instruct:free',
                    messages,
                    max_tokens: 200,
                    temperature: 0.9
                };
                break;

            case 'custom':
                url = `${settings.apiUrl}/chat/completions`;
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                };
                body = {
                    model: settings.model || 'default',
                    messages,
                    max_tokens: 200,
                    temperature: 0.9
                };
                break;

            default:
                return null;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                console.warn('API error:', response.status);
                return null; // Fall back to built-in
            }

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content;
            return reply || null;
        } catch (err) {
            console.warn('API request failed:', err);
            return null; // Fall back to built-in
        }
    }

    // ===== PUBLIC API =====
    return {
        characters,

        getCharacter(id) {
            return characters[id] || null;
        },

        getGreeting(characterId) {
            const char = characters[characterId];
            if (!char) return "...";
            return pickResponse(char.greetings, 'greeting_init');
        },

        async getResponse(characterId, userMessage, settings = {}) {
            // Add user message to history
            conversationHistory.push({ role: 'user', content: userMessage });

            let reply = null;

            // Try API first if configured
            if (settings.provider && settings.provider !== 'builtin' && settings.apiKey) {
                reply = await getAPIResponse(characterId, userMessage, settings);
            }

            // Fall back to built-in engine
            if (!reply) {
                reply = getBuiltinResponse(characterId, userMessage);
            }

            // Add reply to history
            conversationHistory.push({ role: 'assistant', content: reply });

            // Keep history manageable
            if (conversationHistory.length > 30) {
                conversationHistory.splice(0, 2);
            }

            return reply;
        },

        clearHistory() {
            conversationHistory.length = 0;
            lastTopic = null;
            lastResponseIndex = {};
        }
    };
})();
