import ast
import pandas as pd
import numpy as np
import pickle
import tensorflow as tf
from pathlib import Path
from src.utils.preprocessing import (
    get_hard_filters, get_profile,
    apply_filters, apply_location_filter,
    apply_space_filter, calculate_match_score
)

BASE_DIR = Path(__file__).parent.parent.parent
MODELS_DIR = BASE_DIR / 'models'
DATA_DIR = BASE_DIR / 'data'

# Raw features worth surfacing to a user as "why this scored the way it did".
# Deliberately excludes encoded categoricals (type_enc, size_category_enc, ...)
# and housekeeping fields (has_image, data_quality_score, ...) since a gradient
# on a label-encoded integer or a data-quality flag isn't a meaningful reason.
FEATURE_LABELS = {
    'hardiness_min': 'Cold tolerance for your zone',
    'hardiness_max': 'Heat tolerance for your zone',
    'height_min_feet': 'Plant size',
    'height_max_feet': 'Mature plant size',
    'watering_days': 'Watering frequency',
    'indoor': 'Indoor suitability',
    'tropical': 'Tropical climate match',
    'drought_tolerant': 'Drought tolerance',
    'thorny': 'Thorns',
    'invasive': 'Invasiveness',
    'is_edible': 'Edibility',
    'is_pet_safe': 'Pet safety',
    'is_child_safe': 'Child safety',
    'is_family_safe': 'Family safety',
    'is_fast_growing': 'Growth speed',
    'is_flowering': 'Flowering',
    'is_medicinal': 'Medicinal use',
    'is_culinary': 'Culinary use',
    'is_climate_match': 'Israeli zone match',
    'is_small_space': 'Compact size',
    'is_perennial': 'Perennial (long-lived)',
    'is_annual': 'Annual (one season)',
    'israel_zone_match': 'Israeli hardiness zone match',
}


def extract_image_url(raw) -> str | None:
    """Perenual stores default_image as a dict of license info + size URLs.
    plants_final.csv round-trips it through CSV as a Python-dict-literal string,
    so it has to be parsed back before a usable URL can be pulled out."""
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    data = raw
    if isinstance(data, str):
        try:
            data = ast.literal_eval(data)
        except (ValueError, SyntaxError):
            return None
    if not isinstance(data, dict):
        return None
    return (
        data.get('regular_url') or data.get('medium_url')
        or data.get('original_url') or data.get('small_url')
        or data.get('thumbnail')
    )

