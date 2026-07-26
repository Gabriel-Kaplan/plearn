from fastapi import FastAPI, HTTPException # pyright: ignore[reportMissingImports]
from fastapi.middleware.cors import CORSMiddleware # pyright: ignore[reportMissingImports]
from src.api.schemas import UserInput, RecommendResponse, WeatherResponse
from src.api.predict import PlantRecommender, extract_image_url
from src.api.weather import get_current_weather

app = FastAPI(
    title="Plearn API",
    description="AI-powered plant recommendation engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# load models
recommender = PlantRecommender()

@app.get("/")
def root():
    return {"status": "ok", "plants": len(recommender.df)}

@app.post("/recommend")
def recommend(user_input: UserInput):
    try:
        result = recommender.recommend(user_input)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/plant/{plant_id}")
def get_plant(plant_id: int):
    plant = recommender.df[recommender.df['id'] == plant_id]
    if len(plant) == 0:
        raise HTTPException(status_code=404, detail="plant not found")
    return plant.iloc[0].to_dict()

@app.get("/similar/{plant_name}")
def get_similar(plant_name: str, top_n: int = 5):
    results = recommender.get_similar(plant_name, top_n)
    if not results:
        raise HTTPException(status_code=404, detail="plant not found")
    return results

@app.post("/score-plant/{plant_id}")
def score_plant(plant_id: int, user_input: UserInput):
    result = recommender.score_plant(plant_id, user_input)
    if result is None:
        raise HTTPException(status_code=404, detail="plant not found")
    return result

@app.get("/weather/{city}", response_model=WeatherResponse)
def get_weather(city: str):
    return get_current_weather(city)

@app.get("/plants")
def get_all_plants(limit: int = 1000, offset: int = 0):
    cols = ['id', 'common_name', 'type', 'overall_home_score',
            'default_image', 'cluster', 'is_edible', 'is_pet_safe',
            'is_indoor_suitable', 'is_low_maintenance']
    plants = recommender.df[cols].iloc[offset:offset + limit].copy()
    plants['image_url'] = plants['default_image'].apply(extract_image_url)
    plants = plants.drop(columns=['default_image'])
    return plants.to_dict(orient='records')
