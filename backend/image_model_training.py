from __future__ import annotations

from datetime import datetime, timezone
import hashlib
from io import BytesIO
from pathlib import Path
from typing import Any, Callable

import joblib
import numpy as np
from PIL import Image, UnidentifiedImageError
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

CONCERN_LABEL_ALIASES = {
    "inflammatory acne": "acne",
    "non inflammatory acne black heads": "acne",
    "non inflammatory acne white heads": "acne",
    "acne": "acne",
    "redness": "redness",
    "dark spots": "dark_spots",
    "pigmentation": "pigmentation",
    "pores": "pores",
    "wrinkles": "wrinkles",
}

SKIN_TYPE_ALIASES = {
    "dry": "dry",
    "normal": "normal",
    "oily": "oily",
}

FEATURE_SPEC = {
    "rgb_small_size": (36, 36),
    "rgb_hist_bins": 18,
    "hsv_hist_bins": 18,
    "gray_hist_bins": 32,
    "lbp_bins": 32,
    "ahash_size": 8,
}


def _normalize_label(value: str) -> str:
    token = " ".join(str(value or "").strip().lower().replace("_", " ").replace("-", " ").split())
    return token


def normalize_concern_label(value: str) -> str:
    token = _normalize_label(value)
    return CONCERN_LABEL_ALIASES.get(token, token.replace(" ", "_"))


def normalize_skin_type_label(value: str) -> str:
    token = _normalize_label(value)
    return SKIN_TYPE_ALIASES.get(token, token)


def _resample_filter() -> int:
    try:
        return int(Image.Resampling.BILINEAR)  # Pillow >= 9
    except AttributeError:
        return int(Image.BILINEAR)


