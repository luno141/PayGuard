import os
import json
import numpy as np
import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    classification_report, confusion_matrix,
    roc_auc_score, precision_recall_curve,
    roc_curve, auc, accuracy_score, precision_score, recall_score, f1_score
)

DATA_DIR = 'data'
PROCESSED_DIR = os.path.join(DATA_DIR, 'processed')
OUTPUT_DIR = 'reports'
FIG_DIR = os.path.join(OUTPUT_DIR, 'figures')
os.makedirs(FIG_DIR, exist_ok=True)

X_test = np.load(os.path.join(PROCESSED_DIR, 'X_test.npy'))
y_test = np.load(os.path.join(PROCESSED_DIR, 'y_test.npy'))

THRESHOLDS_PATH = os.path.join('models', 'models', 'thresholds.json')
if not os.path.exists(THRESHOLDS_PATH):
    THRESHOLDS_PATH = os.path.join('models', 'thresholds.json')

thresholds = {}
if os.path.exists(THRESHOLDS_PATH):
    with open(THRESHOLDS_PATH, 'r') as f:
        thresholds = json.load(f)

MODELS_DIR = os.path.join('models', 'models')
if not os.path.exists(MODELS_DIR):
    MODELS_DIR = 'models'

def evaluate_model(name, model_path, threshold=0.5, scaler_path=None, need_scaling=False,
                   x_test_path=None, y_test_path=None, is_isolation_forest=False):
    model = joblib.load(model_path)

    X_eval_raw = np.load(x_test_path) if x_test_path else X_test
    y_eval = np.load(y_test_path) if y_test_path else y_test

    if need_scaling and scaler_path:
        scaler = joblib.load(scaler_path)
        X_eval = scaler.transform(X_eval_raw)
    else:
        X_eval = X_eval_raw

    if is_isolation_forest:
        scores = -model.decision_function(X_eval)
        y_pred = (scores >= threshold).astype(int)
    else:
        if hasattr(model, 'predict_proba'):
            scores = model.predict_proba(X_eval)[:, 1]
        else:
            scores = model.decision_function(X_eval)
        y_pred = (scores >= threshold).astype(int)

    cm = confusion_matrix(y_eval, y_pred)
    tn, fp, fn, tp = cm.ravel()
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    fdr = fp / (fp + tp) if (fp + tp) > 0 else 0.0

    acc = accuracy_score(y_eval, y_pred)
    prec = precision_score(y_eval, y_pred, zero_division=0)
    rec = recall_score(y_eval, y_pred, zero_division=0)
    f1 = f1_score(y_eval, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_eval, scores)

    precision_curve, recall_curve, _ = precision_recall_curve(y_eval, scores)
    pr_auc = auc(recall_curve, precision_curve)

    slug = name.lower().replace(' ', '_').replace('-', '_')

    # 1. Confusion Matrix
    plt.figure(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=False,
                xticklabels=['Pred Legit', 'Pred Fraud'],
                yticklabels=['Actual Legit', 'Actual Fraud'])
    plt.title(f"{name}\nThreshold={threshold:.3f} | FPR={fpr*100:.2f}%")
    plt.tight_layout()
    cm_path = os.path.join(FIG_DIR, f'{slug}_confusion.png')
    plt.savefig(cm_path, dpi=120)
    plt.close()

    # 2. ROC Curve
    fpr_curve, tpr_curve, _ = roc_curve(y_eval, scores)
    plt.figure()
    plt.plot(fpr_curve, tpr_curve, label=f'AUC = {roc_auc:.4f}')
    plt.plot([0, 1], [0, 1], '--', color='gray')
    plt.title(f'{name} - ROC Curve')
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.legend(loc='lower right')
    roc_path = os.path.join(FIG_DIR, f'{slug}_roc.png')
    plt.tight_layout()
    plt.savefig(roc_path, dpi=120)
    plt.close()

    # 3. Precision-Recall Curve
    plt.figure()
    plt.plot(recall_curve, precision_curve, label=f'PR AUC = {pr_auc:.4f}')
    plt.title(f'{name} - Precision-Recall Curve')
    plt.xlabel('Recall')
    plt.ylabel('Precision')
    plt.legend(loc='lower left')
    pr_path = os.path.join(FIG_DIR, f'{slug}_pr.png')
    plt.tight_layout()
    plt.savefig(pr_path, dpi=120)
    plt.close()

    print(f"\n================ {name} ================")
    print(f"Threshold: {threshold:.4f} | FPR: {fpr*100:.2f}% (FP={fp}, TN={tn})")
    print(f"Accuracy: {acc*100:.2f}% | Precision: {prec*100:.2f}% | Recall: {rec*100:.2f}% | F1: {f1:.4f}")
    print(f"ROC AUC: {roc_auc:.4f} | PR AUC: {pr_auc:.4f}")

    return {
        'name': name,
        'threshold': threshold,
        'accuracy': acc,
        'precision': prec,
        'recall': rec,
        'f1': f1,
        'fpr': fpr,
        'fdr': fdr,
        'fp': fp,
        'tn': tn,
        'tp': tp,
        'fn': fn,
        'roc_auc': roc_auc,
        'pr_auc': pr_auc,
        'confusion_path': cm_path,
        'roc_path': roc_path,
        'pr_path': pr_path,
    }

results = []

# 1. Random Forest
results.append(evaluate_model(
    name='RandomForest Classifier',
    model_path=os.path.join(MODELS_DIR, 'supervised_rf.joblib'),
    threshold=thresholds.get('rf_threshold', 0.36)
))

# 2. LightGBM
results.append(evaluate_model(
    name='LightGBM Classifier',
    model_path=os.path.join(MODELS_DIR, 'supervised_lgbm.joblib'),
    threshold=thresholds.get('lgbm_threshold', 0.28)
))

# 3. Isolation Forest
results.append(evaluate_model(
    name='IsolationForest Anomaly',
    model_path=os.path.join(MODELS_DIR, 'isolation_forest.joblib'),
    threshold=thresholds.get('isolation_forest_threshold', 0.062),
    is_isolation_forest=True
))

# 4. Graph Logistic Regression
results.append(evaluate_model(
    name='Graph LogisticRegression',
    model_path=os.path.join(MODELS_DIR, 'graph_logreg.joblib'),
    threshold=thresholds.get('graph_logreg_threshold', 0.90),
    scaler_path=os.path.join(MODELS_DIR, 'graph_scaler.joblib'),
    need_scaling=True,
    x_test_path=os.path.join(PROCESSED_DIR, 'X_test_graph.npy'),
    y_test_path=os.path.join(PROCESSED_DIR, 'y_test_graph.npy'),
))

report_path = os.path.join(OUTPUT_DIR, 'evaluation_report.md')
with open(report_path, 'w') as f:
    f.write('# PayGuard Model Evaluation Report (PaySim & Elliptic)\n\n')
    f.write('| Model | Accuracy | Precision | Recall | F1 Score | False Positive Rate (FPR) | ROC AUC | PR AUC |\n')
    f.write('|---|---|---|---|---|---|---|---|\n')
    for r in results:
        f.write(f"| **{r['name']}** | {r['accuracy']*100:.2f}% | {r['precision']*100:.2f}% | {r['recall']*100:.2f}% | {r['f1']:.4f} | **{r['fpr']*100:.2f}%** | {r['roc_auc']:.4f} | {r['pr_auc']:.4f} |\n")

print(f"\nEvaluation report written to {report_path}")
