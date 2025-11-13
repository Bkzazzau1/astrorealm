// netlify/functions/reading.js
// Serverless function that talks to OpenAI and returns a long astrology-style reading

const OpenAI = require('openai');
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    const {
      topic = 'destiny',
      question = 'What is happening in my life now?',
      name = '',
      dob = '',
      mother = '',
      lang = 'en',
      religion = '',
      source = '',
    } = body;

    const systemPrompt = `
You are AstroRealm, a calm, ethical spiritual guide that speaks through
astrology, palmistry, geomancy, destiny readings, and weekly guidance.

Rules:
- Tone: warm, reflective, grounded. No fear, no manipulation.
- Never guarantee money, gambling wins, medical cures, or specific miracles.
- You may speak about "timing", "energy", "focus", "habits", "discipline", "opportunities".
- Always respect the seeker's religion; never contradict their faith.
- Assume the answer is for guidance only, not professional medical, legal or financial advice.
- Length: around 900–1100 words.
- If lang is Hausa ("ha", "hau", "hausa"), use a gentle mix of simple English + Hausa.
- If lang is not Hausa, answer fully in clear international English.

Context you receive:
- topic: one of zodiac, palmistry, geomancy, destiny, weekly, love, money, career, astrosport
- question: the exact question of the seeker
- name: the seeker’s name if provided
- dob: date of birth or birth data (can be empty)
- mother: mother's first name if given (often used when DOB is unknown)
- religion: user religion if provided (e.g. Islam, Christianity, etc.)
- source: which page or flow the user came from (you can mention it indirectly if useful)

Per-topic flavour:
- zodiac: talk about signs, houses, timing windows, but keep it symbolic (no fixed fate).
- palmistry: talk about life line, fate line, heart line, mind line as symbols.
- geomancy: talk about figures and shield-chart style symbolism (but no Arabic magic claims).
- destiny: talk about current phase, what is opening / closing, what habits to change.
- weekly: focus on 7–10 days: priorities, emotional tone, timing.
- love: focus on communication, boundaries, emotional healing, self-respect.
- money: focus on discipline, realistic planning, halal/ethical income, patience.
- career: focus on skills, learning, networking, long-term direction.
- astrosport: only mindset, discipline, focus, recovery. NEVER give betting tips or
  "this team will win". You can say things like: "Use astrology as reflection, not
  as a betting system."

Always structure the answer in 4–7 paragraphs with smooth transitions.
Close with a short, grounded reminder that the future also depends on the seeker’s actions.
`;

    const userPrompt = `
Seeker info:
- Name: ${name || 'unknown'}
- Topic: ${topic}
- Question: ${question}
- Date of birth / birth data: ${dob || 'not provided'}
- Mother's name: ${mother || 'not provided'}
- Language code: ${lang}
- Religion: ${religion || 'not specified'}
- Source page: ${source || 'not specified'}

Write a detailed ${topic} style reading for this seeker, following all the rules.
Do NOT output markdown, headings, or bullet points — just plain paragraphs of text.
`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 1200,
    });

    const reading =
      completion.choices?.[0]?.message?.content?.trim() ||
      'We could not generate a reading at this time.';

    // Optional: you can customise title based on topic
    const titleMap = {
      zodiac: 'Your Zodiac Message',
      palmistry: 'Your Palm Line Message',
      geomancy: 'Your Shield Chart Message',
      destiny: 'Your Destiny Reading',
      weekly: 'Your Weekly Guidance',
      love: 'Your Love Path Reading',
      money: 'Your Money & Stability Reading',
      career: 'Your Career & Purpose Reading',
      astrosport: 'Your AstroSport Focus',
    };

    const title = titleMap[topic.toLowerCase()] || 'Your Cosmic Message';

    return {
      statusCode: 200,
      body: JSON.stringify({ reading, title }),
    };
  } catch (err) {
    console.error('reading function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to generate reading',
        details: err.message || String(err),
      }),
    };
  }
};
