## 2. Recommendation Engine Service
 
**Responsibility:** Generates, scores, and ranks outfit combinations based on context (weather, occasion, user preferences).
 
### Core Capabilities
- Contextual outfit generation
- Multi-dimensional outfit scoring
- Personalized ranking
- Feedback loop processing
- Historical recommendation tracking
### Key Endpoints
```
GET    /recommendations               → Today's top outfit recommendations
POST   /recommendations/custom        → Generate outfits for specific context
POST   /recommendations/:id/feedback  → Submit worn/skipped/modified feedback
GET    /recommendations/history       → Past recommendations and outcomes
```
 
### Scoring Pipeline
 
Outfit score = weighted sum of five dimensions, personalized per user:
 
```python
def score_outfit(items, context, user_prefs):
    colour_score    = ColourHarmonyModel.score(items)       # HSL harmony
    occasion_score  = OccasionClassifier.score(items, context.occasion)
    silhouette_score = SilhouetteBalancer.score(items)
    novelty_score   = NoveltyCalculator.score(items, user.recent_outfits)
    preference_score = PreferenceModel.score(items, user_prefs)
    
    weights = user_prefs.dimension_weights  # learned per user
    
    return WeightedSum([
        (colour_score,     weights.colour),
        (occasion_score,   weights.occasion),
        (silhouette_score, weights.silhouette),
        (novelty_score,    weights.novelty),
        (preference_score, weights.preference)
    ])
```
 
### Candidate Generation Strategy
1. **Hard filters:** Item availability, weather appropriateness, cleanliness status
2. **Soft ranking:** Compatibility graph traversal from anchor item
3. **Combination cap:** Evaluate top 200 combinations, return top 5
### Data Ownership
- **Reads from:** All item data (PostgreSQL), preference vectors (Vector DB), context APIs (weather, calendar)
- **Writes to:** PostgreSQL `outfit_logs` table, Kafka `feedback.events` queue
---
