from __future__ import annotations

import base64
import binascii
import os
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from image_model_training import load_image_model_artifact, predict_image_insights, train_and_save_image_models
from model_training import FEATURE_COLUMNS, TARGET_LEVEL_COLUMNS, load_model_artifact, normalize_skin_type, train_and_save_models


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "merged"
MODELS_DIR = BASE_DIR / "models"


# Reads an optional environment variable path and falls back to the project default path.
def _env_path(name: str, fallback: Path) -> Path:
    value = os.getenv(name, "").strip()
    return Path(value) if value else fallback


API_PORT = int(os.getenv("AI_SERVICE_PORT", "8000"))
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("AI_ALLOWED_ORIGINS", "*").split(",") if origin.strip()]
AUTO_TRAIN_ON_START = os.getenv("AI_AUTO_TRAIN_ON_START", "true").strip().lower() == "true"
AUTO_TRAIN_IMAGE_ON_START = os.getenv("AI_AUTO_TRAIN_IMAGE_ON_START", "false").strip().lower() == "true"

MASTER_DATASET_PATH = _env_path(
    "MASTER_DATASET_PATH",
    DATA_DIR / "master_questionnaire_prediction_dataset.csv",
)
RECOMMENDATIONS_DATASET_PATH = _env_path(
    "RECOMMENDATIONS_DATASET_PATH",
    DATA_DIR / "recommendations_dataset.csv",
)
PRODUCTS_DATASET_PATH = _env_path(
    "PRODUCTS_DATASET_PATH",
    DATA_DIR / "products_dataset.csv",
)

ROUTINES_DATASET_PATH = _env_path(
    "ROUTINES_DATASET_PATH",
    DATA_DIR / "routines_dataset.csv",
)
MODEL_ARTIFACT_PATH = _env_path(
    "AI_MODEL_ARTIFACT_PATH",
    MODELS_DIR / "skincare_models.joblib",
)
DEFAULT_IMAGE_DATASET_ROOT = Path(r"C:\Users\Khaled\Desktop\Dataset Skincare")
IMAGE_CONCERN_DATASET_PATH = _env_path(
    "AI_IMAGE_CONCERN_DATASET_PATH",
    DEFAULT_IMAGE_DATASET_ROOT / "data2" / "dataset",
)
IMAGE_SKIN_TYPE_DATASET_PATH = _env_path(
    "AI_IMAGE_SKIN_TYPE_DATASET_PATH",
    DEFAULT_IMAGE_DATASET_ROOT / "data3" / "Oily-Dry-Skin-Types",
)
IMAGE_MODEL_ARTIFACT_PATH = _env_path(
    "AI_IMAGE_MODEL_ARTIFACT_PATH",
    MODELS_DIR / "skincare_image_models.joblib",
)
NO_FACE_MESSAGE = "No face detected. Please upload a clear photo of your face."
MIN_FACE_AREA_RATIO = float(os.getenv("AI_MIN_FACE_AREA_RATIO", "0.015"))
FACE_CASCADE_NAMES = (
    "haarcascade_frontalface_default.xml",
    "haarcascade_frontalface_alt2.xml",
)
FACE_CASCADES = tuple(
    cascade
    for cascade in (
        cv2.CascadeClassifier(str(Path(cv2.data.haarcascades) / cascade_name))
        for cascade_name in FACE_CASCADE_NAMES
    )
    if not cascade.empty()
)


# Normalizes text used for product, routine, and recommendation matching.
def _clean_text(value: Any) -> str:
    return str(value or "").strip().lower()


# Keeps model concern scores inside the valid 0 to 5 range.
def clamp_level(value: Any, default: int = 2) -> int:
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        number = default
    return max(0, min(5, number))


# Converts a numeric concern score into a readable severity label for the frontend.
def score_to_severity(score: int) -> str:
    if score >= 4:
        return "severe"
    if score >= 2:
        return "moderate"
    return "mild"


# Defines the JSON body accepted by the /predict endpoint.
class PredictRequest(BaseModel):
    imageBase64: str | None = None
    questionnaireData: dict[str, Any] = Field(default_factory=dict)


