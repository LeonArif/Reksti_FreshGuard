import json
import sys
import joblib
import pandas as pd

# Muat model & scaler (pastikan path benar)
model = joblib.load("models/food_model.pkl")
scaler = joblib.load("models/scaler.pkl")

def main():
    try:
        # Baca input
        line = sys.stdin.read()
        if not line: return
        payload = json.loads(line)

        # Siapkan data sesuai FEATURES di notebook baru
        input_df = pd.DataFrame([[
            float(payload["mq135"]),
            float(payload["mq136"]),
            float(payload["temperature"]),
            float(payload["humidity"]),
            float(payload.get("minutes", 0))
        ]], columns=["Mq-135", "Mq-136", "Temperature", "Humidity", "minutes"])

        # Prediksi sekaligus
        input_scaled = scaler.transform(input_df)
        preds = model.predict(input_scaled) # Hasilnya [[tvc, rsl]]
        
        tvc_val = float(preds[0][0])
        rsl_val = float(preds[0][1])

        # Logic Class (Mapping Manual)
        class_id = 3 if tvc_val >= 5.0 else (2 if tvc_val > 4.0 else 1)
        labels = ["Safe", "Warning", "Danger"]

        result = {
            "ok": True,
            "data": {
                "tvc": tvc_val,
                "rsl_minutes": max(0, rsl_val),
                "class": class_id,
                "class_name": labels[class_id - 1]
            }
        }
        # HANYA SATU PRINT DI SINI
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))

if __name__ == "__main__":
    main()