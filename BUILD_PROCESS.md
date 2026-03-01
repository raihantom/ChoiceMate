## Build Process

### How I started

- I began by carefully analysing and understanding the problem statement :- Design and build a “Decision Companion System” that helps a user make better decisions. After careful observation and understanding I decided to design and build a system that supports decision-making in a transparent and explainable way.

- Initially, I considered building a domain-specific solution (a car decision companion system) but I realised that any way I have to build a decision-making support system for choosing cars, Why not make it a general decision companion system that works across multiple domains. So i decided to go for a more scalable approach. This decision guided the overall architecture of the project.

- The major design challenges i need to tackle were :
  - To decide How to get the details of the product specified by the user and the criteria for decision making,either by api or AI assistance or from the user itself.
  - Next I had to decide on which algorithm to use , weighted scoring model algorithm , decision tree algorithm , utility function model , AHP or TOPSIS.

- To design a more scalable system that works across multiple domains I decided to give the user the option to either specify the criteria themselves or use AI to suggest the criteria which the user can validate and change if required.The features and the details of the project are fetched using AI for the application to be more scalable.
- Ater researching about the various algorithms The **Weighted Scoring Model algorithm** was chosen for its simplicity and explainablity. Also because of time constraint i chose not to implement any complex algorithms.

- At last i decided to add a optional budget constraint to specify if a product or an option is above the users the budget so that a decision can be made accordingly.

**The decision flow:**

	 1.	User defines a decision topic.
	 2.	User adds options/products.
	 3.	User specifies the criteria OR AI suggests criteria and features.
	 4.	User assigns Importance or Weights to the criterias.
	 5.	Weighted scoring generates ranked results.

I started implementation by setting up the Angular frontend structure using standalone components, followed by creating separate pages for each decision step to keep the flow modular and maintainable.
The weighted scoring model was implemented to ensure that the core decision logic remained independent from AI-generated inputs

- **Baseline Angular app**  
  - Used Angular framework for the project and confirmed the routing/pages structure (`products`, `criteria`, `weights`, `results`).
  - Verified that the front end already stored decision state (`topic`, products, criteria, scores) in `localStorage`.
- **Backend AI integration**  
  - Introduced a small Node/Express server (`server/server.js`) dedicated to AI:
    - Configured an OpenAI-compatible client pointing at Groq’s endpoint.
    - Added three core endpoints: `/api/suggest-criteria`, `/api/product-details`, and `/api/suggest-scores`.
  - Initially used straightforward prompts and naive JSON parsing, assuming the model would respond with clean JSON.

### How my thinking evolved

- **From Direct LLM Consumption to Defensive Output Handling**  
  - Initially, the implementation assumed that the LLM would strictly follow JSON-only response instructions.During implementation, responses occasionally included surrounding explanatory text, formatting inconsistencies etc.
  - This required strengthening the backend handling logic by:

	   • Extracting the valid JSON segment from model responses before processing.

	   • Wrapping parsing operations in try/catch blocks with safe fallback handling.

	   • Normalizing responses into consistent, predefined data structures before returning data to the frontend.

- **OpenAI API ---> Groq API**

  - The project initially used the OpenAI API because of its strong documentation and ease of integration, which helped in quickly validating the AI-assisted workflow.
  - Gemini API was evaluated to compare output behavior, structured response handling, and overall integration experience. This step helped confirm that the AI layer should remain interchangeable rather than tied to a single provider.

	•	Final Decision — Groq API
  - The implementation was finalized using the Groq API primarily due to its free usage tier, which made experimentation and frequent development testing practical without cost constraints. This allowed rapid iteration while maintaining acceptable response quality and performance. Groq Api also provides different models to choose from.


### Alternative approaches considered

-  **Decision Tree + Weighted Scoring Hybrid**
   - An alternative design combining a rule-based decision tree with the weighted scoring model. The decision tree would first filter or narrow options based on hard constraints (e.g., budget range, category, or must-have conditions), after which weighted scoring would rank the remaining options.
   
   - Rejected because Maintaining flexible, dynamic decision criteria became more complex when combined with hardcoded rule branches.
	- Additional complexity did not provide significant benefit for the initial scope compared to a single transparent scoring model.

- **Using External APIs Instead of AI for Data Retrieval**  
  - An alternative approach considered relying exclusively on external product APIs to fetch structured feature data for user-provided options instead of using an AI-assisted data generation layer.
  - Rejected because The system is designed to be domain-agnostic, and many decision domains do not have universally available or consistent public APIs.
	- Integrating multiple domain-specific APIs would increase implementation complexity and reduce flexibility.
	- API coverage and data completeness vary significantly, making it difficult to maintain a consistent user experience across different decision topics.

