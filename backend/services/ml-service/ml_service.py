import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
import math
from typing import Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel
from catboost import CatBoostRegressor, Pool, CatBoostClassifier
from pytorch_tabnet.tab_model import TabNetRegressor

models = {}
blend_info = {}
FEATURE_NAMES = []
CAT_FEATURES = set()

def load_all_models():
    try:
        cb = CatBoostRegressor()
        cb.load_model("model_cb_stable.cbm")
    except:
        cb = CatBoostClassifier()
        cb.load_model("model_cb_stable.cbm")

    lgbm = joblib.load("model_lgbm_stable.pkl")

    xg = xgb.Booster()
    xg.load_model("model_xgb_stable.json")

    tab = TabNetRegressor()
    tab.load_model("model_tabnet_stable.zip.zip")

    blend = joblib.load("blend_info.pkl")

    return cb, lgbm, xg, tab, blend

@asynccontextmanager
async def lifespan(app: FastAPI):
    global models, blend_info, FEATURE_NAMES, CAT_FEATURES

    cb, lgbm, xg, tab, blend = load_all_models()

    models["cb"] = cb
    models["lgbm"] = lgbm
    models["xgb"] = xg
    models["tab"] = tab
    blend_info = blend

    FEATURE_NAMES = list(cb.feature_names_)
    cat_indices = cb.get_cat_feature_indices()
    CAT_FEATURES = set([FEATURE_NAMES[i] for i in cat_indices])

    yield
    models.clear()

app = FastAPI(lifespan=lifespan)

class PredictRequest(BaseModel):
    features: Dict[str, Any]

def build_row(features: Dict[str, Any]) -> Dict[str, Any]:
    row: Dict[str, Any] = {}
    for name in FEATURE_NAMES:
        val = features.get(name)
        if name in CAT_FEATURES:
            if val is None:
                row[name] = ""
            else:
                s_val = str(val)
                if s_val.lower() == "nan":
                    row[name] = ""
                elif s_val.endswith(".0"):
                    row[name] = s_val[:-2]
                else:
                    row[name] = s_val
        else:
            if val is None:
                row[name] = 0.0
            elif isinstance(val, str):
                v = val.replace(",", ".").strip()
                if v == "" or v.lower() == "nan":
                    row[name] = 0.0
                else:
                    try:
                        row[name] = float(v)
                    except:
                        row[name] = 0.0
            else:
                try:
                    if isinstance(val, (int, float)) and math.isnan(float(val)):
                         row[name] = 0.0
                    else:
                         row[name] = float(val)
                except:
                    row[name] = 0.0
    return row

def prepare_data(row_dict):
    df = pd.DataFrame([row_dict], columns=FEATURE_NAMES)

    X_stable = df.copy()

    X_numeric = df.copy()
    X_tab_df = df.copy()

    for col in FEATURE_NAMES:
        if col in CAT_FEATURES:
            X_numeric[col] = X_numeric[col].astype("category")
            X_tab_df[col] = X_tab_df[col].astype("category").cat.codes

    X_tab = X_tab_df.values.astype(np.float32)

    return X_stable, X_numeric, X_tab

def compute_ensemble(X_stable, X_lgbm_st, X_tab):
    w = np.asarray(blend_info["weights"])

    pool_cb = Pool(X_stable, cat_features=list(CAT_FEATURES))
    pred_cb = np.expm1(models["cb"].predict(pool_cb))

    pred_lgbm = np.expm1(models["lgbm"].predict(X_lgbm_st))

    dtest = xgb.DMatrix(X_lgbm_st, enable_categorical=True)
    pred_xgb = np.expm1(models["xgb"].predict(dtest, iteration_range=(0, blend_info["xgb_best_iteration"] + 1)))

    pred_tab = np.expm1(models["tab"].predict(X_tab).ravel())

    if np.ndim(pred_cb) == 0:
        pred_matrix = np.array([[pred_cb, pred_lgbm[0], pred_xgb[0], pred_tab[0]]])
    else:
        pred_matrix = np.column_stack([pred_cb, pred_lgbm, pred_xgb, pred_tab])

    blended = pred_matrix @ w
    return float(blended[0])

def salary_to_probability(log_salary):
    threshold = 10.5
    x = (log_salary - threshold) * 2.0
    try:
        prob = 1 / (1 + math.exp(-x))
    except OverflowError:
        prob = 0.0 if x > 0 else 1.0
    return prob

@app.post("/predict")
def predict(request: PredictRequest):
    row = build_row(request.features)
    X_stable, X_lgbm_st, X_tab = prepare_data(row)

    try:
        predicted_salary_rub = compute_ensemble(X_stable, X_lgbm_st, X_tab)
    except:
        pool_cb = Pool(pd.DataFrame([row], columns=FEATURE_NAMES), cat_features=list(CAT_FEATURES))
        raw_log = models["cb"].predict(pool_cb)
        predicted_salary_rub = math.exp(raw_log[0])

    safe_salary = max(predicted_salary_rub, 1.0)
    current_log_salary = math.log(safe_salary)

    p1 = salary_to_probability(current_log_salary)
    decision = "APPROVE" if p1 >= 0.6 else "REJECT"

    return {
        "approvalProbability": round(p1, 4),
        "decision": decision,
        "predictedSalary": round(predicted_salary_rub, 2)
    }

@app.post("/shap")
def shap(request: PredictRequest):
    row = build_row(request.features)
    df = pd.DataFrame([row], columns=FEATURE_NAMES)
    pool = Pool(df, cat_features=list(CAT_FEATURES))

    shap_matrix = models["cb"].get_feature_importance(
        data=pool,
        type="ShapValues",
        prettified=False,
    )

    shap_row = shap_matrix[0]
    shap_values_only = shap_row[:-1]
    base_value = float(shap_row[-1])

    shap_dict = {
        name: float(val)
        for name, val in zip(FEATURE_NAMES, shap_values_only)
        if abs(val) > 0.0001
    }

    return {
        "baseValue": base_value,
        "shapValues": shap_dict,
    }