# Defines the optional JSON body accepted when manually starting training.
class TrainRequest(BaseModel):
    reason: str | None = None


class TrainImageRequest(BaseModel):
    reason: str | None = None
    max_images_per_class: int = Field(default=650, ge=100, le=5000)
    near_duplicate_hamming: int = Field(default=-1, ge=-1, le=16)
    min_image_dim: int = Field(default=64, ge=32, le=512)


# Loads and normalizes the merged CSV datasets used by FastAPI.
class DatasetStore:
    # Loads all merged datasets into memory when the FastAPI service starts.
    def __init__(self) -> None:
        self.master_df = self._load_dataset(MASTER_DATASET_PATH)
        self.recommendations_df = self._load_dataset(RECOMMENDATIONS_DATASET_PATH)
        self.products_df = self._load_dataset(PRODUCTS_DATASET_PATH)
        self.routines_df = self._load_dataset(ROUTINES_DATASET_PATH)
        self._normalize_datasets()

    @staticmethod
    # Reads a dataset from disk and fails early if the CSV is missing.
    def _load_dataset(path: Path) -> pd.DataFrame:
        if not path.exists():
            raise FileNotFoundError(f"Dataset was not found: {path}")
        return pd.read_csv(path)

    # Standardizes dataset values so later filtering and matching are reliable.
    def _normalize_datasets(self) -> None:
        if "skin_type" in self.master_df.columns:
            self.master_df["skin_type"] = self.master_df["skin_type"].map(normalize_skin_type)

        if "skin_type" in self.recommendations_df.columns:
            self.recommendations_df["skin_type"] = self.recommendations_df["skin_type"].map(normalize_skin_type)
        for col in ["acne_level_0_5", "dryness_level_0_5", "oiliness_level_0_5", "sensitivity_level_0_5"]:
            if col in self.recommendations_df.columns:
                self.recommendations_df[col] = (
                    pd.to_numeric(self.recommendations_df[col], errors="coerce").fillna(0).astype(int)
                )

        if "target_skin_types" in self.products_df.columns:
            self.products_df["target_skin_types"] = self.products_df["target_skin_types"].fillna("").astype(str).str.lower()
        if "target_concerns" in self.products_df.columns:
            self.products_df["target_concerns"] = self.products_df["target_concerns"].fillna("").astype(str).str.lower()
        if "category" in self.products_df.columns:
            self.products_df["category"] = self.products_df["category"].fillna("").astype(str).str.lower()
        if "brand" in self.products_df.columns:
            self.products_df["brand"] = self.products_df["brand"].fillna("").astype(str)
        if "product_name" in self.products_df.columns:
            self.products_df["product_name"] = self.products_df["product_name"].fillna("").astype(str)

    # Returns dataset paths, row counts, and columns for debugging or presentation.
    def summary(self) -> dict[str, Any]:
        return {
            "master_questionnaire_prediction": {
                "path": str(MASTER_DATASET_PATH),
                "rows": int(len(self.master_df)),
                "columns": list(self.master_df.columns),
            },
            "recommendations": {
                "path": str(RECOMMENDATIONS_DATASET_PATH),
                "rows": int(len(self.recommendations_df)),
                "columns": list(self.recommendations_df.columns),
            },
            "products": {
                "path": str(PRODUCTS_DATASET_PATH),
                "rows": int(len(self.products_df)),
                "columns": list(self.products_df.columns),
            },
            "routines": {
                "path": str(ROUTINES_DATASET_PATH),
                "rows": int(len(self.routines_df)),
                "columns": list(self.routines_df.columns),
            },
        }


