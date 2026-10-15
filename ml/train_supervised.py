import os
import json
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from lightgbm import LGBMClassifier
from sklearn.metrics import classification_report, roc_auc_score, precision_recall_curve, confusion_matrix

X_train = np.load(os.path.join('data', 'processed', 'X_train.npy'))
y_train = np.load(os.path.join('data', 'processed', 'y_train.npy'))
X_val = np.load(os.path.join('data', 'processed', 'X_val.npy'))
y_val = np.load(os.path.join('data', 'processed', 'y_val.npy'))

print(f"Training supervised models on {len(X_train)} samples ({np.mean(y_train)*100:.1f}% fraud)...")

rf = RandomForestClassifier(
    n_estimators=150,
    max_depth=10,
    min_samples_split=12,
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1
)
rf.fit(X_train, y_train)

val_proba_rf = rf.predict_proba(X_val)[:, 1]
rf_auc = roc_auc_score(y_val, val_proba_rf)

precisions, recalls, thresholds = precision_recall_curve(y_val, val_proba_rf)
f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-8)
best_rf_thresh = float(thresholds[np.argmax(f1_scores)])

val_pred_rf = (val_proba_rf >= best_rf_thresh).astype(int)
cm_rf = confusion_matrix(y_val, val_pred_rf)
fpr_rf = cm_rf[0, 1] / (cm_rf[0, 0] + cm_rf[0, 1])

print(f"\n--- Random Forest (Threshold: {best_rf_thresh:.3f}) ---")
print(f"ROC AUC: {rf_auc:.4f} | FPR: {fpr_rf*100:.2f}%")
print(classification_report(y_val, val_pred_rf, digits=4))

lgbm = LGBMClassifier(
    n_estimators=150,
    learning_rate=0.04,
    num_leaves=25,
    min_child_samples=25,
    random_state=42,
    verbose=-1
)
lgbm.fit(X_train, y_train)

val_proba_lgbm = lgbm.predict_proba(X_val)[:, 1]
lgbm_auc = roc_auc_score(y_val, val_proba_lgbm)

precisions_l, recalls_l, thresholds_l = precision_recall_curve(y_val, val_proba_lgbm)
f1_l = 2 * (precisions_l * recalls_l) / (precisions_l + recalls_l + 1e-8)
best_lgbm_thresh = float(thresholds_l[np.argmax(f1_l)])

val_pred_lgbm = (val_proba_lgbm >= best_lgbm_thresh).astype(int)
cm_l = confusion_matrix(y_val, val_pred_lgbm)
fpr_lgbm = cm_l[0, 1] / (cm_l[0, 0] + cm_l[0, 1])

print(f"\n--- LightGBM (Threshold: {best_lgbm_thresh:.3f}) ---")
print(f"ROC AUC: {lgbm_auc:.4f} | FPR: {fpr_lgbm*100:.2f}%")
print(classification_report(y_val, val_pred_lgbm, digits=4))

# Save models to both models/models and models/
for target_dir in [os.path.join('models', 'models'), 'models']:
    os.makedirs(target_dir, exist_ok=True)
    joblib.dump(rf, os.path.join(target_dir, 'supervised_rf.joblib'))
    joblib.dump(lgbm, os.path.join(target_dir, 'supervised_lgbm.joblib'))

    thresh_file = os.path.join(target_dir, 'thresholds.json')
    cur_thresh = {}
    if os.path.exists(thresh_file):
        try:
            with open(thresh_file, 'r') as f:
                cur_thresh = json.load(f)
        except Exception:
            pass
    cur_thresh['rf_threshold'] = best_rf_thresh
    cur_thresh['lgbm_threshold'] = best_lgbm_thresh
    with open(thresh_file, 'w') as f:
        json.dump(cur_thresh, f, indent=2)

print("Supervised models and calibrated thresholds saved.")
