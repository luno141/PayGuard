import os
import pandas as pd
import numpy as np
import json
from sklearn.model_selection import train_test_split

DATA_PATH = os.path.join('data', 'synthetic_transactions.csv')
df = pd.read_csv(DATA_PATH)

df['amount_inr'] = df['amount_inr'].astype(float)
df['log_amount'] = np.log1p(df['amount_inr'])
df['old_balance_orig'] = df['old_balance_orig'].astype(float)
df['new_balance_orig'] = df['new_balance_orig'].astype(float)
df['old_balance_dest'] = df['old_balance_dest'].astype(float)
df['new_balance_dest'] = df['new_balance_dest'].astype(float)

df['balance_drain_ratio'] = np.clip(df['amount_inr'] / (df['old_balance_orig'] + 1.0), 0.0, 1.0)
df['orig_drained_to_zero'] = (df['new_balance_orig'] < 1.0).astype(float)
df['dest_zero_start'] = (df['old_balance_dest'] < 1.0).astype(float)

df['is_beneficiary_mismatch'] = (df['expected_merchant'] != df['actual_beneficiary']).astype(float)
df['is_new_payee'] = df['is_new_payee'].astype(float)
df['payee_txn_count_30d'] = df['payee_txn_count_30d'].astype(float)
df['zero_history_flag'] = (df['payee_txn_count_30d'] == 0.0).astype(float)
df['device_risk_signal'] = df['device_risk_signal'].astype(float)

REFUND_KEYWORDS = ['refund', 'cashback', 'reward', 'lottery', 'bonus', 'voucher', 'claim', 'reimbursement']
ACTION_KEYWORDS = ['approve', 'pin', 'authorize', 'urgent', 'collect', 'deposit', 'clearance', 'settlement']

msg_lower = df['message_text'].fillna('').str.lower()
df['has_refund_keyword'] = msg_lower.apply(lambda s: any(k in s for k in REFUND_KEYWORDS)).astype(float)
df['has_action_keyword'] = msg_lower.apply(lambda s: any(k in s for k in ACTION_KEYWORDS)).astype(float)
df['message_length'] = msg_lower.str.len().astype(float)

df['drain_and_new_payee'] = df['balance_drain_ratio'] * df['is_new_payee']
df['drain_and_device_risk'] = df['balance_drain_ratio'] * df['device_risk_signal']
df['mismatch_new_payee'] = df['is_beneficiary_mismatch'] * df['is_new_payee']
df['device_risk_new_payee'] = df['device_risk_signal'] * df['is_new_payee']

feature_cols = [
    'amount_inr',
    'log_amount',
    'balance_drain_ratio',
    'orig_drained_to_zero',
    'dest_zero_start',
    'is_beneficiary_mismatch',
    'is_new_payee',
    'payee_txn_count_30d',
    'zero_history_flag',
    'device_risk_signal',
    'has_refund_keyword',
    'has_action_keyword',
    'message_length',
    'drain_and_new_payee',
    'drain_and_device_risk',
    'mismatch_new_payee',
    'device_risk_new_payee'
]

X = df[feature_cols].values
y = df['fraud_label'].values

unique_accounts = np.array(df['sender_account'].unique(), dtype=object)
train_accounts, temp_accounts = train_test_split(unique_accounts, test_size=0.30, random_state=42)
val_accounts, test_accounts = train_test_split(temp_accounts, test_size=0.50, random_state=42)

def filter_by_accounts(accounts):
    return df['sender_account'].isin(set(accounts))

train_idx = filter_by_accounts(train_accounts)
val_idx = filter_by_accounts(val_accounts)
test_idx = filter_by_accounts(test_accounts)

X_train, y_train = X[train_idx], y[train_idx]
X_val, y_val = X[val_idx], y[val_idx]
X_test, y_test = X[test_idx], y[test_idx]

processed_dir = os.path.join('data', 'processed')
os.makedirs(processed_dir, exist_ok=True)
np.save(os.path.join(processed_dir, 'X_train.npy'), X_train)
np.save(os.path.join(processed_dir, 'y_train.npy'), y_train)
np.save(os.path.join(processed_dir, 'X_val.npy'), X_val)
np.save(os.path.join(processed_dir, 'y_val.npy'), y_val)
np.save(os.path.join(processed_dir, 'X_test.npy'), X_test)
np.save(os.path.join(processed_dir, 'y_test.npy'), y_test)

for target_dir in [os.path.join('models', 'models'), 'models']:
    if os.path.exists(target_dir):
        with open(os.path.join(target_dir, 'feature_names.json'), 'w') as f:
            json.dump(feature_cols, f, indent=2)

print(f"Feature engineering completed: {len(feature_cols)} features. Shapes: Train {X_train.shape}, Val {X_val.shape}, Test {X_test.shape}")
