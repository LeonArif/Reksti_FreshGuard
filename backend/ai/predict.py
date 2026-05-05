import json
import os
import sys

import joblib
import numpy as np


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(os.path.dirname(BASE_DIR), "models")
CLASS_MODEL_PATH = os.path.join(MODELS_DIR, "class_model.pkl")
RSL_MODEL_PATH = os.path.join(MODELS_DIR, "rsl_model.pkl")

LABELS = ["Safe", "Warning", "Danger"]


def load_models():
  if not os.path.exists(CLASS_MODEL_PATH):
    raise FileNotFoundError("class_model.pkl not found in backend/models")
  if not os.path.exists(RSL_MODEL_PATH):
    raise FileNotFoundError("rsl_model.pkl not found in backend/models")
  class_payload = joblib.load(CLASS_MODEL_PATH)
  rsl_payload = joblib.load(RSL_MODEL_PATH)
  return class_payload, rsl_payload


def predict(payload):
  values = np.array(
    [[
      float(payload["mq135"]),
      float(payload["mq136"]),
      float(payload["temperature"]),
      float(payload["humidity"])
    ]]
  )

  class_payload, rsl_payload = load_models()
  class_model = class_payload["model"] if isinstance(class_payload, dict) else class_payload
  class_scaler = class_payload.get("scaler") if isinstance(class_payload, dict) else None
  class_names = class_payload.get("class_names", LABELS) if isinstance(class_payload, dict) else LABELS

  class_input = class_scaler.transform(values) if class_scaler is not None else values
  class_id = int(class_model.predict(class_input)[0])
  class_probabilities = class_model.predict_proba(class_input)[0]
  class_probabilities = {
    class_names[index]: float(probability)
    for index, probability in enumerate(class_probabilities)
  }

  rsl_model = rsl_payload["model"] if isinstance(rsl_payload, dict) else rsl_payload
  rsl_scaler = rsl_payload.get("scaler_sensors") if isinstance(rsl_payload, dict) else None

  rsl_sensors = rsl_scaler.transform(values) if rsl_scaler is not None else values
  if hasattr(rsl_model, "n_features_in_") and int(rsl_model.n_features_in_) == 5:
    class_feature = np.array([[class_id]])
    rsl_input = np.concatenate([rsl_sensors, class_feature], axis=1)
  else:
    rsl_input = rsl_sensors

  rsl_minutes = float(rsl_model.predict(rsl_input)[0])

  if class_id == 2 and rsl_minutes < 1:
    rsl_minutes = 0.0

  return {
    "class": class_id,
    "class_name": class_names[class_id] if class_id < len(class_names) else LABELS[class_id],
    "class_probabilities": class_probabilities,
    "rsl_minutes": rsl_minutes,
  }


def main():
  try:
    payload = json.load(sys.stdin)
    result = predict(payload)
    print(json.dumps({"ok": True, "data": result}))
  except Exception as exc:
    print(json.dumps({"ok": False, "error": str(exc)}))
    sys.exit(1)


if __name__ == "__main__":
  main()