# Manages model loading, retraining, prediction, and training status.
class ModelService:
    # Loads the saved model artifact, or trains a new one automatically if configured.
    def __init__(self, master_dataset_path: Path, model_artifact_path: Path, auto_train_on_start: bool = True) -> None:
        self.master_dataset_path = master_dataset_path
        self.model_artifact_path = model_artifact_path
        self.artifact: dict[str, Any] | None = None
        if self.model_artifact_path.exists():
            self.reload()
        elif auto_train_on_start:
            self.train("auto_train_on_start")
        else:
            raise FileNotFoundError(
                f"Model artifact not found at {self.model_artifact_path}. "
                "Set AI_AUTO_TRAIN_ON_START=true or call /training/start."
            )

    # Reloads the trained artifact from disk into memory.
    def reload(self) -> None:
        self.artifact = load_model_artifact(self.model_artifact_path)

    # Starts training from the master dataset and stores the new artifact for predictions.
    def train(self, reason: str | None = None) -> dict[str, Any]:
        artifact = train_and_save_models(self.master_dataset_path, self.model_artifact_path)
        self.artifact = artifact
        return {
            "status": "trained",
            "reason": reason or "manual",
            "model_artifact_path": str(self.model_artifact_path),
            "trained_at": artifact.get("trained_at"),
            "metrics": artifact.get("metrics", {}),
        }

    # Maps frontend questionnaire field names and values into the exact training feature columns.
    def _frontend_value_to_feature(self, questionnaire: dict[str, Any]) -> dict[str, Any]:
        after_cleansing_map = {
            "tight": "tight",
            "comfortable": "balanced",
            "slightly-oily": "slightly oily",
            "very-oily": "oily",
            "dry-dull": "dry",
        }
        breakout_map = {
            "rarely": "rare",
            "sometimes": "sometimes",
            "often": "frequent",
            "always": "frequent",
        }
        reaction_map = {
            "none": "low",
            "redness": "medium",
            "breakout": "high",
            "irritation": "high",
            "dry-tight": "medium",
        }
        pores_map = {"low": "small", "medium": "medium", "high": "large", "variable": "medium"}
        tightness_map = {"comfortable": "no", "dry-tight": "often", "oily-greasy": "no", "irritated-sensitive": "sometimes"}
        redness_map = {"red-irritated": "high", "flaky": "medium", "balanced": "low", "shiny-tzone": "low", "shiny-all": "low"}
        sun_map = {"burn easily": "burn easily", "tan easily": "tan easily", "sometimes burn": "sometimes burn"}

        feature_row = {
            "age_group": questionnaire.get("age_group") or questionnaire.get("ageRange") or "unknown",
            "fitzpatrick_type": questionnaire.get("fitzpatrick_type") or questionnaire.get("fitzpatrickType") or "unknown",
            "q1_skin_feel": questionnaire.get("q1_skin_feel")
            or after_cleansing_map.get(_clean_text(questionnaire.get("afterCleansing")), "unknown"),
            "q2_breakouts": questionnaire.get("q2_breakouts")
            or breakout_map.get(_clean_text(questionnaire.get("breakoutFrequency")), "unknown"),
            "q3_sensitivity": questionnaire.get("q3_sensitivity")
            or reaction_map.get(_clean_text(questionnaire.get("productReaction")), "unknown"),
            "q4_pores": questionnaire.get("q4_pores")
            or pores_map.get(_clean_text(questionnaire.get("shineLevel")), "unknown"),
            "q5_tightness": questionnaire.get("q5_tightness")
            or tightness_map.get(_clean_text(questionnaire.get("endOfDay")), "unknown"),
            "q6_redness": questionnaire.get("q6_redness")
            or redness_map.get(_clean_text(questionnaire.get("middayFeeling")), "unknown"),
            "q7_sun_reaction": questionnaire.get("q7_sun_reaction")
            or sun_map.get(_clean_text(questionnaire.get("sunReaction")), "unknown"),
            "q8_hydration_status": questionnaire.get("q8_hydration_status")
            or ("often dehydrated" if _clean_text(questionnaire.get("afterCleansing")) in {"tight", "dry-dull"} else "well hydrated"),
            "q9_sleep_quality": questionnaire.get("q9_sleep_quality") or questionnaire.get("sleepQuality") or "unknown",
            "q10_stress_level": questionnaire.get("q10_stress_level") or questionnaire.get("stressLevel") or "unknown",
        }

        for key in FEATURE_COLUMNS:
            feature_row[key] = str(feature_row.get(key, "unknown") or "unknown").strip()
        return feature_row

    # Runs the trained models and returns skin type, concern scores, and confidence.
    def predict(self, questionnaire: dict[str, Any]) -> dict[str, Any]:
        if not self.artifact:
            raise RuntimeError("Model artifact is not loaded.")

        skin_model = self.artifact["skin_model"]
        level_model = self.artifact["level_model"]
        level_columns = self.artifact["target_level_columns"]

        feature_row = self._frontend_value_to_feature(questionnaire)
        X = pd.DataFrame([feature_row], columns=FEATURE_COLUMNS)

        predicted_skin_type = normalize_skin_type(skin_model.predict(X)[0])
        predicted_levels_raw = level_model.predict(X)[0]

        scores: dict[str, int] = {}
        for idx, level_column in enumerate(level_columns):
            predicted_value = clamp_level(round(float(predicted_levels_raw[idx])), default=0)
            direct_value = questionnaire.get(level_column)
            if direct_value is not None and str(direct_value).strip() != "":
                predicted_value = clamp_level(direct_value, default=predicted_value)
            scores[level_column.replace("_level_0_5", "").replace("_skin", "")] = predicted_value

        confidence = 0.7
        try:
            classifier = skin_model.named_steps.get("classifier")
            encoded = skin_model.named_steps["encoder"].transform(X)
            if classifier is not None and hasattr(classifier, "predict_proba"):
                confidence = float(classifier.predict_proba(encoded).max())
        except Exception:
            confidence = 0.7

        return {
            "skin_type": predicted_skin_type,
            "scores": scores,
            "confidence": round(max(0.5, min(0.98, confidence)), 2),
        }

    # Reports whether a model is loaded and what metrics were saved during training.
    def status(self) -> dict[str, Any]:
        if not self.artifact:
            return {"loaded": False, "model_artifact_path": str(self.model_artifact_path)}
        return {
            "loaded": True,
            "model_artifact_path": str(self.model_artifact_path),
            "trained_at": self.artifact.get("trained_at"),
            "metrics": self.artifact.get("metrics", {}),
        }


