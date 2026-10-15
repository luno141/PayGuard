import os
import json
import random
import csv
import numpy as np
from datetime import datetime, timedelta

random.seed(42)
np.random.seed(42)

NUM_RECORDS = 35000
FRAUD_RATIO = 0.12  # 12% realistic fraud prevalence
NUM_ACCOUNTS = 1200

account_ids = [f"ACC{str(i).zfill(4)}" for i in range(1, NUM_ACCOUNTS + 1)]
MULE_ACCOUNTS = account_ids[-60:]       # 60 designated mule accounts
MERCHANT_ACCOUNTS = account_ids[0:150]   # 150 merchant accounts (high in-degree)
USER_ACCOUNTS = account_ids[150:-60]     # Normal user pool

account_balances = {acc: float(random.randint(500, 150000)) for acc in account_ids}

BENIGN_MESSAGES = [
    "Grocery store run", "Dinner with friends", "Monthly rent share",
    "Electricity bill payment", "Tea and snacks", "Pharmacy medicines",
    "Mobile recharge", "Vegetable market", "Cab ride payment",
    "Bakery purchase", "Bookstore order", "Coffee shop", "Dry cleaning",
    "Hardware items", "Gym membership", "Office lunch split",
    "Birthday gift contribution", "Gas cylinder booking", "Water bill"
]
BENIGN_REFUND_TRAPS = [
    "Refund for returned shirt from store",
    "Cashback received for credit card bill",
    "Refund from Zomato for cancelled order",
    "Flight cancellation reimbursement credit",
    "Security deposit refund from landlord",
    "Expense claim reimbursement approved"
]

FRAUD_BLATANT_MESSAGES = [
    "Approve collect request to receive pending refund of INR {amt}",
    "Instant cashback of INR {amt} ready: Enter UPI PIN to claim",
    "Utility overcharge refund INR {amt}: Authorize receipt now",
    "Claim lottery reward bonus of INR {amt} immediately",
    "Support credit voucher INR {amt} approve to deposit"
]
FRAUD_CAMOUFLAGED_MESSAGES = [
    "Payment for goods", "Personal transfer", "Urgent assistance",
    "Settlement", "Rent", "Dinner", "Services", "Bill", ""
]

