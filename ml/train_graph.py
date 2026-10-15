import os
import json
import pandas as pd
import numpy as np
import networkx as nx
import joblib
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score, precision_recall_curve, confusion_matrix
from sklearn.model_selection import train_test_split

DATA_PATH = os.path.join('data', 'synthetic_transactions.csv')
df = pd.read_csv(DATA_PATH)

print("Building payment network graph...")
G = nx.DiGraph()
for _, row in df.iterrows():
    G.add_edge(
        row['sender_account'],
        row['receiver_account'],
        amount=float(row['amount_inr']),
        timestamp=row['timestamp']
    )

print(f"Graph constructed: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges.")

pagerank = nx.pagerank(G, alpha=0.85, max_iter=200)

node_features = {}
for node in G.nodes:
    in_deg = G.in_degree(node)
    out_deg = G.out_degree(node)
    total_deg = in_deg + out_deg
    in_out_ratio = (in_deg + 1.0) / (out_deg + 1.0)

    out_edges = G.out_edges(node, data=True)
    in_edges = G.in_edges(node, data=True)

    avg_out_amt = np.mean([d['amount'] for _, _, d in out_edges]) if out_deg > 0 else 0.0
    avg_in_amt = np.mean([d['amount'] for _, _, d in in_edges]) if in_deg > 0 else 0.0
    pr_score = pagerank.get(node, 0.0)

    node_features[node] = {
        'in_degree': in_deg,
        'out_degree': out_deg,
        'total_degree': total_deg,
        'in_out_ratio': in_out_ratio,
        'avg_out_amount': avg_out_amt,
        'avg_in_amount': avg_in_amt,
        'pagerank': pr_score,
    }

sender_feats = []
receiver_feats = []
default_feat = {'in_degree': 0, 'out_degree': 0, 'total_degree': 0, 'in_out_ratio': 1.0,
                'avg_out_amount': 0.0, 'avg_in_amount': 0.0, 'pagerank': 0.0}

for _, row in df.iterrows():
    sf = node_features.get(row['sender_account'], default_feat)
    rf = node_features.get(row['receiver_account'], default_feat)
    sender_feats.append([
        sf['in_degree'], sf['out_degree'], sf['total_degree'],
        sf['in_out_ratio'], sf['avg_out_amount'], sf['avg_in_amount'], sf['pagerank']
    ])
    receiver_feats.append([
        rf['in_degree'], rf['out_degree'], rf['total_degree'],
        rf['in_out_ratio'], rf['avg_out_amount'], rf['avg_in_amount'], rf['pagerank']
    ])

sender_feats = np.array(sender_feats, dtype=float)
receiver_feats = np.array(receiver_feats, dtype=float)

base_features_train = np.load(os.path.join('data', 'processed', 'X_train.npy'))
base_features_val = np.load(os.path.join('data', 'processed', 'X_val.npy'))
base_features_test = np.load(os.path.join('data', 'processed', 'X_test.npy'))

unique_accounts = np.array(df['sender_account'].unique(), dtype=object)
train_accounts, temp_accounts = train_test_split(unique_accounts, test_size=0.30, random_state=42)
val_accounts, test_accounts = train_test_split(temp_accounts, test_size=0.50, random_state=42)

def mask_by_accounts(accounts):
    return df['sender_account'].isin(set(accounts))

train_mask = mask_by_accounts(train_accounts)
val_mask = mask_by_accounts(val_accounts)
test_mask = mask_by_accounts(test_accounts)

graph_feats = np.hstack([sender_feats, receiver_feats])

X_train = np.hstack([base_features_train, graph_feats[train_mask]])
X_val = np.hstack([base_features_val, graph_feats[val_mask]])
X_test = np.hstack([base_features_test, graph_feats[test_mask]])

y_train = df['fraud_label'].values[train_mask]
y_val = df['fraud_label'].values[val_mask]
y_test = df['fraud_label'].values[test_mask]

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_val_scaled = scaler.transform(X_val)
X_test_scaled = scaler.transform(X_test)

logreg = LogisticRegression(max_iter=1000, C=0.5, random_state=42)
logreg.fit(X_train_scaled, y_train)

val_proba = logreg.predict_proba(X_val_scaled)[:, 1]
roc_auc = roc_auc_score(y_val, val_proba)

precisions, recalls, thresholds = precision_recall_curve(y_val, val_proba)
f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-8)
best_thresh = float(thresholds[np.argmax(f1_scores)])

val_pred = (val_proba >= best_thresh).astype(int)
cm = confusion_matrix(y_val, val_pred)
fpr = cm[0, 1] / (cm[0, 0] + cm[0, 1])

print(f"\n--- Graph-Augmented LogisticRegression (Threshold: {best_thresh:.3f}) ---")
print(f"ROC AUC: {roc_auc:.4f} | FPR: {fpr*100:.2f}%")
print(classification_report(y_val, val_pred, digits=4))

processed_dir = os.path.join('data', 'processed')
np.save(os.path.join(processed_dir, 'X_test_graph.npy'), X_test)
np.save(os.path.join(processed_dir, 'y_test_graph.npy'), y_test)

for target_dir in [os.path.join('models', 'models'), 'models']:
    os.makedirs(target_dir, exist_ok=True)
    joblib.dump(scaler, os.path.join(target_dir, 'graph_scaler.joblib'))
    joblib.dump(logreg, os.path.join(target_dir, 'graph_logreg.joblib'))

    thresh_file = os.path.join(target_dir, 'thresholds.json')
    cur_thresh = {}
    if os.path.exists(thresh_file):
        try:
            with open(thresh_file, 'r') as f:
                cur_thresh = json.load(f)
        except Exception:
            pass
    cur_thresh['graph_logreg_threshold'] = best_thresh
    with open(thresh_file, 'w') as f:
        json.dump(cur_thresh, f, indent=2)

print("Graph model, scaler, and calibrated threshold saved.")