class ImageModelService:
    def __init__(
        self,
        concern_dataset_path: Path,
        skin_type_dataset_path: Path,
        model_artifact_path: Path,
        auto_train_on_start: bool = False,
    ) -> None:
        self.concern_dataset_path = concern_dataset_path
        self.skin_type_dataset_path = skin_type_dataset_path
        self.model_artifact_path = model_artifact_path
        self.artifact: dict[str, Any] | None = None
        self.last_error: str | None = None

        if self.model_artifact_path.exists():
            self.reload()
        elif auto_train_on_start and self.concern_dataset_path.exists() and self.skin_type_dataset_path.exists():
            self.train(reason="auto_train_image_on_start")

    def reload(self) -> None:
        self.artifact = load_image_model_artifact(self.model_artifact_path)
        self.last_error = None

    def train(
        self,
        reason: str | None = None,
        max_images_per_class: int = 650,
        near_duplicate_hamming: int = -1,
        min_image_dim: int = 64,
    ) -> dict[str, Any]:
        artifact = train_and_save_image_models(
            concern_dataset_path=self.concern_dataset_path,
            skin_type_dataset_path=self.skin_type_dataset_path,
            model_artifact_path=self.model_artifact_path,
            max_images_per_class=max_images_per_class,
            near_duplicate_hamming=near_duplicate_hamming,
            min_image_dim=min_image_dim,
        )
        self.artifact = artifact
        self.last_error = None
        return {
            "status": "trained",
            "reason": reason or "manual",
            "image_model_artifact_path": str(self.model_artifact_path),
            "trained_at": artifact.get("trained_at"),
            "metrics": artifact.get("metrics", {}),
            "concern_dataset_path": str(self.concern_dataset_path),
            "skin_type_dataset_path": str(self.skin_type_dataset_path),
        }

    def predict(self, image_bytes: bytes) -> dict[str, Any] | None:
        if not self.artifact:
            return None
        return predict_image_insights(self.artifact, image_bytes)

    def status(self) -> dict[str, Any]:
        status = {
            "loaded": bool(self.artifact),
            "image_model_artifact_path": str(self.model_artifact_path),
            "concern_dataset_path": str(self.concern_dataset_path),
            "skin_type_dataset_path": str(self.skin_type_dataset_path),
            "datasets_available": bool(self.concern_dataset_path.exists() and self.skin_type_dataset_path.exists()),
            "last_error": self.last_error,
        }
        if self.artifact:
            status.update(
                {
                    "trained_at": self.artifact.get("trained_at"),
                    "metrics": self.artifact.get("metrics", {}),
                }
            )
        return status


