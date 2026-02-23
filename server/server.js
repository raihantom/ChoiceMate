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
Respond with a JSON array only, no markdown or explanation. Format: [{"name": "Criterion Name",...]`;

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
    const criteria = JSON.parse(jsonMatch ? jsonMatch[0] : '[]');

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

    // Normalize criteria into {name, weight}
    const critList = criteria.map(c => ({
      name: String(c.name ?? '').trim(),
      weight: Number(c.weight ?? 5)
    })).filter(c => c.name.length > 0);

    const systemPrompt = `You are a product research assistant.
For each product, you must return JSON describing how that ONE product performs on each decision criterion.
Always respect the user's importance weights for each criterion (1-10).

Respond ONLY with a JSON object, NO markdown, NO extra text.
Format:
{
  "product": "Product Name",
  "byCriterion": {
    "Criterion name 1": "short description focused on this criterion and its importance",
    "Criterion name 2": "short description",
    ...
  }
}`;

    // Call Groq once per product to ensure we always get details for all products
    const detailResults = [];
    for (const product of products) {
      const userPrompt = `Decision topic: ${topic}
Product: ${product}
Criteria (with importance 1-10):
${critList.map(c => `- ${c.name} (importance: ${c.weight}/10)`).join('\n')}

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
      const jsonMatch = content.match(/\{[\s\S]*\}$/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');

      // Ensure shape { product, byCriterion }
      detailResults.push({
        product: parsed.product || product,
        byCriterion: parsed.byCriterion || {}
      });
    }

    const details = detailResults;
    res.json({ details });
  } catch (err) {
    console.error('product-details error:', err);
    const status = err.status ?? err.statusCode;
    if (status === 401) {
      return res.status(401).json({ error: 'Invalid or missing Groq API key' });
    }
    res.status(500).json({ error: err.message || 'Failed to fetch product details' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
  if (!process.env.GROQ_API_KEY) {
    console.warn('Warning: GROQ_API_KEY not set. AI endpoints will fail.');
  }
});