def _hamming_distance(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def _compute_ahash(image: Image.Image) -> int:
    side = int(FEATURE_SPEC["ahash_size"])
    resample = _resample_filter()
    gray = image.convert("L").resize((side, side), resample)
    arr = np.asarray(gray, dtype=np.float32)
    threshold = float(arr.mean())
    bits = (arr >= threshold).astype(np.uint8).reshape(-1)
    hash_value = 0
    for idx, bit in enumerate(bits):
        hash_value |= int(bit) << idx
    return hash_value


def _compute_lbp_histogram(gray_arr: np.ndarray) -> np.ndarray:
    center = gray_arr[1:-1, 1:-1]
    neighbors = [
        gray_arr[0:-2, 0:-2],
        gray_arr[0:-2, 1:-1],
        gray_arr[0:-2, 2:],
        gray_arr[1:-1, 2:],
        gray_arr[2:, 2:],
        gray_arr[2:, 1:-1],
        gray_arr[2:, 0:-2],
        gray_arr[1:-1, 0:-2],
    ]

    lbp = np.zeros(center.shape, dtype=np.uint8)
    for idx, neighbor in enumerate(neighbors):
        lbp |= ((neighbor >= center).astype(np.uint8) << idx)

    hist, _ = np.histogram(
        lbp,
        bins=FEATURE_SPEC["lbp_bins"],
        range=(0, 256),
        density=True,
    )
    return hist.astype(np.float32)


def _extract_features_from_image(image: Image.Image) -> np.ndarray:
    resample = _resample_filter()
    rgb_small = image.convert("RGB").resize(FEATURE_SPEC["rgb_small_size"], resample)
    rgb_arr = np.asarray(rgb_small, dtype=np.float32) / 255.0

    flat_rgb = rgb_arr.reshape(-1)

    rgb_hist_features: list[float] = []
    for channel in range(3):
        hist, _ = np.histogram(
            rgb_arr[:, :, channel],
            bins=FEATURE_SPEC["rgb_hist_bins"],
            range=(0.0, 1.0),
            density=True,
        )
        rgb_hist_features.extend(hist.astype(np.float32).tolist())

    hsv_arr = np.asarray(rgb_small.convert("HSV"), dtype=np.float32) / 255.0
    hsv_hist_features: list[float] = []
    for channel in range(3):
        hist, _ = np.histogram(
            hsv_arr[:, :, channel],
            bins=FEATURE_SPEC["hsv_hist_bins"],
            range=(0.0, 1.0),
            density=True,
        )
        hsv_hist_features.extend(hist.astype(np.float32).tolist())

    gray = image.convert("L").resize((64, 64), resample)
    gray_arr = np.asarray(gray, dtype=np.float32) / 255.0
    gray_hist, _ = np.histogram(
        gray_arr,
        bins=FEATURE_SPEC["gray_hist_bins"],
        range=(0.0, 1.0),
        density=True,
    )
    grad_x = np.abs(np.diff(gray_arr, axis=1))
    grad_y = np.abs(np.diff(gray_arr, axis=0))
    texture_stats = np.array(
        [
            float(np.mean(grad_x)),
            float(np.std(grad_x)),
            float(np.mean(grad_y)),
            float(np.std(grad_y)),
        ],
        dtype=np.float32,
    )
    lbp_hist = _compute_lbp_histogram(gray_arr)
    return np.concatenate(
        [
            flat_rgb.astype(np.float32),
            np.asarray(rgb_hist_features, dtype=np.float32),
            np.asarray(hsv_hist_features, dtype=np.float32),
            gray_hist.astype(np.float32),
            texture_stats,
            lbp_hist,
        ],
        axis=0,
    )


def _extract_features_from_path(path: Path) -> np.ndarray | None:
    try:
        with Image.open(path) as image:
            return _extract_features_from_image(image)
    except (UnidentifiedImageError, OSError, ValueError):
        return None


def extract_features_from_image_bytes(image_bytes: bytes) -> np.ndarray | None:
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            return _extract_features_from_image(image)
    except (UnidentifiedImageError, OSError, ValueError):
        return None


def _collect_image_dataset(
    dataset_root: Path,
    label_normalizer: Callable[[str], str],
    max_images_per_class: int | None = None,
    near_duplicate_hamming: int = 2,
    min_image_dim: int = 64,
    shared_exact_hashes: dict[str, set[str]] | None = None,
    shared_ahashes: dict[str, list[int]] | None = None,
) -> tuple[np.ndarray, np.ndarray, dict[str, int], dict[str, int]]:
    if not dataset_root.exists():
        raise FileNotFoundError(f"Dataset folder was not found: {dataset_root}")

    exact_hashes_by_class = shared_exact_hashes if shared_exact_hashes is not None else {}
    ahashes_by_class = shared_ahashes if shared_ahashes is not None else {}

    features: list[np.ndarray] = []
    labels: list[str] = []
    class_counts: dict[str, int] = {}
    dedupe_stats = {
        "skipped_copy_named": 0,
        "skipped_invalid_files": 0,
        "skipped_small_images": 0,
        "skipped_exact_duplicates": 0,
        "skipped_near_duplicates": 0,
    }

    for class_dir in sorted(dataset_root.iterdir()):
        if not class_dir.is_dir():
            continue

        label = label_normalizer(class_dir.name)
        accepted = 0
        seen_exact = exact_hashes_by_class.setdefault(label, set())
        seen_ahash = ahashes_by_class.setdefault(label, [])

        for file_path in sorted(class_dir.iterdir()):
            if not file_path.is_file():
                continue
            if file_path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            if " - copy" in file_path.name.lower():
                dedupe_stats["skipped_copy_named"] += 1
                continue

            try:
                raw_bytes = file_path.read_bytes()
            except OSError:
                dedupe_stats["skipped_invalid_files"] += 1
                continue

            digest = hashlib.sha1(raw_bytes).hexdigest()
            if digest in seen_exact:
                dedupe_stats["skipped_exact_duplicates"] += 1
                continue

            try:
                with Image.open(BytesIO(raw_bytes)) as image:
                    width, height = image.size
                    if min(width, height) < min_image_dim:
                        dedupe_stats["skipped_small_images"] += 1
                        continue

                    a_hash = _compute_ahash(image)
                    if near_duplicate_hamming >= 0 and any(
                        _hamming_distance(a_hash, previous) <= near_duplicate_hamming for previous in seen_ahash
                    ):
                        dedupe_stats["skipped_near_duplicates"] += 1
                        continue

                    vector = _extract_features_from_image(image)
            except (UnidentifiedImageError, OSError, ValueError):
                dedupe_stats["skipped_invalid_files"] += 1
                continue

            features.append(vector)
            labels.append(label)
            seen_exact.add(digest)
            seen_ahash.append(a_hash)
            accepted += 1

            if max_images_per_class and accepted >= max_images_per_class:
                break

        if accepted > 0:
            class_counts[label] = accepted

    if len(class_counts) < 2:
        raise ValueError(f"Dataset {dataset_root} must have at least two non-empty classes.")
    if not features:
        raise ValueError(f"Dataset {dataset_root} did not produce valid image features.")

    return np.vstack(features), np.array(labels), class_counts, dedupe_stats


def _candidate_models(random_state: int) -> dict[str, Any]:
    return {
        "extra_trees_balanced": ExtraTreesClassifier(
            n_estimators=420,
            random_state=random_state,
            n_jobs=1,
            class_weight="balanced_subsample",
            max_features="sqrt",
            min_samples_leaf=1,
            criterion="gini",
        ),
        "extra_trees_entropy": ExtraTreesClassifier(
            n_estimators=360,
            random_state=random_state,
            n_jobs=1,
            class_weight="balanced_subsample",
            max_features="sqrt",
            min_samples_leaf=1,
            criterion="entropy",
        ),
        "random_forest_balanced": RandomForestClassifier(
            n_estimators=420,
            random_state=random_state,
            n_jobs=1,
            class_weight="balanced_subsample",
            max_features="sqrt",
            min_samples_leaf=1,
            criterion="gini",
        ),
    }


def _train_classifier(
    X: np.ndarray,
    y: np.ndarray,
    random_state: int,
) -> tuple[Any, dict[str, Any]]:
    X_train_full, X_test, y_train_full, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=random_state,
        stratify=y,
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_full,
        y_train_full,
        test_size=0.2,
        random_state=random_state,
        stratify=y_train_full,
    )

    candidates = _candidate_models(random_state)
    best_model_name = ""
    best_model = None
    best_val_accuracy = -1.0
    best_val_confidence = -1.0
    validation_scores: dict[str, float] = {}

    for model_name, model in candidates.items():
        model.fit(X_train, y_train)
        val_pred = model.predict(X_val)
        val_accuracy = float(accuracy_score(y_val, val_pred))

        if hasattr(model, "predict_proba"):
            val_proba = model.predict_proba(X_val)
            val_confidence = float(np.mean(np.max(val_proba, axis=1))) if len(val_proba) else 0.0
        else:
            val_confidence = 0.0

        validation_scores[f"val_accuracy_{model_name}"] = val_accuracy
        if (
            val_accuracy > best_val_accuracy
            or (abs(val_accuracy - best_val_accuracy) < 1e-9 and val_confidence > best_val_confidence)
        ):
            best_val_accuracy = val_accuracy
            best_val_confidence = val_confidence
            best_model_name = model_name
            best_model = model

    if best_model is None:
        raise RuntimeError("No candidate model was trained successfully.")

    best_model.fit(X_train_full, y_train_full)
    y_pred = best_model.predict(X_test)
    y_proba = best_model.predict_proba(X_test) if hasattr(best_model, "predict_proba") else np.array([])
    test_confidence = float(np.mean(np.max(y_proba, axis=1))) if len(y_proba) else 0.0

    metrics: dict[str, Any] = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "avg_confidence": test_confidence,
        "best_model_name": best_model_name,
        "best_model_validation_accuracy": best_val_accuracy,
        "train_rows": int(len(X_train_full)),
        "test_rows": int(len(X_test)),
    }
    metrics.update(validation_scores)
    return best_model, metrics


