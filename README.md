## ChoiceMate

ChoiceMate is a small decision-support web app that helps you compare multiple options using a weighted scoring model, with optional AI assistance to suggest criteria, describe products against those criteria, and pre-fill scores.

### Understanding of the problem

- **Core problem**: People often have several options (e.g. laptops, courses, job offers) and many criteria (price, performance, reliability etc.), but lacks a clear, structured way to decide what they want.
- **Goal of the app**: Provide a simple, transparent flow where a user:
  1. Specify on What Product or situation they want a decision for.
  2. Lists options (products).
  3. Defines and weights decision criteria.
  4. Scores each option.
  5. Sees a ranked list with an understandable explanation of "Why" each option scored the way it did.
- **Role of AI**: The AI is used to provide a assistance to the user by:-
  - Suggesting criteria for a given topic.
  - Generating brief feature-level descriptions for each product × criterion.
  - Suggesting score values per criterion to speed up the scoring step.

### Assumptions made

- **User & context**
  - Single User Environment - Single user interaction within one browser on a single device and does not handle            multi-user  or shared sessions.
  - An active internet connection is assumed for AI calls or external API data retrieval.
  - English-language UI and prompts are acceptable.
  - The user is comfortable with AI-generated suggestions being advisory.
  - It is assumed that users enter meaningful options/products and review generated data before final decision processing.
  - Product data retrieved via AI or APIs may not always be perfectly accurate; final validation is expected from the user.
- **Data & persistence**
  - Short-term persistence is enough; `localStorage` is used instead of a database.
  - The number of products and criteria is small to moderate (a handful to a few dozen), so performance bottlenecks from the scoring matrix or AI calls are unlikely.
  - Each criterion is assumed to be independent, meaning one criterion does not mathematically affect another.
- **AI / backend**
  - A valid Groq API key is available via `server/.env` (`GROQ_API_KEY=...`).
  - The Groq OpenAI-compatible endpoint and models remain compatible with the `chat.completions` usage in `server/server.js`.

### Why the solution is structured this way

- **Four-step linear flow**
  - `products` → `criteria` → `weights` → `results` is the natural way the human mind works through decision problems: list options, identify what matters, score them, and finally choose.
  - Each of the four steps is its own separate Angular "standalone component" in its own file in the `src/app/pages/` directory.
- **Thin Angular frontend, thin Node/Express backend**
  - Angular is in charge of routing, page layout, form state, storing the decision state in localStorage, and displaying the results.
  - Node/Express (`server/server.js`) is in charge of all the AI calls to Groq, response normalization, and errors.
  - This keeps the API keys out of the frontend and the Groq complexities out of the frontend.
- **LocalStorage as the glue**
  - We use localStorage to hold the intermediate state (topic, products, criteria, scores, AI product details).
  - This way, the user can refresh the page or come back to the application at any point without losing their progress, without the need to maintain a database on the backend.

### Design decisions and trade-offs

- **Frontend technology (Angular 20 standalone components)**
  - **Decision**: The frontend has been developed using Angular 20, which enables the use of standalone components along with the modern control flow syntax, such as @if, @for, to develop more modular, maintainable, and cleaner templates without the need to use NgModules.
  - **Trade-off**: Tight coupling to Angular 20; older Angular versions or other frameworks would need a rewrite.

- **State persistence with `localStorage`**
  - **Decision**: Store decision data (`decisionTopic`, `decisionProducts`, `decisionCriteria`, `decisionScores`, `decisionProductDetails`) in `localStorage`.
  - **Pros**: Simple, no backend DB or auth, instant restore after refresh.
  - **Cons**: Single-device only, no sharing between users/browsers, and limited data size.

- **Weighted scoring model**
  - **Decision**: Criteria weights and scores are both in the 1–10 range, and the overall score is \( \sum (\text{weight} \times \text{score}) \).
  - **Pros**: Easy to explain and reason about; supported directly in the `results` page logic.
  - **Cons**: No normalization of weights, so absolute weight magnitudes matter; more advanced models (e.g. AHP, TOPSIS) are not implemented.

- **AI integration via Groq**
  - **Decision**: Use Groq’s OpenAI-compatible endpoint from the backend, calling the model *once per product* for details and scores.
  - **Pros**: Keeps API key on the server, isolates all LLM behavior in a single file, and makes it easier to swap models or providers later.
  - **Cons**: Multiple calls (one per product) can be slower and costlier than a single batched call; however, it improves reliability of per-product JSON.

