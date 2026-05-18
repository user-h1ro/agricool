import { useState } from 'react';
import { useRevenue } from '@/context/RevenueProvider';
import PaymentModal from '@/components/PaymentModal';

export default function BillingTab() {
  const {
    revenue, isPremium, cancelPremium,
  } = useRevenue();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const handleUpgradeSuccess = () => {
    setShowUpgradeModal(false);
    setUpgradeSuccess(true);
    setTimeout(() => setUpgradeSuccess(false), 4000);
  };

  return (
    <>
      <style>{`
        .billing-wrap { padding: 0; max-width: 560px; }

        /* Plan card */
        .plan-card {
          border-radius: 16px;
          border: 2px solid;
          padding: 22px;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }
        .plan-card.free {
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .plan-card.premium {
          background: linear-gradient(145deg, #f0fdf4, #dcfce7);
          border-color: #86efac;
        }
        .plan-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 12px; border-radius: 20px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          margin-bottom: 10px;
        }
        .plan-badge.free { background: #f1f5f9; color: #475569; }
        .plan-badge.premium { background: #16a34a; color: white; }
        .plan-name { font-size: 22px; font-weight: 800; color: #0f172a; }
        .plan-price { font-size: 28px; font-weight: 900; color: #16a34a; margin: 4px 0; }
        .plan-price span { font-size: 14px; font-weight: 400; color: #64748b; }
        .plan-features { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
        .plan-feat { font-size: 13px; color: #475569; display: flex; align-items: center; gap: 8px; }
        .plan-feat.on { color: #166534; }
        .plan-feat.off { color: #94a3b8; text-decoration: line-through; }

        /* Credits badge */
        .credits-box {
          background: #fff7ed; border: 1.5px solid #fed7aa;
          border-radius: 12px; padding: 14px 18px;
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 20px;
        }
        .credits-label { font-size: 13px; color: #78350f; font-weight: 600; }
        .credits-count { font-size: 24px; font-weight: 900; color: #c2410c; }

        /* Buttons */
        .btn-upgrade {
          width: 100%; padding: 14px;
          border-radius: 12px; border: none;
          background: linear-gradient(135deg, #16a34a, #15803d);
          color: white; font-size: 15px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
          margin-bottom: 10px;
        }
        .btn-upgrade:hover { background: linear-gradient(135deg, #15803d, #166534); transform: translateY(-1px); }
        .btn-cancel-sub {
          width: 100%; padding: 11px;
          border-radius: 12px; border: 1.5px solid #fca5a5;
          background: transparent; color: #dc2626;
          font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .btn-cancel-sub:hover { background: #fef2f2; }

        /* Transactions */
        .tx-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .tx-empty { text-align: center; padding: 30px; color: #94a3b8; font-size: 13px; }
        .tx-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 0; border-bottom: 1px solid #f1f5f9;
        }
        .tx-item:last-child { border-bottom: none; }
        .tx-icon {
          width: 38px; height: 38px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .tx-icon.listing { background: #f0fdf4; }
        .tx-icon.subscription { background: #eff6ff; }
        .tx-info { flex: 1; }
        .tx-desc { font-size: 13px; font-weight: 600; color: #0f172a; }
        .tx-date { font-size: 11px; color: #94a3b8; margin-top: 2px; }
        .tx-amount { font-size: 14px; font-weight: 700; color: #dc2626; }
        .tx-status {
          font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 600; margin-top: 3px; display: inline-block;
        }
        .tx-status.completed { background: #f0fdf4; color: #16a34a; }

        /* Success toast */
        .upgrade-toast {
          background: linear-gradient(135deg, #16a34a, #15803d);
          color: white; border-radius: 12px; padding: 14px 18px;
          margin-bottom: 16px; font-size: 14px; font-weight: 600;
          animation: toastPop 0.3s ease;
        }
        @keyframes toastPop { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:none } }

        /* Cancel confirm */
        .cancel-confirm {
          background: #fef2f2; border: 1.5px solid #fca5a5;
          border-radius: 12px; padding: 16px; margin-bottom: 12px;
        }
        .cancel-confirm p { font-size: 13px; color: #7f1d1d; margin-bottom: 12px; }
        .cancel-actions { display: flex; gap: 8px; }
        .btn-confirm-cancel {
          flex: 1; padding: 10px; border-radius: 10px; border: none;
          background: #dc2626; color: white; font-size: 13px; font-weight: 700; cursor: pointer;
        }
        .btn-keep-premium {
          flex: 1; padding: 10px; border-radius: 10px;
          border: 1.5px solid #e2e8f0; background: white;
          color: #475569; font-size: 13px; cursor: pointer;
        }
      `}</style>

      <div className="billing-wrap">
        {upgradeSuccess && (
          <div className="upgrade-toast">
            🎉 Welcome to Premium! You now have unlimited listings and an ad-free experience.
          </div>
        )}

        {/* Current plan */}
        <div className={`plan-card ${isPremium ? 'premium' : 'free'}`}>
          <div className={`plan-badge ${isPremium ? 'premium' : 'free'}`}>
            {isPremium ? '⭐ Current Plan' : 'Current Plan'}
          </div>
          <div className="plan-name">{isPremium ? 'Premium' : 'Free'}</div>
          <div className="plan-price">
            {isPremium ? <>₱99<span>/month</span></> : <>₱0<span>/month</span></>}
          </div>
          <div className="plan-features">
            <div className={`plan-feat ${isPremium ? 'on' : 'off'}`}>
              {isPremium ? '✅' : '❌'} Ad-free experience
            </div>
            <div className={`plan-feat ${isPremium ? 'on' : 'off'}`}>
              {isPremium ? '✅' : '❌'} Unlimited crop listings
            </div>
            <div className="plan-feat on">✅ Core almanac access</div>
            <div className="plan-feat on">✅ Marketplace & map access</div>
            <div className={`plan-feat ${isPremium ? 'on' : 'off'}`}>
              {isPremium ? '✅' : '❌'} Priority support
            </div>
          </div>
        </div>

        {/* Free listing credits (free users only) */}
        {!isPremium && (
          <div className="credits-box">
            <div>
              <div className="credits-label">🌿 Free Listing Credits</div>
              <div style={{ fontSize: '12px', color: '#92400e', marginTop: '3px' }}>
                Each credit = 1 free crop post. Pay ₱20 after they run out.
              </div>
            </div>
            <div className="credits-count">{revenue.listingCredits}</div>
          </div>
        )}

        {/* Upgrade / cancel */}
        {!isPremium ? (
          <button className="btn-upgrade" onClick={() => setShowUpgradeModal(true)}>
            ⭐ Upgrade to Premium — ₱99/mo
          </button>
        ) : (
          <>
            {showCancelConfirm ? (
              <div className="cancel-confirm">
                <p>Are you sure? You'll lose ad-free access and unlimited listings immediately.</p>
                <div className="cancel-actions">
                  <button className="btn-confirm-cancel" onClick={() => { cancelPremium(); setShowCancelConfirm(false); }}>
                    Yes, Cancel
                  </button>
                  <button className="btn-keep-premium" onClick={() => setShowCancelConfirm(false)}>
                    Keep Premium
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn-cancel-sub" onClick={() => setShowCancelConfirm(true)}>
                Cancel Subscription
              </button>
            )}
          </>
        )}

        {/* Transaction history */}
        <div style={{ marginTop: '28px' }}>
          <div className="tx-title">📋 Transaction History</div>
          {revenue.transactions.length === 0 ? (
            <div className="tx-empty">No transactions yet</div>
          ) : (
            revenue.transactions.map((tx) => (
              <div className="tx-item" key={tx.id}>
                <div className={`tx-icon ${tx.type}`}>
                  {tx.type === 'listing_fee' ? '🌿' : '⭐'}
                </div>
                <div className="tx-info">
                  <div className="tx-desc">{tx.description}</div>
                  <div className="tx-date">
                    {new Date(tx.createdAt).toLocaleDateString('en-PH', {
                      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  <span className={`tx-status ${tx.status}`}>{tx.status}</span>
                </div>
                <div className="tx-amount">-₱{tx.amount}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {showUpgradeModal && (
        <PaymentModal
          type="premium"
          onSuccess={handleUpgradeSuccess}
          onCancel={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  );
}