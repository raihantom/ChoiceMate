import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configure OpenAI client to talk to Groq's OpenAI-compatible endpoint
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

/**
 * POST /api/suggest-criteria
 * Body: { topic: string, products?: string[] }
 * Returns: { criteria: { name: string, weight: number }[] }
 */
app.post('/api/suggest-criteria', async (req, res) => {
  try {
    const { topic, products = [] } = req.body;
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'topic is required' });
    }

    const productsContext = products.length > 0
      ? ` The user is considering these options: ${products.join(', ')}.`
      : '';

    const systemPrompt = `You are a decision-making assistant. Given a decision topic, suggest 5-6 relevant criteria for evaluating options.
You must NOT choose importance weights. Just name the criteria.

Respond with a JSON array only, no markdown or explanation.
Format: [{"name": "Criterion Name"}, ...]`;

    const userPrompt = `Decision topic: ${topic}.${productsContext}
Suggest criteria the user should consider when making this decision.`;

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const content = completion.choices[0]?.message?.content || '[]';
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    let rawCriteria = [];
    try {
      rawCriteria = JSON.parse(jsonMatch ? jsonMatch[0] : '[]');
      if (!Array.isArray(rawCriteria)) {
        rawCriteria = [];
      }
    } catch {
      rawCriteria = [];
    }

    // Normalize to the shape expected by the frontend: { name, weight }
    const criteria = rawCriteria
      .map((item) => {
        const name = String(item?.name ?? item ?? '').trim();
        if (!name) return null;
        return { name, weight: 5 };
      })
      .filter(Boolean);

    res.json({ criteria });
  } catch (err) {
    console.error('suggest-criteria error:', err);
    const status = err.status ?? err.statusCode;
    if (status === 401) {
      return res.status(401).json({ error: 'Invalid or missing Groq API key' });
    }
    res.status(500).json({ error: err.message || 'Failed to suggest criteria' });
  }
});

app.post('/api/product-details', async (req, res) => {
  try {
    const { topic, products = [], criteria = [] } = req.body;
    if (
      !topic ||
      !Array.isArray(products) ||
      products.length === 0 ||
      !Array.isArray(criteria) ||
      criteria.length === 0
    ) {
      return res.status(400).json({
        error: 'topic, products (non-empty array), and criteria (non-empty array) are required'
      });
    }

    // Normalize criteria to a simple list of names
    const critNames = criteria
      .map((c) => String(c.name ?? c).trim())
      .filter((name) => name.length > 0);

    const systemPrompt = `You are a product research assistant.
For each product, you must return JSON describing how that ONE product performs on each decision criterion.
Focus only on factual, concise feature descriptions — do NOT mention importance or weights.

Respond ONLY with a JSON object, NO markdown, NO extra text.
Format:
{
  "product": "Product Name",
  "byCriterion": {
    "Criterion name 1": "short description focused on this criterion",
    "Criterion name 2": "short description",
    ...
  }
}`;

    // Helper to normalize the AI's byCriterion object to match our exact criterion names
    function normalizeByCriterion(rawByCriterion, critNames) {
      const result = {};
      const source =
        rawByCriterion && typeof rawByCriterion === 'object' ? rawByCriterion : {};

      const entries = Object.entries(source);
      for (const critName of critNames) {
        const trimmedName = String(critName).trim();

        // Prefer exact key match first
        let value = source[trimmedName];

        // If not found, try a case-insensitive match
        if (value == null) {
          const match = entries.find(
            ([key]) => key.trim().toLowerCase() === trimmedName.toLowerCase()
          );
          if (match) {
            value = match[1];
          }
        }

        result[trimmedName] = typeof value === 'string' ? value : '';
      }

      return result;
    }

    // Call Groq once per product to ensure we always get details for all products
    const detailResults = [];
    for (const product of products) {
      const userPrompt = `Decision topic: ${topic}
Product: ${product}
Criteria:
${critNames.map((name) => `- ${name}`).join('\n')}

Describe how this product relates to EACH criterion, returning JSON in the required format.`;

      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        temperature: 0.5,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      const content = completion.choices[0]?.message?.content || '{}';

      // Try to safely extract a JSON object from the response, even if the model adds extra text
      let parsed = {};
      try {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        const jsonSlice =
          start !== -1 && end !== -1 && end > start ? content.slice(start, end + 1) : content;
        parsed = JSON.parse(jsonSlice);
      } catch {
        parsed = {};
      }

      detailResults.push({
        // Always use the original product name from the client so it matches the UI
        product,
        byCriterion: normalizeByCriterion(parsed.byCriterion, critNames)
      });
    }

    res.json({ details: detailResults });
  } catch (err) {
    console.error('product-details error:', err);
    const status = err.status ?? err.statusCode;
    if (status === 401) {
      return res.status(401).json({ error: 'Invalid or missing Groq API key' });
    }
    res.status(500).json({ error: err.message || 'Failed to fetch product details' });
  }
});

app.post('/api/suggest-scores', async (req, res) => {
  try {
    const { topic, products = [], criteria = [] } = req.body;
    if (
      !topic ||
      !Array.isArray(products) ||
      products.length === 0 ||
      !Array.isArray(criteria) ||
      criteria.length === 0
    ) {
      return res.status(400).json({
        error: 'topic, products (non-empty array), and criteria (non-empty array) are required'
      });
    }

    const critNames = criteria
      .map((c) => String(c.name ?? c).trim())
      .filter((name) => name.length > 0);

    const systemPrompt = `You are a decision-scoring assistant.
Your job is to assign numeric ratings from 1 to 10 for how well ONE product satisfies each decision criterion.

Rules:
- 1 = extremely poor fit, 10 = outstanding fit.
- Use the full scale 1–10 where it makes sense.
- Stay consistent across criteria and products.
- Do not include explanations, only the numbers.

Respond ONLY with a JSON object, NO markdown, NO extra text.
Format:
{
  "product": "Product Name",
  "scores": {
    "Criterion name 1": 1-10 integer,
    "Criterion name 2": 1-10 integer,
    ...
  }
}`;

    const scoresByProduct = {};

    for (const product of products) {
      const userPrompt = `Decision topic: ${topic}
Product: ${product}
Criteria:
${critNames.map((name) => `- ${name}`).join('\n')}

For this ONE product, assign a score from 1–10 for each criterion, following the rules. Return JSON only in the required format.`;

      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      const content = completion.choices[0]?.message?.content || '{}';

      let parsed = {};
      try {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        const jsonSlice =
          start !== -1 && end !== -1 && end > start ? content.slice(start, end + 1) : content;
        parsed = JSON.parse(jsonSlice);
      } catch {
        parsed = {};
      }

      const productName = parsed.product || product;
      const rawScores = parsed.scores || {};
      const normalizedScores = {};

      for (const critName of critNames) {
        const raw = rawScores[critName];
        const num = typeof raw === 'number' ? raw : parseFloat(raw);
        const safe =
          Number.isFinite(num) ? Math.max(1, Math.min(10, Math.round(num))) : 5;
        normalizedScores[critName] = safe;
      }

      scoresByProduct[productName] = normalizedScores;
    }

    res.json({ scores: scoresByProduct });
  } catch (err) {
    console.error('suggest-scores error:', err);
    const status = err.status ?? err.statusCode;
    if (status === 401) {
      return res.status(401).json({ error: 'Invalid or missing Groq API key' });
    }
    res.status(500).json({ error: err.message || 'Failed to suggest scores' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
  if (!process.env.GROQ_API_KEY) {
    console.warn('Warning: GROQ_API_KEY not set. AI endpoints will fail.');
  }
});