- **Robust JSON parsing and normalization**
  - **Decision**: Treat the model as “unreliable JSON” and defensively extract the JSON slice, then normalize shapes:
    - Criteria: always `{ name: string; weight: number }` with a default weight.
    - Product details: always `{ product: string; byCriterion: Record<string, string> }` with keys aligned to the user’s criterion names.
    - Scores: always numbers in `[1, 10]`, coercing non-numeric values safely.
  - **Trade-off**: Slightly more code in `server/server.js`, but much more resilient to minor model formatting changes and keeps the UI simple.

- **UI / UX design**
  - **Decision**: Keep The UI simple and focus-friendly.Use a dark navy background with card-like `.page-container` for each step.
  - **Pros**: Consistent, focus-friendly layout across all pages; the background gradient makes the app feel more like a product than a demo.
  - **Cons**: Less suitable for print/export; relies on modern browsers for gradient rendering.

### Edge cases considered

- **Missing or invalid input**
  - API endpoints validate required fields:
    - `/api/suggest-criteria` requires a non-empty `topic`.
    - `/api/product-details` requires `topic`, a non-empty `products` array, and a non-empty `criteria` array.
    - `/api/suggest-scores` requires the same.
  - Angular pages validate forms and show user-facing error messages when:
    - No products or criteria are defined before hitting AI.
    - Criteria names are empty or weights fall outside 1–10.

- **LLM response formatting**
  - Criteria responses: safely extract a JSON array from the AI output and normalize to `{ name, weight: 5 }`.
  - Product details & scores: extract JSON object slices, parse them with `try/catch`, and default to empty structures on failure instead of breaking the UI.
  - Criterion key mismatches: `byCriterion` keys are matched case-insensitively and normalized so the frontend can always index by the exact criterion name string the user sees.

- **API key / network errors**
  - If `GROQ_API_KEY` is missing or invalid, the backend returns clear 401 error messages, and the Angular `AiService` exposes them as user-friendly errors.
  - Other errors (network, parsing, etc.) are caught and surfaced to the UI without crashing the app.

- **Results explanation clarity**
  - The `results` page doesn’t just show ranks; it:
    - Computes each product’s weighted score.
    - Identifies the top contributing criteria.
    - Incorporates AI-provided feature descriptions (where available) to explain *why* a product scored that way.

### How to run the project

#### Prerequisites

- Node.js (LTS recommended).
- npm (comes with Node).
- Angular CLI
- A Groq API key.

#### 1. Install dependencies

From the project root:

```bash
npm install
```

#### 2. Configure the Groq API key

In `server/.env`:

Get API_key from https://console.groq.com/keys

```bash
GROQ_API_KEY=your_groq_api_key_here
```

#### 3. Start the backend (AI API server)

From the project root:

```bash
node server/server.js
```

This starts the Express server on `http://localhost:3000` with the following routes:

- `POST /api/suggest-criteria`
- `POST /api/product-details`
- `POST /api/suggest-scores`

#### 4. Start the Angular dev server

In a separate terminal, from the project root:

```bash
npm start
```

This runs `ng serve` on `http://localhost:4200` and uses `proxy.conf.json` to forward `/api/*` requests to the backend on port 3000.

Open a browser at:

- `http://localhost:4200/`


### What I would improve with more time

- **Advanced decision models**
  - Introduce more sophiscated Multi-criteria decision-making methods to improve ranking accuracy.

- **Enhanced UI**
  - More sophiscated UI with visual charts to compare features and criteria.
  - Interactive scoring insights to improve explainablity.

- **User authentication and profiles**
  - Allow users to save, revisit, and compare multiple decisions over time.

- **External data integration**
  - Integrate domain-specific APIs or structured datasets to fetch real product specifications instead of relying   primarily on AI-generated values. 

- **Richer explanations and visualizations**
  - Add a dedicated “explanation” panel that:
    - Shows a breakdown chart (e.g. bar chart) of per-criterion contributions for each product.

- **Better AI orchestration**
  - Batch multiple products into a single call where appropriate, with careful post-processing, to reduce latency and cost.
  - Add retry and caching strategies (e.g. caching AI details for the same product names and topics).

- **Multi-user and server-side persistence**
  - Move decision state from `localStorage` to a backend store (e.g. MongoDB, Postgres) with user accounts, so decisions can be saved, revisited, and shared across devices.

- **Accessibility and responsiveness**
  - Improve keyboard navigation, focus styles, and ARIA labeling.
  - Further refine layouts for small screens and very long product/criterion names.

- **Testing and observability**
  - Add unit tests around the scoring logic and JSON normalization helpers in `server/server.js`.
  - Add logging/metrics (without leaking sensitive data) to understand AI usage patterns and failure modes in production.
