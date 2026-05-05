# Food Spoilage Prediction API

## Quick Start

### Function Signature
```python
predict_food_spoilage(mq135: float, mq136: float, temperature: float, humidity: float) -> dict
```

### Input Parameters
| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| mq135 | float | > 0 | MQ-135 gas sensor reading (ppm) |
| mq136 | float | > 0 | MQ-136 gas sensor reading (ppm) |
| temperature | float | -50 to 100 | Temperature (°C) |
| humidity | float | 0 to 100 | Humidity (%) |

### Output Format
```json
{
  "rsl_minutes": 0.0,
  "class": 2,
  "class_name": "Danger",
  "class_probabilities": {
    "Safe": 0.000069,
    "Warning": 0.000039,
    "Danger": 0.999891
  }
}
```

### Output Fields
| Field | Type | Description |
|-------|------|-------------|
| `rsl_minutes` | float | Remaining Shelf Life in minutes (0-625) |
| `class` | int | Class index (0=Safe, 1=Warning, 2=Danger) |
| `class_name` | str | Human-readable class name |
| `class_probabilities` | dict | Confidence scores for each class, keyed by `Safe`, `Warning`, and `Danger` |

---

## Usage Examples

### Example 1: Danger (High Gas Readings)
```python
result = predict_food_spoilage(
    mq135=360,
    mq136=260,
    temperature=24.0,
    humidity=55
)
# Output:
# {'rsl_minutes': 0.0, 'class_name': 'Danger', 'class_probabilities': {..., 'Danger': 0.9999}}
```

### Example 2: Warning (Medium Gas Readings)
```python
result = predict_food_spoilage(
    mq135=150,
    mq136=100,
    temperature=30.0,
    humidity=76
)
# Output:
# {'rsl_minutes': 67.24, 'class_name': 'Warning', 'class_probabilities': {..., 'Warning': 0.8058}}
```

### Example 3: Safe (Low Gas Readings)
```python
result = predict_food_spoilage(
    mq135=30,
    mq136=140,
    temperature=32.0,
    humidity=81
)
# Output:
# {'rsl_minutes': 314.45, 'class_name': 'Safe', 'class_probabilities': {..., 'Safe': 0.98}}
```

---

## Business Logic

### Class Interpretation
- **Safe (0)**: RSL = 192-625 minutes | Daging masih aman dikonsumsi
- **Warning (1)**: RSL = 1-191 minutes | Perhatian: mendekati batas pembusukan
- **Danger (2)**: RSL = 0 minutes | JANGAN dikonsumsi - sudah membusuk

### Special Cases
- **Danger + predicted RSL < 1**: Automatically set to 0 (safety margin)
- **Negative RSL predictions**: Automatically clipped to 0
- **Invalid inputs**: Returns None and prints error message

---

## Integration Notes

### Requirements
- Python 3.13+
- Libraries: numpy, pandas, scikit-learn, xgboost, pickle

### Model Files
- `models/rsl_model.pkl`: RSL regressor (trained with class feature)
- `models/class_model.pkl`: Freshness classifier

### Function Location
- Notebook: `notebooks/01_food_spoilage_integrated.ipynb` (cell: Inference)
- Can be extracted to standalone `inference.py` module for production

### Call Pattern (Batch)
```python
# Load once
models = load_prediction_models()

# Predict many samples
for row in data:
    result = predict_food_spoilage(row['mq135'], row['mq136'], row['temp'], row['humidity'])
    # Use result
```

---

## Error Handling

Function returns `None` if:
- Any input is `None`
- MQ sensors ≤ 0
- Temperature < -50 or > 100
- Humidity < 0 or > 100

Frontend should check for `None` before using result.

---

## Model Version

- **Date**: 2026-05-05
- **Features**: [Mq-135, Mq-136, Temperature, Humidity, class]
- **Test Accuracy**: 98.88% (Classifier), R² = 0.9988 (RSL Regressor)
- **Last Updated**: Embedded soft threshold for Danger class
