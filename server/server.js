import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

// Ensure we always load the .env that lives next to this file,
// regardless of which directory "node" is executed from.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

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

    const systemPrompt = `You are a decision-making assistant for Indian consumers.
Given a decision topic, suggest 5-6 relevant criteria that are most useful for evaluating options in the Indian market.
Consider factors such as price in Indian Rupees (write "rupees" wherever the rupees symbol would appear), availability across Indian cities, after-sales service in India, Indian warranty norms, value for money as judged by Indian buyers, and any India-specific standards or certifications where relevant.
You must NOT choose importance weights. Just name the criteria.

Respond with a JSON array only, no markdown or explanation.
Format: [{"name": "Criterion Name"}, ...]`;

    const userPrompt = `Decision topic: ${topic}.${productsContext}
Suggest criteria the user should consider when making this decision. Tailor the criteria to an Indian buyer — mention price in rupees (write the word "rupees", not the symbol), Indian availability, service networks, etc. where appropriate.`;

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

    const systemPrompt = `You are a product research assistant specialising in the Indian market.
For each product, return JSON describing how that ONE product performs on each decision criterion.

STRICT RULES — violation means your response is wrong:
1. NEVER use USD, EUR, GBP, or any currency symbol or name other than Indian Rupees.
2. ALWAYS write prices as a number followed by the word "rupees" in Indian numbering style (e.g. "89,999 rupees" or "1,25,000 rupees"). NEVER use the rupees symbol (₹) or the dollar sign ($). No exceptions.
3. ALWAYS refer to Indian retail sources: Amazon.in, Flipkart, Croma, Reliance Digital, CarDekho, CarWale, or authorised Indian dealers.
4. ALWAYS use the Indian variant of the product (e.g. Indian launch price, India-specific model codes).
5. Mention Indian warranty terms (typically 1–3 years in India) and service centre availability across Indian cities.
6. Do NOT mention importance or weights.

Respond ONLY with a JSON object, NO markdown, NO extra text.
Format:
{
  "product": "Product Name",
  "byCriterion": {
    "Criterion name 1": "short description focused on this criterion, prices in rupees",
    "Criterion name 2": "short description, prices in rupees",
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

Describe how this product relates to EACH criterion for an Indian buyer.
IMPORTANT: You MUST write all prices as a number followed by the word "rupees" (e.g. "89,999 rupees"). NEVER use the rupees symbol, dollar sign, USD, or any other currency symbol or name.
Refer to Indian prices from Amazon.in, Flipkart, or authorised Indian dealers.
Return JSON in the required format.`;

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

    const systemPrompt = `You are a decision-scoring assistant for Indian consumers.
Your job is to assign numeric ratings from 1 to 10 for how well ONE product satisfies each decision criterion, judged strictly from an Indian buyer's perspective.

Rules:
- 1 = extremely poor fit for Indian buyers, 10 = outstanding fit for Indian buyers.
- Base scores on: Indian market price in rupees (write the word "rupees", NEVER use any currency symbol or USD), availability on Amazon.in / Flipkart / Indian dealers, after-sales service quality across Indian cities, and value for money in the Indian context.
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

For this ONE product, assign a score from 1–10 for each criterion from an Indian buyer's perspective (consider pricing in rupees, Indian availability, and service quality in India). Return JSON only in the required format.`;

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

/**
 * POST /api/check-affordability
 * Body: { topic: string, products: string[], budget: number }
 * Returns: { affordability: { [productName]: { expensive: boolean, reason: string } } }
 */
app.post('/api/check-affordability', async (req, res) => {
  try {
    const { topic, products = [], budget } = req.body;

    const numericBudget = typeof budget === 'string' ? parseFloat(budget) : budget;
    const validBudget = Number.isFinite(numericBudget) && numericBudget > 0 ? numericBudget : null;

    if (
      !topic ||
      !Array.isArray(products) ||
      products.length === 0 ||
      validBudget == null
    ) {
      return res.status(400).json({
        error: 'topic, products (non-empty array), and a positive numeric budget are required'
      });
    }

    const systemPrompt = `You are a budgeting assistant for Indian consumers.
For ONE product at a time, decide whether the product is LIKELY ABOVE or WITHIN a user's budget.

STRICT RULES:
1. The budget and ALL prices are in Indian Rupees. Write the word "rupees" wherever a currency label is needed. NEVER use any currency symbol (no rupees symbol, no dollar sign) and NEVER reference USD, EUR, or any other currency — not even as a reference.
2. Use your knowledge of current Indian market prices from Amazon.in, Flipkart, Croma, CarDekho, CarWale, or authorised Indian retailers.
3. If you are unsure of the Indian price, lean toward "within_budget".
4. The reason field MUST mention an approximate price range in rupees written as a number followed by the word "rupees" (e.g. "typically priced between 45,000 rupees and 55,000 rupees in India").

Respond ONLY with a JSON object, NO markdown, NO extra text.
Format:
{
  "product": "Product Name",
  "budget": 1234.56,
  "status": "above_budget" | "within_budget",
  "reason": "short explanation with price context in rupees"
}`;

    const affordability = {};

    for (const product of products) {
      const userPrompt = `Decision topic: ${topic}
User budget: ${validBudget} rupees (Indian Rupees — do NOT use any currency symbol or reference USD or any other currency)
Product name: ${product}

Task:
1. Look up the typical Indian market price of "${product}" from Amazon.in, Flipkart, CarWale, or authorised Indian retailers. Express it ONLY as a number followed by the word "rupees" (e.g. "89,999 rupees"). NEVER use any currency symbol.
2. Compare that price in rupees to the user's budget of ${validBudget} rupees.
3. Set status to "above_budget" if the product typically costs MORE than ${validBudget} rupees in India, otherwise "within_budget".
4. If you are not confident about the Indian price in rupees, set status to "within_budget".
5. In the "reason" field write: the approximate price range in rupees in India and why it is above or within the budget.
6. Respond ONLY in the required JSON format. Write "rupees" as a word — NEVER use any currency symbol, USD, EUR, or any other currency name.`;

      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        temperature: 0.3,
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

      const status = String(parsed.status || '').toLowerCase();
      const isAbove = status === 'above_budget' || status === 'expensive';
      const reason =
        typeof parsed.reason === 'string'
          ? parsed.reason
          : isAbove
          ? 'This option appears more expensive than your stated budget.'
          : '';

      affordability[product] = {
        expensive: isAbove,
        reason
      };
    }

    res.json({ affordability });
  } catch (err) {
    console.error('check-affordability error:', err);
    const status = err.status ?? err.statusCode;
    if (status === 401) {
      return res.status(401).json({ error: 'Invalid or missing Groq API key' });
    }
    res.status(500).json({ error: err.message || 'Failed to check affordability' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
  if (!process.env.GROQ_API_KEY) {
    console.warn('Warning: GROQ_API_KEY not set. AI endpoints will fail.');
  }
});