class PlantRecommender:
    def __init__(self):
        print("loading models...")
        
        self.df = pd.read_csv(DATA_DIR / 'plants_final.csv')
        
        self.model = tf.keras.models.load_model(
            MODELS_DIR / 'matcher_model_final.keras'
        )
        # load encoders and scalers for preprocessing user input
        with open(MODELS_DIR / 'encoders.pkl', 'rb') as f:
            self.encoders = pickle.load(f)
        with open(MODELS_DIR / 'scaler.pkl', 'rb') as f:
            self.scaler = pickle.load(f)
        with open(MODELS_DIR / 'feature_cols.pkl', 'rb') as f:
            self.feature_cols = pickle.load(f)
            
        # load similarity model components for "more like this" feature
        with open(MODELS_DIR / 'similarity_kmeans.pkl', 'rb') as f:
            self.kmeans = pickle.load(f)
        with open(MODELS_DIR / 'similarity_scaler.pkl', 'rb') as f:
            self.scaler_sim = pickle.load(f)
        with open(MODELS_DIR / 'similarity_features.pkl', 'rb') as f:
            self.similarity_features = pickle.load(f)

        # pre-encode full dataset once at startup
        self._prepare_features()
        print(f"ready — {len(self.df)} plants loaded")

    def _prepare_features(self):
        cat_cols = ['watering', 'sunlight_primary', 'care_level',
                    'maintenance', 'growth_rate', 'cycle', 'type', 'size_category']
        num_cols = ['hardiness_min', 'hardiness_max',
                    'height_min_feet', 'height_max_feet', 'watering_days']

        df_enc = self.df.copy()
        for col in cat_cols:
            le = self.encoders[col]
            df_enc[col + '_enc'] = le.transform(df_enc[col].astype(str))

        df_enc[self.feature_cols] = df_enc[self.feature_cols].fillna(0)
        X = df_enc[self.feature_cols].values.astype(np.float32)

        num_indices = [self.feature_cols.index(col) for col in num_cols]
        X[:, num_indices] = self.scaler.transform(X[:, num_indices])

        self.X_all = X

    def _mc_forward(self, x_tensor):
        """One forward pass with Dropout forced stochastic but BatchNorm kept in
        inference mode. `model(x, training=True)` would flip both, and BatchNorm
        under training=True normalizes against the current batch's own statistics
        — for a batch of 1 (single-plant scoring) that's degenerate. Walking the
        layers lets only Dropout's randomness through."""
        x = x_tensor
        for layer in self.model.layers:
            if isinstance(layer, tf.keras.layers.Dropout):
                x = layer(x, training=True)
            else:
                x = layer(x, training=False)
        return x

    def predict_with_confidence(self, X, n_samples=15):
        """MC Dropout: run the same input through the network n_samples times
        with dropout left active. The mean approximates the normal prediction;
        the spread across runs is a real (if approximate) uncertainty signal —
        tight spread means the sub-networks agree, wide spread means the model
        is effectively guessing for this particular input."""
        x_tensor = tf.convert_to_tensor(X, dtype=tf.float32)
        samples = np.stack([
            self._mc_forward(x_tensor).numpy().flatten()
            for _ in range(n_samples)
        ])
        return samples.mean(axis=0), samples.std(axis=0)

    def explain_row(self, idx, top_k=3):
        """Gradient x input attribution — a cheap, dependency-free cousin of
        SHAP. Tells you which raw features pushed this specific plant's score
        up or down the most, grounded in what the network actually did on this
        input rather than a generic global importance ranking."""
        x = self.X_all[idx:idx + 1]
        x_tensor = tf.convert_to_tensor(x, dtype=tf.float32)
        with tf.GradientTape() as tape:
            tape.watch(x_tensor)
            pred = self.model(x_tensor, training=False)
        grads = tape.gradient(pred, x_tensor).numpy().flatten()
        contributions = grads * x.flatten()

        ranked = [
            (FEATURE_LABELS[feat], float(contributions[i]))
            for i, feat in enumerate(self.feature_cols)
            if feat in FEATURE_LABELS
        ]
        ranked.sort(key=lambda t: abs(t[1]), reverse=True)
        return [
            {'label': label, 'direction': 'positive' if val > 0 else 'negative'}
            for label, val in ranked[:top_k]
        ]

    def recommend(self, user_input, top_n=15):

        total = len(self.df)

        # step 1 — hard filters
        filters = get_hard_filters(user_input)
        filtered_df = apply_filters(self.df, filters)

        # step 2 — location filter
        filtered_df = apply_location_filter(filtered_df, user_input.location)

        # step 3 — space filter
        filtered_df = apply_space_filter(filtered_df, user_input.space)

        after_filter = len(filtered_df)

        if len(filtered_df) == 0:
            return {
                'total_plants_evaluated': total,
                'plants_after_filtering': 0,
                'top_recommendations': [],
                'hidden_gems': [],
                'diverse_set': [],
                'profile_used': 'none — no plants matched filters'
            }

        # step 4 — get indices of filtered plants
        filtered_indices = filtered_df.index.tolist()
        X_filtered = self.X_all[filtered_indices]

        # step 5 — run through neural network (MC Dropout: mean + uncertainty)
        pred_mean, pred_std = self.predict_with_confidence(X_filtered)
        filtered_df = filtered_df.copy()
        filtered_df['predicted_score'] = pred_mean
        filtered_df['score_std'] = pred_std

        # step 6 — get profile and apply soft scoring
        profile = get_profile(user_input)
        filtered_df['match_score'] = filtered_df.apply(
            lambda row: calculate_match_score(row, profile), axis=1
        )

        # step 7 — combine neural network + profile scores
        filtered_df['final_score'] = (
            filtered_df['predicted_score'] * 0.5 +
            filtered_df['match_score'] * 0.5
        )

        # Several common names cover multiple cultivars in the source data (e.g.
        # 3 separate "aloe" rows). The card only shows common_name + type, so
        # letting two of those into the same list reads as a duplicate — keep
        # just the highest-scoring cultivar per common name.
        filtered_df = (
            filtered_df.sort_values('final_score', ascending=False)
            .drop_duplicates(subset='common_name', keep='first')
        )

        # step 8 — rank and return top n
        top = filtered_df.nlargest(top_n, 'final_score')

        def build_result(row, score_col):
            return {
                'id': int(row['id']),
                'common_name': row['common_name'],
                'type': row['type'],
                'predicted_score': round(float(row[score_col]), 2),
                'score_std': round(float(row['score_std']), 2),
                'beginner_score': round(float(row['beginner_score']), 2),
                'climate_score': round(float(row['climate_score']), 2),
                'space_score': round(float(row['space_score']), 2),
                'edibility_score': round(float(row['edibility_score']), 2),
                'safety_score': round(float(row['safety_score']), 2),
                'drought_score': round(float(row['drought_score']), 2),
                'is_edible': int(row['is_edible']),
                'is_pet_safe': int(row['is_pet_safe']),
                'is_indoor_suitable': int(row['is_indoor_suitable']),
                'is_low_maintenance': int(row['is_low_maintenance']),
                'has_image': int(row['has_image']),
                'image_url': extract_image_url(row['default_image']),
                'cluster': int(row['cluster']),
                'top_factors': self.explain_row(row.name),
            }

        results = [build_result(row, 'final_score') for _, row in top.iterrows()]

        # step 9 — hidden gem detection
        # The KMeans similarity engine groups plants into 15 botanical clusters.
        # "Dominant cluster" = where the neural network's strongest picks in this
        # filtered pool actually live. A hidden gem is a plant the network still
        # scores highly on raw compatibility (not the profile-weighted blend used
        # for ranking) but that sits outside that expected cluster — the model
        # flagging something a standard cluster-bound search would never surface.
        HIDDEN_GEM_MIN_SCORE = 70
        top_slice_size = max(1, len(filtered_df) // 5)
        dominant_clusters = set(
            filtered_df.nlargest(top_slice_size, 'predicted_score')['cluster'].mode().tolist()
        )
        gem_candidates = filtered_df[
            (filtered_df['predicted_score'] >= HIDDEN_GEM_MIN_SCORE) &
            (~filtered_df['cluster'].isin(dominant_clusters))
        ].nlargest(3, 'predicted_score')

        hidden_gems = [build_result(row, 'predicted_score') for _, row in gem_candidates.iterrows()]

        # step 10 — diverse "garden portfolio" set: the strongest plant from each
        # distinct botanical cluster present in the filtered pool, instead of a
        # pure top-N which tends to bunch up in whichever single cluster the
        # profile weighting favors (e.g. all leafy vegetables for an edible
        # preference). Puts the KMeans clustering to a second real use beyond
        # hidden-gem detection.
        DIVERSE_SET_SIZE = 6
        diverse_candidates = (
            filtered_df.sort_values('final_score', ascending=False)
            .groupby('cluster', sort=False)
            .head(1)
            .nlargest(DIVERSE_SET_SIZE, 'final_score')
        )
        diverse_set = [build_result(row, 'final_score') for _, row in diverse_candidates.iterrows()]

        return {
            'total_plants_evaluated': total,
            'plants_after_filtering': after_filter,
            'top_recommendations': results,
            'hidden_gems': hidden_gems,
            'diverse_set': diverse_set,
            'profile_used': profile
        }

    def score_plant(self, plant_id: int, user_input):
        """Score one specific plant against a user's conditions, bypassing the
        hard filters used in recommend(). For the plant catalog: someone
        browsing all 936 plants wants to know 'what would THIS score for me',
        even if it wouldn't have survived the pet-safe/edible/etc. filters."""
        matches = self.df[self.df['id'] == plant_id]
        if len(matches) == 0:
            return None

        idx = matches.index[0]
        row = self.df.loc[idx]
        x = self.X_all[idx:idx + 1]

        pred_mean, pred_std = self.predict_with_confidence(x)
        profile = get_profile(user_input)
        match_score = calculate_match_score(row, profile)
        final_score = float(pred_mean[0]) * 0.5 + match_score * 0.5

        return {
            'id': int(row['id']),
            'common_name': row['common_name'],
            'type': row['type'],
            'predicted_score': round(final_score, 2),
            'score_std': round(float(pred_std[0]), 2),
            'beginner_score': round(float(row['beginner_score']), 2),
            'climate_score': round(float(row['climate_score']), 2),
            'space_score': round(float(row['space_score']), 2),
            'edibility_score': round(float(row['edibility_score']), 2),
            'safety_score': round(float(row['safety_score']), 2),
            'drought_score': round(float(row['drought_score']), 2),
            'is_edible': int(row['is_edible']),
            'is_pet_safe': int(row['is_pet_safe']),
            'is_indoor_suitable': int(row['is_indoor_suitable']),
            'is_low_maintenance': int(row['is_low_maintenance']),
            'has_image': int(row['has_image']),
            'image_url': extract_image_url(row['default_image']),
            'cluster': int(row['cluster']),
            'top_factors': self.explain_row(idx),
            'profile_used': profile,
        }

    def get_similar(self, plant_name: str, top_n=5):

        plant = self.df[
            self.df['common_name'].str.lower() == plant_name.lower()
        ]
        if len(plant) == 0:
            plant = self.df[
                self.df['common_name'].str.lower().str.contains(
                    plant_name.lower(), na=False
                )
            ]
        if len(plant) == 0:
            return []

        plant = plant.iloc[0]
        cluster_id = plant['cluster']

        similar = self.df[
            (self.df['cluster'] == cluster_id) &
            (self.df['common_name'] != plant['common_name'])
        ].copy()

        similar = similar.nlargest(top_n, 'overall_home_score')

        return [
            {
                'id': int(row['id']),
                'common_name': row['common_name'],
                'type': row['type'],
                'overall_home_score': round(float(row['overall_home_score']), 2),
                'image_url': extract_image_url(row['default_image']),
            }
            for _, row in similar.iterrows()
        ]