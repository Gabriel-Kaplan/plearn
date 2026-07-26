import pandas as pd
import numpy as np
import pickle

# location to hardiness zone mapping
LOCATION_ZONE = {
    'tel_aviv': 10,
    'jerusalem': 9,
    'north': 9,
    'south': 11,
    'negev': 11,
    'haifa': 10,
    'beer_sheva': 10,
}

# space to indoor/height mapping
SPACE_CONFIG = {
    'windowsill': {'indoor': 1, 'max_height': 1},
    'balcony':    {'indoor': 0, 'max_height': 6},
    'garden':     {'indoor': 0, 'max_height': 999},
    'indoor':     {'indoor': 1, 'max_height': 8},
}

# experience to profile weights mapping
PROFILE_MAP = {
    'beginner':     'beginner',
    'intermediate': 'intermediate',
    'edible':       'edible_focus',
    'pet_owner':    'pet_owner',
    'drought':      'drought_focus',
}

PROFILE_WEIGHTS = {
    'beginner': {
        'beginner_score': 0.35, 'space_score': 0.25,
        'climate_score': 0.20, 'drought_score': 0.10,
        'safety_score': 0.05, 'edibility_score': 0.05
    },
    'intermediate': {
        'beginner_score': 0.20, 'space_score': 0.25,
        'climate_score': 0.25, 'drought_score': 0.15,
        'safety_score': 0.05, 'edibility_score': 0.10
    },
    'edible_focus': {
        'beginner_score': 0.15, 'space_score': 0.20,
        'climate_score': 0.20, 'drought_score': 0.10,
        'safety_score': 0.05, 'edibility_score': 0.30
    },
    'pet_owner': {
        'beginner_score': 0.25, 'space_score': 0.20,
        'climate_score': 0.15, 'drought_score': 0.10,
        'safety_score': 0.25, 'edibility_score': 0.05
    },
    'drought_focus': {
        'beginner_score': 0.20, 'space_score': 0.20,
        'climate_score': 0.20, 'drought_score': 0.30,
        'safety_score': 0.05, 'edibility_score': 0.05
    }
}

def get_hard_filters(user_input) -> dict:
    filters = {}
    prefs = user_input.preferences

    if 'pet_safe' in prefs:
        filters['is_pet_safe'] = 1
    if 'edible' in prefs:
        filters['is_edible'] = 1
    if 'low_maintenance' in prefs:
        filters['is_low_maintenance'] = 1
    if 'drought_resistant' in prefs:
        filters['is_drought_resistant'] = 1
    if 'flowering' in prefs:
        filters['is_flowering'] = 1
    if 'medicinal' in prefs:
        filters['is_medicinal'] = 1
    if 'indoor' in prefs or user_input.space in ['windowsill', 'indoor']:
        filters['is_indoor_suitable'] = 1

    return filters

def get_profile(user_input) -> str:
    prefs = user_input.preferences

    if 'edible' in prefs:
        return 'edible_focus'
    if 'pet_safe' in prefs:
        return 'pet_owner'
    if 'drought_resistant' in prefs:
        return 'drought_focus'
    if user_input.experience == 'intermediate':
        return 'intermediate'
    return 'beginner'

def apply_filters(df: pd.DataFrame, filters: dict) -> pd.DataFrame:
    filtered = df.copy()
    for col, val in filters.items():
        if col in filtered.columns:
            filtered = filtered[filtered[col] == val]
    return filtered

def apply_location_filter(df: pd.DataFrame, location: str) -> pd.DataFrame:
    zone = LOCATION_ZONE.get(location, 10)
    # keep plants that can survive in this zone
    return df[
        (df['hardiness_min'] <= zone) & 
        (df['hardiness_max'] >= zone - 1)
    ]

def apply_space_filter(df: pd.DataFrame, space: str) -> pd.DataFrame:
    """filter by space constraints"""
    config = SPACE_CONFIG.get(space, SPACE_CONFIG['balcony'])
    max_h = config['max_height']
    if max_h < 999:
        df = df[
            (df['height_max_feet'].isna()) | 
            (df['height_max_feet'] <= max_h)
        ]
    return df

def calculate_match_score(plant_row, profile: str) -> float:
    """calculate weighted compatibility score for a plant"""
    weights = PROFILE_WEIGHTS.get(profile, PROFILE_WEIGHTS['beginner'])
    return round(sum(
        plant_row[score] * weight 
        for score, weight in weights.items()
    ), 2)