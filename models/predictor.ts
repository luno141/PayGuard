import { spawn } from 'child_process';
import * as path from 'path';

/**
 * Transaction payload structure for PayGuard fraud detection.
 */
export interface TransactionInput {
  amount_inr: number;
  old_balance_orig?: number;
  new_balance_orig?: number;
  old_balance_dest?: number;
  new_balance_dest?: number;
  expected_merchant?: string;
  actual_beneficiary?: string;
  is_new_payee?: 0 | 1 | boolean;
  payee_txn_count_30d?: number;
  device_risk_signal?: 0 | 1 | boolean;
  message_text?: string;
  // Optional graph attributes
  sender_in_degree?: number;
  sender_out_degree?: number;
  sender_pagerank?: number;
  receiver_in_degree?: number;
  receiver_out_degree?: number;
  receiver_pagerank?: number;
}

/**
 * Structured assessment result returned by PayGuard.
 */
export interface PayGuardAssessment {
  status: 'APPROVED' | 'DECLINED' | 'FLAGGED_REVIEW';
  is_fraud: boolean;
  risk_score: number; // 0.0 to 1.0
  flags: string[];
  breakdown: {
    lightgbm_score: number;
    random_forest_score: number;
    graph_model_score: number;
    anomaly_score: number;
    is_anomaly: boolean;
  };
}

export interface PredictorOptions {
  pythonPath?: string; // e.g. "python3", "python", or absolute path to venv python
  predictorScriptPath?: string; // Path to predictor.py, defaults to same directory
  timeoutMs?: number; // Execution timeout (default 5000ms)
}

/**
 * Evaluates an incoming transaction against PayGuard's multi-model suite.
 *
 * @param transaction The payment details to verify.
 * @param options Optional custom python interpreter path or timeout.
 * @returns Promise resolving to the fraud decision and risk metrics.
 */
export function checkTransactionFraud(
  transaction: TransactionInput,
  options?: PredictorOptions
): Promise<PayGuardAssessment> {
  const pythonBin = options?.pythonPath || process.env.PYTHON_BIN || 'python3';
  const scriptPath = options?.predictorScriptPath || path.join(__dirname, 'predictor.py');
  const timeoutMs = options?.timeoutMs || 5000;

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      ...transaction,
      is_new_payee: transaction.is_new_payee ? 1 : 0,
      device_risk_signal: transaction.device_risk_signal ? 1 : 0,
    });

    const proc = spawn(pythonBin, [scriptPath, payload]);

    let stdout = '';
    let stderr = '';
    let isSettled = false;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        proc.kill();
        reject(new Error(`PayGuard prediction timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        reject(new Error(`Failed to start Python process (${pythonBin}): ${err.message}`));
      }
    });

    proc.on('close', (code) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);

      if (code !== 0) {
        return reject(new Error(`PayGuard predictor exited with code ${code}: ${stderr || stdout}`));
      }

      try {
        const parsed = JSON.parse(stdout.trim()) as PayGuardAssessment;
        resolve(parsed);
      } catch (parseErr) {
        reject(new Error(`Failed to parse PayGuard output as JSON: ${stdout}`));
      }
    });
  });
}

// Standalone CLI self-test if run directly via ts-node
if (require.main === module) {
  const sampleTxn: TransactionInput = {
    amount_inr: 4500,
    old_balance_orig: 10000,
    new_balance_orig: 5500,
    expected_merchant: 'SHOP_RETAIL_1',
    actual_beneficiary: 'MULE_TAMPER_99',
    is_new_payee: 1,
    device_risk_signal: 1,
    message_text: 'Store checkout',
  };

  console.log('Testing TypeScript PayGuard client...');
  checkTransactionFraud(sampleTxn)
    .then((res) => console.log('Result:', JSON.stringify(res, null, 2)))
    .catch((err) => console.error('Error:', err));
}