def fuse_scores(questionnaire_scores: dict[str, int], image_scores: dict[str, int], image_weight: float = 0.4) -> dict[str, int]:
    fused = dict(questionnaire_scores)
    clamped_weight = max(0.0, min(0.8, image_weight))
    base_weight = 1.0 - clamped_weight

    for key, question_score in questionnaire_scores.items():
        image_score = image_scores.get(key)
        if image_score is None:
            continue
        fused[key] = clamp_level(round((question_score * base_weight) + (image_score * clamped_weight)), default=question_score)

    for key in ["dark_spots", "pigmentation", "pores", "wrinkles"]:
        if key in image_scores and image_scores[key] >= 2:
            fused[key] = clamp_level(image_scores[key], default=0)
    return fused


STORE = DatasetStore()
MODEL_SERVICE = ModelService(MASTER_DATASET_PATH, MODEL_ARTIFACT_PATH, auto_train_on_start=AUTO_TRAIN_ON_START)
IMAGE_MODEL_SERVICE = ImageModelService(
    concern_dataset_path=IMAGE_CONCERN_DATASET_PATH,
    skin_type_dataset_path=IMAGE_SKIN_TYPE_DATASET_PATH,
    model_artifact_path=IMAGE_MODEL_ARTIFACT_PATH,
    auto_train_on_start=AUTO_TRAIN_IMAGE_ON_START,
)


# Decodes an optional base64 image so the response can note that image signal was included.
def extract_image_bytes(raw_image: str | None) -> bytes | None:
    if not raw_image:
        return None
    text = raw_image.strip()
    if not text:
        return None

    payload = text
    if text.startswith("data:") and "," in text:
        payload = text.split(",", 1)[1]

    try:
        return base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError):
        return None


# Rejects non-face uploads before the image model can force them into a skin category.
def image_contains_face(image_bytes: bytes) -> bool:
    if not FACE_CASCADES:
        raise RuntimeError("OpenCV face detection classifiers are unavailable.")

    encoded = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=422, detail="The uploaded image could not be read.")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    if max(height, width) > 1600:
        scale = 1600 / max(height, width)
        gray = cv2.resize(gray, (max(1, int(width * scale)), max(1, int(height * scale))))

    image_area = gray.shape[0] * gray.shape[1]
    min_face_side = max(24, int(min(gray.shape) * 0.08))
    variants = (gray, cv2.equalizeHist(gray))
    for variant in variants:
        for cascade in FACE_CASCADES:
            faces = cascade.detectMultiScale(
                variant,
                scaleFactor=1.07,
                minNeighbors=3,
                minSize=(min_face_side, min_face_side),
            )
            for _x, _y, face_width, face_height in faces:
                face_area_ratio = (face_width * face_height) / image_area
                if face_area_ratio >= MIN_FACE_AREA_RATIO:
                    return True
    return False


