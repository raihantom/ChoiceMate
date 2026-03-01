## All AI prompts used:

1. Explain the problem statement: Design and build a “Decision Companion System” that helps a user make better decisions.
The system should assist a user in evaluating options for a real-world decision of their choice.
Your system must work without relying entirely on an AI model. If AI is used, clearly justify its role and limitations.
Examples (you are NOT limited to these):Choosing a laptop under a budget: Selecting the best candidate for a job role
Deciding where to travel within constraints  Picking an investment strategy Choosing a tech stack for a startup.
Suggest Algorithms to use.
2. When do people make decisions?
3. Does decision always include choices
4. Suggest a architectural flow for the project if i wish to build a decision companion system for choosing a car.
5. what about using Decision Tree Method for Car Selection Problem
6. Which is better a Domain specific project or a general decision-support system.
7. weighted scoring model algorithm vs decision tree algorithm vs utility function model compare these algorithms,mention its pros and cons.
8. AHP and TOPSIS
9. Suggest More algorithms
10. AI or API data fetching best for the project
11. is there any apis where i can get information like features of any product
12. How to integrate AI into the project.
13. Express vs Django which has more AI support
14. what about the use of express as backend does it provide llm support as of python.
15. suggest a name for this project.
16. so my idea is to build a general system for decision making in which the user provides the subject on which the decision is to be made.the user is asked for any products he have in mind.An AI system is used to find the criterias for the decision making. Then the user is asked to weight the criterias according to his needs. An weighted scoring model algorithm is used to give the ranked outputs. Give me suggestions. is it feasible. Does it align with the problem statement. suggest ways to achieve this.
17. How to integrate ai into the project using express and js
18. The error Can't bind to 'ngModel' since it isn't a known property of 'input' why??
19. How to integrate openAI Api into the project.
20. How to Implement AI calls for criteria and product details.
21. Http failure response for http://localhost:4200/api/suggest-criteria: 401 Unauthorized  
22. Change OpenAI to GeminiAPI
23. For the code present, we get this error:'GoogleGenAI' is declared but its value is never read. 
24. change the project to run using groq api key
25. it is showing invalid api key even though i added a new api key
26. Http failure response for http://localhost:4200/api/suggest-criteria: 404 Not Found why this issue
27. while running the project i found a bug that the ai is only fetching the details of one product. The ai should fetch the details of the all the products added by the customer. Give me a solution.
28. Add a optional feature so that the ai provides a score with respect to features to the products.
29. optimize the scoring of the features of the products by AI. 
30. Give the format to write the Readme file.
31. Check for any error in the logic.
32. Optimize the prompts for indian context.
33. session handling
34. Future scope of the project

## All search queries (including Google searches):

1. Decision support system algorithms
2. Algorithms other than Weighted scoring model
3. AHP
4. TOPSIS
5. free apis to get features of cars
6. free apis to get general information
7. free apis
8. type annotation error in angular
9. routing in algorithm not working
10. use of any in angular 
11. imports in angular
12. AI integration in express with angular frontend
13. is OpenAI API free
14. 401 error meaning
15. Limit of OpenAI API
16. Limit of GeminiAI API
17. Groq API 
18. 404 Not Found error in AI integration
19. steps to rectify accident inclusion of env file to github
20. github showing rule violation error how to rectify it
21. weighted scoring model explaination

## References that influenced your approach:

- Multi-Criteria Decision Making (MCDM) concepts
  - The weighted scoring model used in this project was influenced by common multi-criteria decision-making techniques that emphasize transparent and explainable ranking based on user-defined priorities.
- Angular Official Documentation
  - Angular documentation influenced the adoption of standalone components and modern control flow syntax (@if, @for) to build a modular and maintainable frontend architecture.
- LLM API Documentation (OpenAI, Gemini, Groq)
  - API documentation and examples shaped the AI integration strategy, particularly around structured outputs, prompt design, and handling non-deterministic responses safely.
- Decision Support System Design Patterns
  - The overall flow (criteria definition → weighting → scoring → explainable results) was influenced by common decision-support and recommendation-system patterns used in analytical tools.

## What you accepted, rejected, or modified from AI outputs

Accepted:

	•	Initial guidance on project structure and decision-system workflow
	•	Suggestions for implementing a weighted scoring model and explainable ranking logic
	•	Recommendations for frontend organization using Angular standalone components
	•	AI prompt structures for generating criteria and product features.

Modified:  

    •	AI-generated architecture suggestions were adapted to keep the system domain-agnostic rather than domain-specific.
    •	Suggested UI flows were adjusted to fit a step-by-step decision process better suited to user experience.
    •	AI-generated JSON outputs were normalized into fixed internal data structures before being used in the application.
    •    AI outputs occasionally included extra text or inconsistent key naming, which led to implementing defensive  parsing and schema normalization.

Rejected:

    •	Approaches that relied entirely on AI-generated rankings or decision-making, since the core requirement was explainable and deterministic logic.
    •	Overly complex algorithms that increased implementation complexity without clear benefit for the project scope such as AHP,decision tree model etc
    •	Suggestions involving heavy backend infrastructure or databases that were unnecessary for a single-user browser-based workflow.
    •	Directly trusting LLM outputs without validation, parsing, and normalization.












