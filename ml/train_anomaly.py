import os
import json
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix

X_train = np.load(os.path.join('data', 'processed', 'X_train.npy'))
y_train = np.load(os.path.join('data', 'processed', 'y_train.npy'))
X_val = np.load(os.path.join('data', 'processed', 'X_val.npy'))
y_val = np.load(os.path.join('data', 'processed', 'y_val.npy'))

X_train_legit = X_train[y_train == 0]

print(f"Training IsolationForest on {len(X_train_legit)} legitimate transactions...")

iso = IsolationForest(
    n_estimators=150,
    max_samples=0.8,
    contamination='auto',
    random_state=42,
    n_jobs=-1
)
iso.fit(X_train_legit)

val_scores = -iso.decision_function(X_val)

# Calibrate against normal distribution (96.5th percentile ~3.5% FPR)
val_scores_normal = val_scores[y_val == 0]
calibrated_threshold = float(np.percentile(val_scores_normal, 96.5))

val_pred = (val_scores >= calibrated_threshold).astype(int)
cm = confusion_matrix(y_val, val_pred)
actual_fpr = cm[0, 1] / (cm[0, 0] + cm[0, 1])
roc_auc = roc_auc_score(y_val, val_scores)

print(f"\n--- IsolationForest Anomaly (Threshold: {calibrated_threshold:.4f}) ---")
print(f"ROC AUC: {roc_auc:.4f} | FPR: {actual_fpr*100:.2f}%")
print(classification_report(y_val, val_pred, digits=4, zero_division=0))

for target_dir in [os.path.join('models', 'models'), 'models']:
    os.makedirs(target_dir, exist_ok=True)
    joblib.dump(iso, os.path.join(target_dir, 'isolation_forest.joblib'))

    thresh_file = os.path.join(target_dir, 'thresholds.json')
    cur_thresh = {}
    if os.path.exists(thresh_file):
        try:
            with open(thresh_file, 'r') as f:
                cur_thresh = json.load(f)
        except Exception:
            pass
    cur_thresh['isolation_forest_threshold'] = calibrated_threshold
    with open(thresh_file, 'w') as f:
        json.dump(cur_thresh, f, indent=2)

print("IsolationForest model and calibrated threshold saved.")