- **Direct client-side AI calls**  
  - Considered letting the Angular app call Groq directly.
  - Rejected because it would expose API keys to the browser and tightly couple the UI to the AI provider.
  - The server-based approach keeps secrets safe and makes swapping providers/models feasible.

- **Single “all-in-one” AI endpoint**  
  - Considered one endpoint that, given topic/products, would return criteria, descriptions, and scores in one shot.
  - Rejected in favor of three smaller endpoints:
    - Simpler prompts and responses per task.
    - More control over when each AI step is used (user can run some but not others).
    - Easier to debug and reason about when something goes wrong.

- **Database-backed persistence**  
  - Considered adding a database and user accounts for multi-device use.
  - Rejected as overkill for this scope; `localStorage` is sufficient for a single-user, single-device flow and keeps setup simple.

### Refactoring decisions

- **Server env handling**  
  - Started with `import 'dotenv/config'`, which loads `.env` relative to the working directory.
  - Refactored to explicitly load `server/.env` using `fileURLToPath` and `path.join(__dirname, '.env')` so the server behaves correctly regardless of where `node` is invoked.

- **Response normalization helpers**  
  - Factored logic to normalize AI outputs:
    - Criteria: map any array of values/objects to `{ name: string; weight: number }`.
    - Product details: `normalizeByCriterion` to align arbitrary `byCriterion` keys to the exact criterion names.
    - Scores: convert any numeric-like values into safe integers between 1 and 10.
  - These refactors reduced duplication and made it easier to adjust behavior in one place.

- **Results explanation logic**  
  - Refactored `getRankExplanation` in `results.ts` to:
    - Load `decisionProductDetails` from `localStorage`.
    - Enrich explanations with per-criterion scores, weights, and optional AI feature text.
  - This moved the results page from generic wording to a more analytical, user-friendly breakdown.

### Mistakes and corrections

- **Accidentally Committed Environment File and Lost Previous Commits**
  - Miatake: During development, the environment configuration file (.env) was accidentally committed to the Git repository. While attempting to fix this, incorrect Git operations resulted in the loss of initial commits.
  - Correction Taken: Removed sensitive files from version control and added .env to .gitignore
  - Lesson Learned:
	  
      •	Always configure .gitignore before the first commit.

	  •	Avoid history-rewriting operations without backup or clear understanding
- **Env loading and missing API key**  
  - Mistake: Assuming `dotenv/config` would automatically find `server/.env` regardless of the working directory.
  - Symptom: Runtime `OpenAIError: Missing credentials` even though `GROQ_API_KEY` was set.
  - Fix: Explicitly configure `dotenv` to load from the `server` directory, ensuring `process.env.GROQ_API_KEY` is always available.

- **Assuming perfect JSON from the AI**  
  - Mistake: Parsing responses directly with `JSON.parse` on the full content.
  - Symptom: Occasional parsing failures when the model added extra text or formatting.
  - Fix: Added robust JSON extraction and fallback behavior, plus normalization to expected types and shapes.

- **Under-specified UI explanations**  
  - Mistake: Initial results explanations only named top criteria, without scores, weights, or features.
  - Symptom: Users couldn’t tell *why* a product was better in concrete terms.
  - Fix: Enriched explanations with numeric contributions and AI-generated feature descriptions per criterion.

### What changed during development and why

- **Introduction of an Express backend and proxying**  
  - Added `server/server.js` and `proxy.conf.json`, and wired the Angular dev server to forward `/api/*` to `localhost:3000`.
  - Reason: Separate concerns (UI vs AI) and protect secrets while keeping the developer experience (`ng serve`) smooth.

- **UI consistency and background styling**  
  - Introduced a global dark navy gradient in `src/styles.css` and standardized `.page-container` styling across pages.
  - Reason: Remove the white body border and give the app a cohesive, product-like look instead of a collection of disparate screens.

- **AI-driven details and scoring**  
  - Grew from only AI criteria suggestions and product details to:
    - AI score suggestions integrated into the weights page.
    - Rich explanations in the results page that leverage both numeric scores and textual details.
  - Reason: Make the AI a true assistant that keeps the user informed, not a “black box” that outputs a bare ranking.

Overall, the project evolved into a structured decision-support system that combines resilient AI-assisted data handling with deterministic, explainable decision logic.

   
   

