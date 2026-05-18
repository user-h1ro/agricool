import { useState } from 'react';
import { useRevenue } from '@/context/RevenueProvider';

const ADS = [
  {
    id: 1,
    emoji: '🌱',
    brand: 'FarmSupply PH',
    headline: 'Premium Seeds — Up to 40% Off!',
    sub: 'High-yield rice, corn & vegetable varieties',
    cta: 'Shop Now',
    color: '#166534',
    bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
    border: '#bbf7d0',
  },
  {
    id: 2,
    emoji: '🚜',
    brand: 'AgroChem Solutions',
    headline: 'Organic Fertilizers — Free Delivery!',
    sub: 'Trusted by 10,000+ farmers across the Philippines',
    cta: 'Learn More',
    color: '#92400e',
    bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
    border: '#fde68a',
  },
  {
    id: 3,
    emoji: '💧',
    brand: 'IrriPro Systems',
    headline: 'Smart Irrigation — Save 60% Water',
    sub: 'Solar-powered drip systems for any farm size',
    cta: 'Get Quote',
    color: '#1e40af',
    bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    border: '#bfdbfe',
  },
];

export default function AdBanner() {
  const { isPremium, setPaymentModalType, setShowPaymentModal } = useRevenue();
  const [dismissed, setDismissed] = useState(false);
  const [adIdx] = useState(() => Math.floor(Math.random() * ADS.length));

  if (isPremium || dismissed) return null;

  const ad = ADS[adIdx];

  return (
    <>
      <style>{`
        .ad-wrap {
          position: relative;
          border-radius: 14px;
          border: 1.5px solid ${ad.border};
          background: ${ad.bg};
          padding: 14px 16px;
          margin: 12px 0;
          display: flex;
          align-items: center;
          gap: 14px;
          overflow: hidden;
        }
        .ad-sponsored {
          position: absolute; top: 6px; right: 36px;
          font-size: 9px; color: #94a3b8;
          letter-spacing: 0.1em; text-transform: uppercase;
        }
        .ad-dismiss {
          position: absolute; top: 4px; right: 10px;
          background: none; border: none; cursor: pointer;
          color: #94a3b8; font-size: 14px; line-height: 1;
          padding: 2px 4px;
        }
        .ad-dismiss:hover { color: #475569; }
        .ad-emoji { font-size: 32px; flex-shrink: 0; }
        .ad-content { flex: 1; min-width: 0; }
        .ad-brand { font-size: 10px; color: ${ad.color}; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 2px; }
        .ad-headline { font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.3; }
        .ad-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
        .ad-cta {
          flex-shrink: 0; padding: 7px 14px;
          border-radius: 8px; border: none;
          background: ${ad.color}; color: white;
          font-size: 12px; font-weight: 700; cursor: pointer;
          transition: opacity 0.15s;
        }
        .ad-cta:hover { opacity: 0.85; }
        .ad-upgrade {
          margin-top: 8px; padding: 8px 12px;
          background: rgba(0,0,0,0.05); border-radius: 8px;
          font-size: 11px; color: #475569; text-align: center;
        }
        .ad-upgrade-link {
          color: #16a34a; font-weight: 700; cursor: pointer;
          text-decoration: underline; background: none; border: none;
          font-size: 11px;
        }
      `}</style>
      <div className="ad-wrap">
        <span className="ad-sponsored">Sponsored</span>
        <button className="ad-dismiss" onClick={() => setDismissed(true)}>✕</button>
        <div className="ad-emoji">{ad.emoji}</div>
        <div className="ad-content">
          <div className="ad-brand">{ad.brand}</div>
          <div className="ad-headline">{ad.headline}</div>
          <div className="ad-sub">{ad.sub}</div>
        </div>
        <button className="ad-cta">{ad.cta}</button>
      </div>
      <div className="ad-upgrade">
        🌟 Tired of ads?{' '}
        <button
          className="ad-upgrade-link"
          onClick={() => { setPaymentModalType('premium'); setShowPaymentModal(true); }}
        >
          Upgrade to Premium ₱99/mo
        </button>
      </div>
    </>
  );
}
