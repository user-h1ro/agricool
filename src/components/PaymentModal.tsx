import { useState, useEffect } from 'react';
import { useRevenue } from '@/context/RevenueProvider';

interface PaymentModalProps {
  type: 'listing' | 'premium';
  onSuccess: () => void;
  onCancel: () => void;
}

type Stage = 'confirm' | 'processing' | 'success' | 'failed';

const LISTING_FEE = 20;
const PREMIUM_FEE = 99;

export default function PaymentModal({ type, onSuccess, onCancel }: PaymentModalProps) {
  const { payListingFee, subscribeToPremium } = useRevenue();
  const [stage, setStage] = useState<Stage>('confirm');
  const [gcashNumber, setGcashNumber] = useState('09');
  const [dots, setDots] = useState('');

  const amount = type === 'listing' ? LISTING_FEE : PREMIUM_FEE;
  const label = type === 'listing' ? 'Crop Listing Fee' : 'AgriCool Premium — 1 month';

  // Animate dots during processing
  useEffect(() => {
    if (stage !== 'processing') return;
    const iv = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 400);
    return () => clearInterval(iv);
  }, [stage]);

  const handlePay = async () => {
    if (gcashNumber.length < 11) {
      alert('Please enter a valid 11-digit GCash number.');
      return;
    }
    setStage('processing');
    const ok = type === 'listing' ? await payListingFee() : await subscribeToPremium();
    setStage(ok ? 'success' : 'failed');
  };

  return (
    <>
      <style>{`
        .pm-overlay {
          position: fixed; inset: 0; z-index: 99999;
          background: rgba(10,20,5,0.72);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: pmFadeIn 0.2s ease;
        }
        @keyframes pmFadeIn { from { opacity: 0 } to { opacity: 1 } }
        .pm-card {
          background: #fff;
          border-radius: 24px;
          width: 100%;
          max-width: 380px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.35);
          animation: pmSlideUp 0.25s ease;
        }
        @keyframes pmSlideUp {
          from { transform: translateY(30px); opacity: 0 }
          to { transform: translateY(0); opacity: 1 }
        }
        .pm-header {
          background: linear-gradient(135deg, #00a2e0 0%, #0074bc 100%);
          padding: 24px 24px 20px;
          color: white;
          text-align: center;
          position: relative;
        }
        .pm-gcash-logo {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -1px;
          color: white;
          font-family: 'Arial Black', sans-serif;
        }
        .pm-gcash-logo span { color: #00e5ff; }
        .pm-sim-badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.35);
          color: rgba(255,255,255,0.9);
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 20px;
          margin-top: 4px;
        }
        .pm-body { padding: 24px; }
        .pm-amount-box {
          background: #f0f9ff;
          border: 1.5px solid #bae6fd;
          border-radius: 14px;
          padding: 16px;
          text-align: center;
          margin-bottom: 20px;
        }
        .pm-amount-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .pm-amount-value { font-size: 32px; font-weight: 800; color: #0074bc; line-height: 1; }
        .pm-amount-desc { font-size: 12px; color: #64748b; margin-top: 6px; }
        .pm-input-label { font-size: 12px; color: #475569; font-weight: 600; margin-bottom: 6px; display: block; }
        .pm-input {
          width: 100%; padding: 12px 14px; border-radius: 10px;
          border: 1.5px solid #e2e8f0; font-size: 15px; font-family: monospace;
          outline: none; transition: border 0.15s;
          box-sizing: border-box;
        }
        .pm-input:focus { border-color: #0074bc; }
        .pm-info { background: #fefce8; border: 1px solid #fde68a; border-radius: 10px; padding: 10px 14px; margin: 14px 0; font-size: 12px; color: #78350f; }
        .pm-btn-pay {
          width: 100%; padding: 14px;
          border-radius: 12px; border: none;
          background: linear-gradient(135deg, #00a2e0, #0074bc);
          color: white; font-size: 15px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
          margin-top: 6px;
        }
        .pm-btn-pay:hover { background: linear-gradient(135deg, #0090cc, #0060a0); transform: translateY(-1px); }
        .pm-btn-pay:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .pm-btn-cancel {
          width: 100%; padding: 12px;
          border-radius: 12px; border: 1.5px solid #e2e8f0;
          background: transparent; color: #64748b;
          font-size: 14px; cursor: pointer; margin-top: 8px;
          transition: all 0.15s;
        }
        .pm-btn-cancel:hover { background: #f8fafc; border-color: #cbd5e1; }

        /* Processing stage */
        .pm-processing {
          padding: 40px 24px;
          text-align: center;
        }
        .pm-spinner {
          width: 56px; height: 56px;
          border: 4px solid #e0f2fe;
          border-top-color: #0074bc;
          border-radius: 50%;
          animation: pmSpin 0.8s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes pmSpin { to { transform: rotate(360deg) } }
        .pm-proc-title { font-size: 17px; font-weight: 700; color: #0f172a; }
        .pm-proc-sub { font-size: 13px; color: #64748b; margin-top: 6px; }
        .pm-steps { margin-top: 20px; }
        .pm-step { display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 13px; color: #64748b; }
        .pm-step-dot { width: 8px; height: 8px; border-radius: 50%; background: #0074bc; animation: pmPulse 1s ease infinite; }
        @keyframes pmPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }

        /* Success stage */
        .pm-success { padding: 40px 24px; text-align: center; }
        .pm-success-icon { font-size: 56px; margin-bottom: 12px; animation: pmPop 0.4s ease; }
        @keyframes pmPop { from { transform: scale(0.3); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        .pm-success-title { font-size: 20px; font-weight: 800; color: #166534; }
        .pm-success-sub { font-size: 13px; color: #64748b; margin-top: 8px; }
        .pm-receipt {
          background: #f0fdf4; border: 1px solid #bbf7d0;
          border-radius: 12px; padding: 14px; margin: 16px 0; text-align: left;
        }
        .pm-receipt-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
        .pm-receipt-label { color: #64748b; }
        .pm-receipt-val { font-weight: 600; color: #0f172a; }
        .pm-btn-done {
          width: 100%; padding: 14px; border-radius: 12px; border: none;
          background: linear-gradient(135deg, #16a34a, #15803d);
          color: white; font-size: 15px; font-weight: 700; cursor: pointer;
        }

        /* Failed stage */
        .pm-failed { padding: 40px 24px; text-align: center; }
        .pm-failed-icon { font-size: 56px; margin-bottom: 12px; }
        .pm-failed-title { font-size: 20px; font-weight: 800; color: #dc2626; }
        .pm-failed-sub { font-size: 13px; color: #64748b; margin-top: 8px; }
        .pm-btn-retry {
          width: 100%; padding: 14px; border-radius: 12px; border: none;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 16px;
        }
      `}</style>

      <div className="pm-overlay">
        <div className="pm-card">
          {/* Header always visible */}
          <div className="pm-header">
            <div className="pm-gcash-logo">G<span>Cash</span></div>
            <div className="pm-sim-badge">🔒 Simulated Payment</div>
          </div>

          {stage === 'confirm' && (
            <div className="pm-body">
              <div className="pm-amount-box">
                <div className="pm-amount-label">Amount to Pay</div>
                <div className="pm-amount-value">₱{amount}.00</div>
                <div className="pm-amount-desc">{label}</div>
              </div>

              <label className="pm-input-label">GCash Mobile Number</label>
              <input
                className="pm-input"
                type="tel"
                maxLength={11}
                placeholder="09XXXXXXXXX"
                value={gcashNumber}
                onChange={(e) => setGcashNumber(e.target.value.replace(/\D/g, ''))}
              />

              <div className="pm-info">
                ℹ️ This is a <strong>simulated payment</strong> — no real money is charged. This demonstrates how GCash integration would work in production.
              </div>

              <button className="pm-btn-pay" onClick={handlePay}>
                💙 Pay ₱{amount}.00 via GCash
              </button>
              <button className="pm-btn-cancel" onClick={onCancel}>
                Cancel
              </button>
            </div>
          )}

          {stage === 'processing' && (
            <div className="pm-processing">
              <div className="pm-spinner" />
              <div className="pm-proc-title">Processing Payment{dots}</div>
              <div className="pm-proc-sub">Please wait while we connect to GCash</div>
              <div className="pm-steps">
                <div className="pm-step"><div className="pm-step-dot" /> Verifying GCash account</div>
                <div className="pm-step"><div className="pm-step-dot" style={{animationDelay:'0.3s'}} /> Authorizing ₱{amount}.00</div>
                <div className="pm-step"><div className="pm-step-dot" style={{animationDelay:'0.6s'}} /> Confirming with AgriCool</div>
              </div>
            </div>
          )}

          {stage === 'success' && (
            <div className="pm-success">
              <div className="pm-success-icon">✅</div>
              <div className="pm-success-title">Payment Successful!</div>
              <div className="pm-success-sub">Your GCash payment has been processed</div>
              <div className="pm-receipt">
                <div className="pm-receipt-row">
                  <span className="pm-receipt-label">Reference No.</span>
                  <span className="pm-receipt-val">{Math.random().toString(36).slice(2,10).toUpperCase()}</span>
                </div>
                <div className="pm-receipt-row">
                  <span className="pm-receipt-label">Amount</span>
                  <span className="pm-receipt-val">₱{amount}.00</span>
                </div>
                <div className="pm-receipt-row">
                  <span className="pm-receipt-label">For</span>
                  <span className="pm-receipt-val">{label}</span>
                </div>
                <div className="pm-receipt-row">
                  <span className="pm-receipt-label">Status</span>
                  <span className="pm-receipt-val" style={{color:'#16a34a'}}>Completed</span>
                </div>
              </div>
              <button className="pm-btn-done" onClick={onSuccess}>
                Continue →
              </button>
            </div>
          )}

          {stage === 'failed' && (
            <div className="pm-failed">
              <div className="pm-failed-icon">❌</div>
              <div className="pm-failed-title">Payment Failed</div>
              <div className="pm-failed-sub">Something went wrong. Please try again.</div>
              <button className="pm-btn-retry" onClick={() => setStage('confirm')}>
                Try Again
              </button>
              <button className="pm-btn-cancel" style={{marginTop:'8px'}} onClick={onCancel}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}