def train_and_save_image_models(
    concern_dataset_path: Path,
    skin_type_dataset_path: Path,
    model_artifact_path: Path,
    random_state: int = 42,
    max_images_per_class: int = 650,
    near_duplicate_hamming: int = 2,
    min_image_dim: int = 64,
) -> dict[str, Any]:
    concern_X, concern_y, concern_counts, concern_dedupe_stats = _collect_image_dataset(
        concern_dataset_path,
        normalize_concern_label,
        max_images_per_class=max_images_per_class,
        near_duplicate_hamming=near_duplicate_hamming,
        min_image_dim=min_image_dim,
    )

    skin_type_train_dir = skin_type_dataset_path / "train"
    skin_type_valid_dir = skin_type_dataset_path / "valid"

    skin_X_parts: list[np.ndarray] = []
    skin_y_parts: list[np.ndarray] = []
    skin_counts: dict[str, int] = {}
    skin_dedupe_stats = {
        "skipped_copy_named": 0,
        "skipped_invalid_files": 0,
        "skipped_small_images": 0,
        "skipped_exact_duplicates": 0,
        "skipped_near_duplicates": 0,
    }
    shared_exact_hashes: dict[str, set[str]] = {}
    shared_ahashes: dict[str, list[int]] = {}

    for split_dir in [skin_type_train_dir, skin_type_valid_dir]:
        if not split_dir.exists():
            continue
        split_X, split_y, split_counts, split_dedupe_stats = _collect_image_dataset(
            split_dir,
            normalize_skin_type_label,
            max_images_per_class=max_images_per_class,
            near_duplicate_hamming=near_duplicate_hamming,
            min_image_dim=min_image_dim,
            shared_exact_hashes=shared_exact_hashes,
            shared_ahashes=shared_ahashes,
        )
        skin_X_parts.append(split_X)
        skin_y_parts.append(split_y)
        for key, value in split_counts.items():
            skin_counts[key] = skin_counts.get(key, 0) + value
        for key, value in split_dedupe_stats.items():
            skin_dedupe_stats[key] = skin_dedupe_stats.get(key, 0) + value

    if not skin_X_parts:
        raise FileNotFoundError(
            f"Skin-type dataset was not found under expected folders: {skin_type_train_dir} and {skin_type_valid_dir}"
        )

    skin_X = np.vstack(skin_X_parts)
    skin_y = np.concatenate(skin_y_parts)

    concern_model, concern_metrics = _train_classifier(concern_X, concern_y, random_state)
    skin_type_model, skin_type_metrics = _train_classifier(skin_X, skin_y, random_state)

    artifact = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "feature_spec": FEATURE_SPEC,
        "concern_dataset_path": str(concern_dataset_path),
        "skin_type_dataset_path": str(skin_type_dataset_path),
        "concern_class_counts": concern_counts,
        "skin_type_class_counts": skin_counts,
        "concern_dedupe_stats": concern_dedupe_stats,
        "skin_type_dedupe_stats": skin_dedupe_stats,
        "training_params": {
            "random_state": random_state,
            "max_images_per_class": max_images_per_class,
            "near_duplicate_hamming": near_duplicate_hamming,
            "min_image_dim": min_image_dim,
        },
        "concern_model": concern_model,
        "skin_type_model": skin_type_model,
        "metrics": {
            "concern_accuracy": concern_metrics["accuracy"],
            "concern_avg_confidence": concern_metrics["avg_confidence"],
            "concern_best_model": concern_metrics["best_model_name"],
            "concern_best_model_validation_accuracy": concern_metrics["best_model_validation_accuracy"],
            "skin_type_accuracy": skin_type_metrics["accuracy"],
            "skin_type_avg_confidence": skin_type_metrics["avg_confidence"],
            "skin_type_best_model": skin_type_metrics["best_model_name"],
            "skin_type_best_model_validation_accuracy": skin_type_metrics["best_model_validation_accuracy"],
            "concern_train_rows": concern_metrics["train_rows"],
            "concern_test_rows": concern_metrics["test_rows"],
            "skin_type_train_rows": skin_type_metrics["train_rows"],
            "skin_type_test_rows": skin_type_metrics["test_rows"],
        },
        "validation_metrics": {
            "concern": {key: value for key, value in concern_metrics.items() if str(key).startswith("val_accuracy_")},
            "skin_type": {key: value for key, value in skin_type_metrics.items() if str(key).startswith("val_accuracy_")},
        },
    }

    model_artifact_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, model_artifact_path)
    return artifact


