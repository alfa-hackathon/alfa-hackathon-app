from typing import Dict, Any, List

from fastapi import FastAPI
from pydantic import BaseModel
from catboost import CatBoostClassifier, Pool
import pandas as pd

app = FastAPI()

class PredictRequest(BaseModel):
    features: Dict[str, Any]

MODEL_PATH = "catboost_model.cbm"

# Загружаем модель
model = CatBoostClassifier()
model.load_model(MODEL_PATH)

# 1. Получаем список всех фичей в правильном порядке
FEATURE_NAMES: List[str] = list(model.feature_names_)

# 2. АВТОМАТИЧЕСКИ получаем индексы категориальных фичей и преобразуем их в имена
cat_indices = model.get_cat_feature_indices()
CAT_FEATURES = set([FEATURE_NAMES[i] for i in cat_indices])

print(f"Detected categorical features: {CAT_FEATURES}")

@app.post("/predict")
def predict(request: PredictRequest):
    row: Dict[str, Any] = {}

    for name in FEATURE_NAMES:
        # Получаем значение, если его нет — ставим дефолт (0 для чисел, "MISSING" для строк)
        # Но для надежности берем из request или None
        val = request.features.get(name)

        # Логика обработки
        if name in CAT_FEATURES:
            # Если это категория — приводим к строке
            # Если пришел None, заменяем на пустую строку или специальный маркер,
            # чтобы CatBoost не ругался
            row[name] = str(val) if val is not None else ""
        else:
            # Если это число
            if val is None:
                row[name] = 0.0
            else:
                # Если пришла строка (например "6,0"), чистим её
                if isinstance(val, str):
                    val = val.replace(',', '.').strip()
                    if val == "":
                        row[name] = 0.0
                    else:
                        try:
                            row[name] = float(val)
                        except ValueError:
                            # Если пришло слово "Начальник" в числовую колонку (что странно, но бывает)
                            # ставим 0, чтобы сервис не упал
                            row[name] = 0.0
                else:
                    # Уже число
                    row[name] = val

    df = pd.DataFrame([row])

    # Выделяем категориальные колонки, которые есть в датафрейме
    # (они должны быть там все, так как мы идем по FEATURE_NAMES)
    pool = Pool(df, cat_features=list(CAT_FEATURES))

    if hasattr(model, "predict_proba"):
        proba: List[List[float]] = model.predict_proba(pool)  # type: ignore
        p1 = float(proba[0][1])
    else:
        raw = float(model.predict(pool)[0])  # type: ignore
        p1 = max(0.0, min(1.0, raw))

    decision = "APPROVE" if p1 >= 0.5 else "REJECT"

    return {
        "approvalProbability": p1,
        "decision": decision,
    }