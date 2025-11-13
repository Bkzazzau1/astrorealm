// netlify/functions/reading.js
// Serverless function: calls OpenAI Responses API and returns an astrology-style reading.

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('Missing OPENAI_API_KEY env var');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server not configured: OPENAI_API_KEY missing' }),
      };
    }

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

    // Build a clean description of the seeker
    const who =
      name || dob || mother
        ? `Name: ${name || 'N/A'}, DOB: ${dob || 'N/A'}, Mother: ${mother || 'N/A'}`
        : 'No personal data provided.';

    const languageNote = `Language code: ${lang}. If 'ha', 'hau', or 'hausa', mix Hausa and English in a natural way. Otherwise respond fully in simple, calm English.`;
    const religionNote = religion
      ? `The seeker identifies with this religion: ${religion}. Respect it and avoid anything that contradicts common spiritual boundaries. No haram, no shirk, no occult instructions.`
      : 'No religion specified. Keep the tone neutral and respectful.';

    // 🔮 System-style instructions for the reading
    const instructions = `
You are an astrology / spiritual guidance engine for a website called AstroRealm.

RULES:
- Tone: gentle, reflective, non-scary, supportive.
- Never promise money, jackpots, betting wins, or guaranteed success.
- Never give medical, legal, or dangerous advice.
- Never give exact gambling or betting predictions. You may talk about mindset and timing ONLY.
- Length: around 900–1100 words (not short). Use paragraphs.
- Style: astrology, geomancy, palmistry, zodiac, destiny reading — depending on the topic.
- Mention timing in a soft way (e.g. "over the next few weeks", "this season", "this phase").
- Always remind the seeker that this is guidance only, not a fixed fate.

LANGUAGE:
- ${languageNote}

RELIGION / SPIRITUAL BOUNDARIES:
- ${religionNote}

TOPIC MAPPING:
- If topic = "zodiac", treat it as a zodiac / birth-chart style guidance using the details given.
- If topic = "palmistry", imagine the palm lines and describe themes: life line, heart line, fate line.
- If topic = "geomancy", imagine a shield chart and speak like a ramli / geomancy oracle.
- If topic = "destiny" or "weekly", focus on destiny, current phase, and the coming 7–30 days.
- If topic = "love", focus on relationships, heart healing, and communication.
- If topic = "money", focus on stability, caution, halal/ethical income, and discipline.
- If topic = "career", focus on calling, skills, and practical next steps.
- If topic = "astrosport", talk ONLY about mindset, discipline, patience, and emotional control around sports. NO predictions of match results or bets.

REMEMBER:
- This is for an online portal where the seeker completed tasks to "unlock" a reading. Give them something that feels deep and caring, but still responsible.
    `.trim();

    // Build the actual user input for the Responses API
    const inputText = `
AstroRealm reading request:

Topic: ${topic}
Question: ${question}
Seeker info: ${who}
Language: ${lang}
Religion: ${religion || 'not specified'}
Source page: ${source || 'unknown'}

Write the full reading now, respecting all rules. Start directly with the message to the seeker, no bullet lists, no headings, no disclaimers (the site will show a disclaimer separately).
    `.trim();

    // Call OpenAI Responses API via fetch
    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini', // good balance of quality & cost :contentReference[oaicite:0]{index=0}
        instructions,
        input: inputText,
        max_output_tokens: 1200,
      }),
    });

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error('OpenAI error:', openaiRes.status, errorText);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Failed to generate reading' }),
      };
    }

    const data = await openaiRes.json();

    // Safely extract text from Responses API structure
    let readingText = '';

    if (Array.isArray(data.output)) {
      for (const item of data.output) {
        if (Array.isArray(item.content)) {
          for (const part of item.content) {
            if (part.type === 'output_text' && typeof part.text === 'string') {
              readingText += part.text;
            }
          }
        }
      }
    }

    if (!readingText && typeof data.output_text === 'string') {
      readingText = data.output_text;
    }

    if (!readingText) {
      console.error('No text found in Responses payload', data);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Empty reading from model' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        reading: readingText,
        title: `Your ${capitalize(topic)} Reading`,
      }),
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unexpected server error' }),
    };
  }
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
