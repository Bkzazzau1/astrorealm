// netlify/functions/tasks.js
// Tracks completed CPA tasks per user session.
// Uses Netlify Blobs as simple key/value storage.

const { getStore } = require('@netlify/blobs');

const REQUIRED_TASKS = Number(process.env.REQUIRED_TASKS || 3);
const CPA_SECRET = process.env.CPA_SECRET || ''; // shared secret with CPA network

exports.handler = async (event) => {
  // Basic CORS headers so we can call from the browser
  const baseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: baseHeaders, body: '' };
  }

  const store = getStore('tasks'); // "tasks" is the blob store name

  // --- READ STATUS (from unlock.html) ---
  if (event.httpMethod === 'GET') {
    const session = event.queryStringParameters.session;
    if (!session) {
      return {
        statusCode: 400,
        headers: baseHeaders,
        body: JSON.stringify({ error: 'session is required' }),
      };
    }

    const data = await store.get(session, { type: 'json' });
    const done = data?.done || 0;

    return {
      statusCode: 200,
      headers: { ...baseHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ done, required: REQUIRED_TASKS }),
    };
  }

  // --- CPA CALLBACK (postback from Viral/CPAlead) ---
  if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
    // Accept either JSON body or query-string params
    let payload = {};
    const ct = event.headers['content-type'] || '';
    if (ct.includes('application/json')) {
      try {
        payload = JSON.parse(event.body || '{}');
      } catch (e) {
        payload = {};
      }
    } else {
      payload = event.queryStringParameters || {};
    }

    const session = payload.session || payload.sid || payload.subid || '';
    const secret = payload.secret || '';

    if (!session) {
      return {
        statusCode: 400,
        headers: baseHeaders,
        body: JSON.stringify({ error: 'session (subid) is required' }),
      };
    }

    if (CPA_SECRET && secret !== CPA_SECRET) {
      // Protect endpoint so random people can’t fake completions
      return {
        statusCode: 403,
        headers: baseHeaders,
        body: JSON.stringify({ error: 'unauthorized' }),
      };
    }

    const existing = (await store.get(session, { type: 'json' })) || { done: 0 };
    const updated = {
      done: existing.done + 1,
      updatedAt: new Date().toISOString(),
    };

    await store.set(session, JSON.stringify(updated));

    return {
      statusCode: 200,
      headers: { ...baseHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, ...updated, required: REQUIRED_TASKS }),
    };
  }

  return {
    statusCode: 405,
    headers: baseHeaders,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
