from pydantic import BaseModel # pyright: ignore[reportMissingImports]
from typing import List, Optional

class UserInput(BaseModel):
    experience: str
    location: str
    space: str
    sunlight: str
    preferences: List[str] = []

class FeatureFactor(BaseModel):
    label: str
    direction: str

class PlantResult(BaseModel):
    id: int
    common_name: str
    type: str
    predicted_score: float
    score_std: float
    beginner_score: float
    climate_score: float
    space_score: float
    edibility_score: float
    safety_score: float
    drought_score: float
    is_edible: int
    is_pet_safe: int
    is_indoor_suitable: int
    is_low_maintenance: int
    has_image: int
    image_url: Optional[str]
    cluster: int
    top_factors: List[FeatureFactor] = []
    watering: str
    watering_days: float
    sunlight: str
    care_level: str
    cycle: str
    maintenance: str
    growth_rate: str
    drought_tolerant: bool
    indoor: bool

class RecommendResponse(BaseModel):
    total_plants_evaluated: int
    plants_after_filtering: int
    top_recommendations: List[PlantResult]
    hidden_gems: List[PlantResult]
    diverse_set: List[PlantResult]
    profile_used: str

class WeatherResponse(BaseModel):
    city: str
    temperature: float
    humidity: int
    rainfall: float
    uv_index: int
    description: str
    adjustment_note: Optional[str] = None