# Converts model concern scores into frontend-friendly condition cards.
def build_conditions(
    scores: dict[str, int],
    image_bytes: bytes | None,
    image_prediction: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    image_bonus = 0.04 if image_bytes else 0.0
    templates = {
        "acne": ("Breakout probability detected by trained model.", "T-zone"),
        "dryness": ("Dryness tendency inferred from the learned questionnaire patterns.", "Cheeks"),
        "oiliness": ("Oiliness pattern inferred from the learned questionnaire patterns.", "T-zone"),
        "redness": ("Redness risk detected from trained model outputs.", "Cheeks"),
        "sensitivity": ("Sensitivity profile inferred by the model.", "General"),
        "dehydration": ("Hydration barrier support may be needed.", "General"),
        "mature": ("Mature-skin support may be beneficial.", "Eyes/Forehead"),
        "dark_spots": ("Dark-spot signal inferred by trained image classes.", "Cheeks"),
        "pigmentation": ("Pigmentation concern inferred by trained image classes.", "Cheeks"),
        "pores": ("Enlarged pore pattern inferred from image classes.", "T-zone"),
        "wrinkles": ("Wrinkle pattern inferred from image classes.", "Eyes/Forehead"),
    }

    image_specific = {"dark_spots", "pigmentation", "pores", "wrinkles"}
    concern_probs = (image_prediction or {}).get("concern_probabilities", {}) if image_prediction else {}
    skin_type_probs = (image_prediction or {}).get("skin_type_probabilities", {}) if image_prediction else {}

    def image_signal_for_key(key: str) -> float:
        if not image_prediction:
            return 0.0
        if key == "acne":
            return float(concern_probs.get("acne", 0.0))
        if key == "redness":
            return float(concern_probs.get("redness", 0.0))
        if key == "pores":
            return float(concern_probs.get("pores", 0.0))
        if key == "pigmentation":
            return float(concern_probs.get("pigmentation", 0.0))
        if key == "dark_spots":
            return float(concern_probs.get("dark_spots", 0.0))
        if key == "wrinkles":
            return float(concern_probs.get("wrinkles", 0.0))
        if key == "oiliness":
            return max(float(concern_probs.get("pores", 0.0)), float(skin_type_probs.get("oily", 0.0)))
        if key in {"dryness", "dehydration"}:
            return float(skin_type_probs.get("dry", 0.0))
        if key == "sensitivity":
            return max(float(concern_probs.get("redness", 0.0)), float(skin_type_probs.get("dry", 0.0)))
        if key == "mature":
            return float(concern_probs.get("wrinkles", 0.0))
        return 0.0

    ranked: list[tuple[float, str, int]] = []
    for key, score in scores.items():
        if score < 2:
            continue
        signal = image_signal_for_key(key)
        rank = float(score) + (signal * 3.0) + (0.35 if key in image_specific else 0.0)
        ranked.append((rank, key, score))

    ranked.sort(key=lambda item: (-item[0], -item[2], item[1]))
    if image_bytes and ranked:
        ranked = ranked[:5]

    conditions: list[dict[str, Any]] = []
    for _rank, key, score in ranked:
        description, area = templates.get(key, ("Concern inferred by model.", "General"))
        confidence = min(0.95, round(0.54 + (score * 0.07) + image_bonus, 2))
        conditions.append(
            {
                "name": key,
                "severity": score_to_severity(score),
                "description": description,
                "confidence": confidence,
                "area": area,
            }
        )

    if not conditions:
        conditions.append(
            {
                "name": "balanced_skin",
                "severity": "mild",
                "description": "Model found no high-severity concern for the provided input.",
                "confidence": 0.6,
                "area": "General",
            }
        )
    return conditions


# Finds the closest recommendation rule for the predicted skin type and concern scores.
def match_recommendation(skin_type: str, scores: dict[str, int]) -> dict[str, Any] | None:
    df = STORE.recommendations_df
    subset = df[df["skin_type"] == skin_type].copy()
    if subset.empty:
        subset = df.copy()
    if subset.empty:
        return None

    target = [
        scores.get("acne", 0),
        scores.get("dryness", 0),
        scores.get("oiliness", 0),
        scores.get("sensitivity", 0),
    ]
    features = ["acne_level_0_5", "dryness_level_0_5", "oiliness_level_0_5", "sensitivity_level_0_5"]

    for feature in features:
        if feature not in subset.columns:
            subset[feature] = 0
    subset["distance"] = (
        (subset[features[0]] - target[0]).abs()
        + (subset[features[1]] - target[1]).abs()
        + (subset[features[2]] - target[2]).abs()
        + (subset[features[3]] - target[3]).abs()
    )
    best = subset.sort_values(["distance"]).iloc[0].to_dict()
    return {
        "recommended_cleanser": best.get("recommended_cleanser"),
        "recommended_moisturizer": best.get("recommended_moisturizer"),
        "recommended_serum": best.get("recommended_serum"),
        "recommended_spf": best.get("recommended_spf"),
        "recommended_treatment": best.get("recommended_treatment"),
    }


app = FastAPI(
    title="Skincare AI FastAPI Service",
    description="Model-driven skincare microservice trained on your merged datasets.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
# Health endpoint used to confirm FastAPI and the model are available.
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "skincare-fastapi",
        "port": API_PORT,
        "models": {
            "questionnaire": MODEL_SERVICE.status(),
            "image": IMAGE_MODEL_SERVICE.status(),
        },
    }


@app.get("/datasets/summary")
# Returns a quick summary of the loaded datasets.
def datasets_summary() -> dict[str, Any]:
    return STORE.summary()


@app.get("/recommendations/match")
# API endpoint that matches a skin profile to cleanser, moisturizer, serum, SPF, and treatment.
def recommendations_match(
    skin_type: str = Query("normal"),
    acne_level_0_5: int = Query(0, ge=0, le=5),
    dryness_level_0_5: int = Query(0, ge=0, le=5),
    oiliness_level_0_5: int = Query(0, ge=0, le=5),
    sensitivity_level_0_5: int = Query(0, ge=0, le=5),
) -> dict[str, Any]:
    scores = {
        "acne": acne_level_0_5,
        "dryness": dryness_level_0_5,
        "oiliness": oiliness_level_0_5,
        "sensitivity": sensitivity_level_0_5,
        "redness": 0,
        "dehydration": 0,
        "mature": 0,
    }
    normalized_skin_type = normalize_skin_type(skin_type)
    match = match_recommendation(normalized_skin_type, scores)
    if not match:
        raise HTTPException(status_code=404, detail="No recommendation match found.")
    return {"skin_type": normalized_skin_type, "scores": scores, "match": match}


@app.get("/products/search")
# API endpoint that filters the product dataset by search text, skin type, concern, or category.
def products_search(
    q: str | None = Query(default=None),
    skin_type: str | None = Query(default=None),
    concern: str | None = Query(default=None),
    category: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict[str, Any]:
    df = STORE.products_df.copy()
    if skin_type:
        token = normalize_skin_type(skin_type)
        df = df[df["target_skin_types"].str.contains(token, na=False)]
    if concern:
        df = df[df["target_concerns"].str.contains(_clean_text(concern), na=False)]
    if category:
        df = df[df["category"].str.contains(_clean_text(category), na=False)]
    if q:
        needle = _clean_text(q)
        df = df[
            df["product_name"].str.lower().str.contains(needle, na=False)
            | df["brand"].str.lower().str.contains(needle, na=False)
        ]
    records = df.head(limit).to_dict(orient="records")
    return {"count": len(records), "items": records}


@app.get("/routines/match")
# API endpoint that returns the closest AM/PM skincare routine for the provided scores.
def routines_match(
    skin_type: str = Query("normal"),
    acne_level_0_5: int = Query(0, ge=0, le=5),
    dryness_level_0_5: int = Query(0, ge=0, le=5),
    oiliness_level_0_5: int = Query(0, ge=0, le=5),
    sensitivity_level_0_5: int = Query(0, ge=0, le=5),
) -> dict[str, Any]:
    normalized_skin_type = normalize_skin_type(skin_type)
    df = STORE.routines_df.copy()
    if df.empty:
        raise HTTPException(status_code=404, detail="No routines dataset available.")

    for feature in ["acne_level_0_5", "dryness_level_0_5", "oiliness_level_0_5", "sensitivity_level_0_5"]:
        if feature in df.columns:
            df[feature] = pd.to_numeric(df[feature], errors="coerce").fillna(0).astype(int)

    subset = df[df["skin_type"].map(normalize_skin_type) == normalized_skin_type]
    if subset.empty:
        subset = df

    subset = subset.copy()
    subset["distance"] = (
        (subset["acne_level_0_5"] - acne_level_0_5).abs()
        + (subset["dryness_level_0_5"] - dryness_level_0_5).abs()
        + (subset["oiliness_level_0_5"] - oiliness_level_0_5).abs()
        + (subset["sensitivity_level_0_5"] - sensitivity_level_0_5).abs()
    )
    best = subset.sort_values("distance").head(1).to_dict(orient="records")
    return {"count": len(best), "items": best}


@app.post("/predict")
# Main prediction endpoint used by the app after the questionnaire or image upload flow.
def predict(payload: PredictRequest) -> dict[str, Any]:
    questionnaire = payload.questionnaireData or {}
    image_bytes = extract_image_bytes(payload.imageBase64)
    if payload.imageBase64 and not image_bytes:
        raise HTTPException(status_code=422, detail="The uploaded image could not be read.")
    if image_bytes and not image_contains_face(image_bytes):
        raise HTTPException(status_code=422, detail=NO_FACE_MESSAGE)

    model_prediction = MODEL_SERVICE.predict(questionnaire)
    skin_type = model_prediction["skin_type"]
    scores = dict(model_prediction["scores"])
    confidence = model_prediction["confidence"]
    image_model_used = False
    image_prediction: dict[str, Any] | None = None

    if image_bytes and IMAGE_MODEL_SERVICE.artifact:
        image_prediction = IMAGE_MODEL_SERVICE.predict(image_bytes)
        if image_prediction:
            image_model_used = True
            scores = fuse_scores(scores, image_prediction.get("scores", {}), image_weight=0.4)
            image_skin_type = normalize_skin_type(image_prediction.get("skin_type"))
            image_skin_type_confidence = float(image_prediction.get("skin_type_confidence", 0.0))
            if image_skin_type and image_skin_type_confidence >= 0.72:
                skin_type = image_skin_type
            confidence = round(max(confidence, float(image_prediction.get("confidence", confidence))), 2)

    conditions = build_conditions(scores, image_bytes, image_prediction=image_prediction)
    recommendation_match = match_recommendation(skin_type, scores)

    if image_model_used:
        summary = (
            f"Model inference completed. Estimated skin type: {skin_type}. "
            "Concern levels were fused from questionnaire + trained image classifiers."
        )
    else:
        summary = (
            f"Model inference completed. Estimated skin type: {skin_type}. "
            "Concern levels were produced by trained questionnaire models."
        )

    return {
        "skinType": skin_type,
        "confidence": confidence,
        "summary": summary,
        "scores": scores,
        "trackingScores": image_prediction.get("scores", scores) if image_prediction else scores,
        "conditions": conditions,
        "recommendationMatch": recommendation_match,
        "meta": {
            "model_artifact_path": str(MODEL_ARTIFACT_PATH),
            "image_model_artifact_path": str(IMAGE_MODEL_ARTIFACT_PATH),
            "trained_at": MODEL_SERVICE.status().get("trained_at"),
            "service_mode": "trained_model",
            "used_image_signal": bool(image_bytes),
            "image_model_used": image_model_used,
            "image_skin_type_confidence": image_prediction.get("skin_type_confidence") if image_prediction else None,
        },
    }


@app.get("/training/status")
# Shows the currently loaded model artifact and its training metrics.
def training_status() -> dict[str, Any]:
    return {
        "questionnaire_model": MODEL_SERVICE.status(),
        "image_model": IMAGE_MODEL_SERVICE.status(),
    }


@app.post("/training/start")
# Manually retrains the models from the merged master dataset.
def training_start(payload: TrainRequest) -> dict[str, Any]:
    return MODEL_SERVICE.train(payload.reason)


@app.get("/training/image-status")
def training_image_status() -> dict[str, Any]:
    return IMAGE_MODEL_SERVICE.status()


@app.post("/training/image-start")
def training_image_start(payload: TrainImageRequest) -> dict[str, Any]:
    try:
        result = IMAGE_MODEL_SERVICE.train(
            payload.reason,
            max_images_per_class=payload.max_images_per_class,
            near_duplicate_hamming=payload.near_duplicate_hamming,
            min_image_dim=payload.min_image_dim,
        )
        return result
    except Exception as error:
        IMAGE_MODEL_SERVICE.last_error = str(error)
        raise HTTPException(status_code=500, detail=f"Image model training failed: {error}") from error


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("fastapi_service:app", host="0.0.0.0", port=API_PORT, reload=False)
