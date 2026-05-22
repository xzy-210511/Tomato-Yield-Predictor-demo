# AI Usage

1. User: Jiawei Zhang
Generative AI tool used:

- ChatGPT CodeX

Usage:
1. Read the assignment specific file
   - `README.md`
   - `AI.md`
   - `AI_log.md`

2. Help me complete database related problems
   - `src/main/java/com/example/demo/auth/`
   - `src/main/java/com/example/demo/records/`
   - `src/main/resources/db/migration/`
   - `src/main/resources/application.properties`
   - `src/main/resources/application-postgres.properties`
   - `docker-compose.yml`
   - `frontend/src/api/auth.js`
   - `frontend/src/api/records.js`
   - `frontend/src/pages/AuthPage.jsx`
   - `frontend/src/pages/InputPage.jsx`

3. Help me complete frontend comparison functions
   - `frontend/src/pages/HistoryPage.jsx`
   - `frontend/src/pages/InputPage.jsx`
   - `frontend/src/api/records.js`
   - `frontend/src/api/predict.js`

4. Help me resolve security and privacy related problems
   - `pom.xml`
   - `src/main/java/com/example/demo/auth/`
   - `frontend/src/pages/AuthPage.jsx`
   - `frontend/src/api/auth.js`
   - `README.md`

5. Help me check the whole code structure and fix bugs
   - `src/main/java/com/example/demo/`
   - `src/main/resources/`
   - `frontend/src/`
   - `model_service/api.py`
   - `pom.xml`
   - `package.json`

========================================================








2. User: Ling Fang
Generative AI tool used: ChatGpt5
========================================================

Usage:
1. Help me understand how to transform frontend user input into the same feature format used during model training
   - `model_service/ai.md`
   - `model_service/api.py`

2. Help me handle categorical tomato variety input for prediction
   - AI explained why string values such as tomato variety cannot be passed directly into the model.
   - AI helped explain how one-hot encoded variety fields match the model's training format.

3. Help me apply the same feature engineering during prediction as during training
   - AI helped identify engineered features such as `temp_range`, `NPK_total`, `N_ratio`, `P_ratio`, `K_ratio`, and `light_energy`.
   - AI explained why these features must be generated before prediction so the runtime input matches the training data structure.

4. Help me align prediction input columns with the trained model feature order
   - AI helped explain how to build a single-row input table with the same column names and order used during training.
   - AI explained how missing fields can be filled safely so the model receives a complete tabular input.

5. Help me understand prediction output formatting
   - AI helped explain why the processed input is converted into a DataFrame, scaled using the trained scaler, passed into the model, and returned as a JSON-friendly float value.

6. Help me understand how to map the time-series datasets for nutrient-solution modelling
   - AI helped explain how climate records, crop measurement records, and nutrient-solution records could be aligned by `days_after_transplant`, `ec`, `light`, and treatment information.
   - AI helped explain how daily climate summaries, interpolated daily crop-growth states, and nutrient-solution consumption records could be merged into one mapped training table.
   - AI helped explain the purpose of the mapped table used by the time-series nutrient-solution model.

7. Help me debug the optimization candidate search in `findbest.js`
   - `frontend/src/lib/findbest.js`
   - The core optimization logic and implementation direction were Ling Fang's own work.
   - AI was used to debug implementation difficulties in the result-judgement logic.
   - AI helped identify that the optimized time-series result should not be judged only by requiring plant height and leaf number to increase at the same time.
   - AI helped explain how the second optimization search needed reasonable parameter ranges and valid combinations, especially for temperature, humidity, CO2, lamp PAR, and light hours.

========================================================









3. User: Xiaoyang Zhang
Generative AI tool used: Chatgpt5
========================================================
AI was used to help understand how to connect the Spring Boot backend, Python model service, and React frontend into one working tomato yield prediction system.

AI was used to help design the time-series prediction API flow, including request objects, response objects, backend service logic, and the Python model endpoint.

AI was used to help write and review difficult frontend code, especially the time-series forecast panel, growth trajectory display, AI advice panel, and history comparison views.

AI was used to help debug model loading problems, including nutrient solution prediction model paths, time-series model startup preparation, and packaged static asset references.

AI was used to help create safer validation logic for prediction inputs, including outlier handling, valid yield search ranges, and clearer backend error responses.

AI was used to help write unit tests for complicated validation behavior so that invalid crop environment inputs are rejected before prediction.

AI was used to help organize database-backed history features, including simulation record tables, CRUD APIs, frontend API clients, and loading/saving prediction records.

AI was used to help compare historical prediction records and generate readable summaries for yield prediction, time-series prediction, and scenario comparison results.

AI was used to help improve the startup scripts so the project can automatically prepare the Python virtual environment, install dependencies, build the frontend, and start the model services.

AI was used to help clean the repository structure by ignoring generated files such as Python virtual environments, cache files, generated model artifacts, and built frontend assets.