def load_image_model_artifact(model_artifact_path: Path) -> dict[str, Any]:
    if not model_artifact_path.exists():
        raise FileNotFoundError(f"Image model artifact not found: {model_artifact_path}")
    artifact = joblib.load(model_artifact_path)
    required_keys = {"concern_model", "skin_type_model", "metrics", "feature_spec"}
    missing = required_keys.difference(artifact.keys())
    if missing:
        raise ValueError(f"Image model artifact is invalid. Missing keys: {sorted(missing)}")
    return artifact


def predict_image_insights(artifact: dict[str, Any], image_bytes: bytes) -> dict[str, Any] | None:
    vector = extract_features_from_image_bytes(image_bytes)
    if vector is None:
        return None

    concern_model = artifact["concern_model"]
    skin_type_model = artifact["skin_type_model"]
    feature_matrix = vector.reshape(1, -1)

    concern_probs_raw = concern_model.predict_proba(feature_matrix)[0]
    concern_labels = list(concern_model.classes_)
    concern_probs = {
        normalize_concern_label(concern_labels[idx]): float(concern_probs_raw[idx])
        for idx in range(len(concern_labels))
    }

    skin_probs_raw = skin_type_model.predict_proba(feature_matrix)[0]
    skin_labels = list(skin_type_model.classes_)
    skin_probs = {
        normalize_skin_type_label(skin_labels[idx]): float(skin_probs_raw[idx])
        for idx in range(len(skin_labels))
    }

    skin_type = max(skin_probs.items(), key=lambda item: item[1])[0]
    skin_type_confidence = float(skin_probs.get(skin_type, 0.0))

    acne_prob = float(concern_probs.get("acne", 0.0))
    redness_prob = float(concern_probs.get("redness", 0.0))
    pores_prob = float(concern_probs.get("pores", 0.0))
    pigmentation_prob = float(concern_probs.get("pigmentation", 0.0))
    dark_spots_prob = float(concern_probs.get("dark_spots", 0.0))
    wrinkles_prob = float(concern_probs.get("wrinkles", 0.0))

    oily_prob = float(skin_probs.get("oily", 0.0))
    dry_prob = float(skin_probs.get("dry", 0.0))

    scores = {
        "acne": int(round(acne_prob * 5)),
        "redness": int(round(redness_prob * 5)),
        "oiliness": int(round(max(pores_prob, (acne_prob * 0.55), oily_prob) * 5)),
        "dryness": int(round(dry_prob * 5)),
        "sensitivity": int(round(max(redness_prob, dry_prob * 0.35) * 5)),
        "dehydration": int(round(dry_prob * 4.5)),
        "mature": int(round(wrinkles_prob * 5)),
        "pigmentation": int(round(pigmentation_prob * 5)),
        "dark_spots": int(round(dark_spots_prob * 5)),
        "pores": int(round(pores_prob * 5)),
        "wrinkles": int(round(wrinkles_prob * 5)),
    }
    for key in list(scores.keys()):
        scores[key] = max(0, min(5, scores[key]))

    top_concern_confidence = max(concern_probs.values()) if concern_probs else 0.0
    confidence = round(
        max(0.5, min(0.98, 0.42 + (top_concern_confidence * 0.38) + (skin_type_confidence * 0.2))),
        2,
    )

    return {
        "skin_type": skin_type,
        "skin_type_confidence": round(skin_type_confidence, 2),
        "confidence": confidence,
        "concern_probabilities": concern_probs,
        "skin_type_probabilities": skin_probs,
        "scores": scores,
    }