def generate_record(idx):
    legit_cutoff = int(NUM_RECORDS * (1 - FRAUD_RATIO))
    is_fraud = idx >= legit_cutoff

    if not is_fraud:
        fraud_type = "none"
        fraud_label = 0
    else:
        fraud_label = 1
        rel = idx - legit_cutoff
        per_type = int((NUM_RECORDS * FRAUD_RATIO) / 3)
        if rel < per_type:
            fraud_type = "refund_collect"
        elif rel < 2 * per_type:
            fraud_type = "qr_mismatch"
        else:
            fraud_type = "mule_smurfing"

    transaction_id = f"T{str(idx+1).zfill(6)}"
    ts = datetime.now() - timedelta(days=random.randint(0, 180), seconds=random.randint(0, 86400))
    timestamp = ts.isoformat()

    # 1. LEGITIMATE
    if not is_fraud:
        sender = random.choice(USER_ACCOUNTS)
        if random.random() < 0.60:
            receiver = random.choice(MERCHANT_ACCOUNTS)
            expected_merchant = f"MERCH_{receiver}"
            actual_beneficiary = f"CORP_HOLDINGS_{random.randint(1, 30)}" if random.random() < 0.05 else expected_merchant
        else:
            receiver = random.choice(USER_ACCOUNTS)
            expected_merchant = f"P2P_{receiver}"
            actual_beneficiary = expected_merchant

        orig_bal = account_balances[sender]
        if random.random() < 0.97:
            amount = round(random.uniform(20, min(max(orig_bal * 0.4, 50), 12000)), 2)
        else:
            amount = round(min(orig_bal * random.uniform(0.7, 0.95), 85000), 2)

        is_new_payee = 1 if random.random() < 0.18 else 0
        payee_txn_count_30d = random.randint(1, 45) if is_new_payee == 0 else random.randint(0, 2)
        device_risk_signal = 1 if random.random() < 0.06 else 0

        if random.random() < 0.06:
            message_text = random.choice(BENIGN_REFUND_TRAPS)
        else:
            message_text = random.choice(BENIGN_MESSAGES)

    # 2. FRAUD
    else:
        sender = random.choice(USER_ACCOUNTS)
        receiver = random.choice(MULE_ACCOUNTS)
        orig_bal = account_balances[sender]
        is_camouflaged = random.random() < 0.30

        if fraud_type == "refund_collect":
            amount = round(random.choice([2500, 4999, 9999, 14999, 29999, 49999]) * random.uniform(0.96, 1.04), 2)
            expected_merchant = f"REFUND_DESK_{random.randint(1, 10)}"
            actual_beneficiary = f"COLLECT_{receiver}"
            if is_camouflaged:
                message_text = random.choice(FRAUD_CAMOUFLAGED_MESSAGES)
            else:
                message_text = random.choice(FRAUD_BLATANT_MESSAGES).format(amt=int(amount))

            is_new_payee = 1 if random.random() < 0.88 else 0
            payee_txn_count_30d = 0 if random.random() < 0.85 else 1
            device_risk_signal = 1 if random.random() < 0.65 else 0

        elif fraud_type == "qr_mismatch":
            amount = round(random.uniform(150, 7500), 2)
            expected_merchant = f"STORE_QR_{random.randint(1, 200)}"
            actual_beneficiary = f"MULE_BEN_{receiver}"
            message_text = "Store counter purchase" if is_camouflaged else "QR bill checkout"
            is_new_payee = 1 if random.random() < 0.85 else 0
            payee_txn_count_30d = random.randint(0, 2)
            device_risk_signal = 1 if random.random() < 0.40 else 0

        else:  # mule_smurfing
            drain_target = orig_bal * random.uniform(0.80, 0.98)
            amount = round(max(drain_target, random.uniform(15000, 95000)), 2)
            expected_merchant = f"TRANSFER_{receiver}"
            actual_beneficiary = expected_merchant
            message_text = random.choice(FRAUD_CAMOUFLAGED_MESSAGES) if is_camouflaged else "Urgent liquidity clearance"
            is_new_payee = 1 if random.random() < 0.85 else 0
            payee_txn_count_30d = 0 if random.random() < 0.90 else 1
            device_risk_signal = 1 if random.random() < 0.75 else 0

    old_balance_orig = max(orig_bal, amount)
    new_balance_orig = max(0.0, round(old_balance_orig - amount, 2))
    old_balance_dest = account_balances[receiver]
    new_balance_dest = round(old_balance_dest + amount, 2)

    account_balances[sender] = new_balance_orig
    account_balances[receiver] = new_balance_dest

    return {
        "transaction_id": transaction_id,
        "timestamp": timestamp,
        "sender_account": sender,
        "receiver_account": receiver,
        "amount_inr": amount,
        "old_balance_orig": old_balance_orig,
        "new_balance_orig": new_balance_orig,
        "old_balance_dest": old_balance_dest,
        "new_balance_dest": new_balance_dest,
        "payment_direction": "outgoing",
        "is_new_payee": is_new_payee,
        "message_text": message_text,
        "expected_merchant": expected_merchant,
        "actual_beneficiary": actual_beneficiary,
        "payee_txn_count_30d": payee_txn_count_30d,
        "device_risk_signal": device_risk_signal,
        "fraud_label": fraud_label,
        "fraud_type": fraud_type,
    }

os.makedirs('data', exist_ok=True)
csv_path = os.path.join('data', 'synthetic_transactions.csv')
fieldnames = [
    "transaction_id", "timestamp", "sender_account", "receiver_account", "amount_inr",
    "old_balance_orig", "new_balance_orig", "old_balance_dest", "new_balance_dest",
    "payment_direction", "is_new_payee", "message_text", "expected_merchant",
    "actual_beneficiary", "payee_txn_count_30d", "device_risk_signal",
    "fraud_label", "fraud_type",
]

with open(csv_path, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for i in range(NUM_RECORDS):
        writer.writerow(generate_record(i))

config = {
    "num_records": NUM_RECORDS,
    "fraud_ratio": FRAUD_RATIO,
    "camouflaged_fraud_ratio": 0.30,
    "benign_trap_ratio": 0.06,
    "paysim_mechanics": True,
    "elliptic_mechanics": True,
}
with open(os.path.join('data', 'generation_config.json'), "w") as f:
    json.dump(config, f, indent=2)

print(f"Generated {NUM_RECORDS} transactions with PaySim & Elliptic dynamics at {csv_path}.")