AI was used to help explain complex implementation details in the README, including environment variables, service startup, model requirements, and project workflow.

AI was used to help review long or difficult code sections, but final decisions, testing, code adjustment, and integration were completed by the developer.

========================================================






4. User: Yumeng Han
Generative AI tool used: Chatgpt5

========================================================
Usage: some process work has been cleared and is not in the main document.

1. Help me complete tomato growth dataset cleaning and standardisation
   - `model integration/timeseries model/predict_growth_model.py`
   - `model integration/timeseries model/model_outputs/`

2. Help me design and train the recursive time-series growth prediction model
   - `model integration/timeseries model/predict_growth_model.py`
   - `model integration/timeseries model/example.py`
   - `model integration/timeseries model/model_outputs/recursive_growth_forecaster.joblib`

3. Help me combine the time-series growth model and yield model into one integrated prediction package
   - `model integration/integrated_tomato_model.py`
   - `model integration/example.py`
   - `model integration/timeseries model/`
   - `model integration/yield model/`

4. Help me simplify the integrated model input format for frontend and backend use
   - `model integration/integrated_tomato_model.py`
   - `model_service/api.py`
   - `frontend/src/pages/InputPage.jsx`
   - `frontend/src/pages/GrowthTestPage.jsx`

5. Help me test model inputs, outputs, examples, and backend-facing package structure
   - `model integration/timeseries model/timeseries_model_metrics.csv`
   - `model integration/timeseries model/recursive_prediction_actual_comparison_summary.csv`
   - `model integration/example.py`

========================================================




5. User: shaoboma
Generative AI tool used: Claude (Opus 4.7)
Scope: Frontend UI and 3D visualisation
========================================================
AI was used across four code modules within my contribution scope.

1. Page architecture and routing
   - AI assisted with refactoring the original single-page InputPage into a four-route cockpit architecture: Landing, Workspace, History, and Authentication.
   - Existing business logic was preserved, including useState declarations, the debounced live-prediction effect, predict handlers, and bestYield and bestGrowth comparison searches.

2. Reusable atomic components
   - AI assisted with scaffolding new React components:
     TopNav, GlassPanel, CollapsibleGroup, MetricChip, SparklineCard, WorkflowTab, HeroTomato, and ParticleTomato.
   - These components were used to construct the cockpit, HUD, and floating-panel layout.

3. 3D visualisation with react-three-fiber
   - AI assisted with extending the existing TomatoCanvas component by adding hero, darkBg, and rainy modes with corresponding supplemental lighting and environment swaps.
   - AI assisted with implementing scene rotation across sunny, rainy, and particle presets on the landing page.
   - AI assisted with voxelizing the GLB tomato model using MeshSurfaceSampler for the particle scene.

4. Tailwind theme tokens and dark-mode CSS
   - AI assisted with extending tailwind.config.js with a dark ink palette, a glow brand-highlight token, three glow shadow utilities, and four keyframe animations: float, breath, glow-pulse, and fade-up.
   - AI assisted with adding the theme-dark body class, dark scrollbar overrides, and the grid-bg perspective-grid utility in index.css.

All AI-assisted code was reviewed, manually integrated, and tested with npm run dev and npm run build before commit. Prompts were issued in English; representative prompts for each module are recorded in `AI_log.md`.

========================================================






6. User: Shutong Wang
Generative AI tools used: Gemini, Claude, Cursor
Scope: Frontend interaction, 3D tomato visualisation, and history UI
========================================================
AI was used to explore and improve frontend-only interactive features for the hydroponic tomato web app.

1. Frontend feature ideation
   - AI helped brainstorm interactive client-side ideas such as a digital twin plant, growth scroller, draggable dashboard widgets, animated gauges, multi-variable chart overlays, and visual leaf diagnostics.

2. 3D tomato model behaviour
   - AI helped improve TomatoCanvas animations so visual changes are smoother and parameters no longer make leaves, stems, or fruit separate unnaturally.
   - AI helped map many input parameters into visual targets such as colour, scale, leaf rotation, health score, sway, breathing, and tilt.

3. Environmental visual effects
   - AI helped add and improve visual effects linked to environmental inputs, including rain for humidity, sun motes and light rays for light intensity, CO2 mist, and pest-related particles.
   - AI helped fix material-colour problems caused by the GLB model's baked tint and replaced flickering contact shadows with a more stable shadow plane.

4. Prediction API connection planning
   - AI helped review how the frontend, Spring Boot backend, and Python FastAPI model service connect.
   - AI helped plan how slider changes could keep instant local 3D feedback while also using debounced real prediction API results to influence the tomato model.

5. History page visualisation
   - AI helped improve the History page by adding summary statistics such as total simulations, best yield, and average yield.
   - AI helped make comparison charts easier to see by auto-selecting recent records when appropriate.

All AI-assisted code and ideas were reviewed, manually integrated, and tested by the developer before use.

========================================================
