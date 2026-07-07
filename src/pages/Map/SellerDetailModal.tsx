import { useEffect } from 'react';
import { Button, VStack, Text, Box, HStack, Badge } from '@chakra-ui/react';
import { LuMapPin, LuPhone, LuMessageCircle, LuNavigation, LuX } from 'react-icons/lu';
import { Crop } from '@/pages/MarketPlace/types';

interface SellerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  crop: Crop | null;
  distanceKm?: number | null;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

const SellerDetailModal = ({ isOpen, onClose, crop, distanceKm }: SellerDetailModalProps) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const openDirections = () => {
    if (crop?.latitude && crop?.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${crop.latitude},${crop.longitude}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  if (!crop) return null;

  return (
    <>
      {/* Backdrop — only covers the visual area, pointer-events off when closed */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 1200,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Bottom sheet panel */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1201,
          background: '#ffffff',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          boxShadow: '0 -12px 60px rgba(0,0,0,0.18)',
          maxHeight: '85vh',
          overflowY: 'auto',
          paddingBottom: '32px',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '999px', background: '#e2e8f0' }} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
          }}
        >
          <LuX size={16} />
        </button>

        {/* Content */}
        <div style={{ padding: '4px 24px 0' }}>
          {/* Emoji header */}
          <div style={{
            background: crop.bg || '#f0fdf4',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '3.5rem', lineHeight: 1, marginBottom: '8px' }}>{crop.emoji}</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1a202c' }}>{crop.name}</div>
            {crop.variety && (
              <div style={{ fontSize: '0.85rem', color: '#718096', marginTop: '2px' }}>{crop.variety}</div>
            )}
            <div style={{
              display: 'inline-block',
              marginTop: '10px',
              background: '#f0fdf4',
              color: '#276749',
              border: '1px solid #c6f6d5',
              borderRadius: '999px',
              padding: '4px 16px',
              fontSize: '1rem',
              fontWeight: 800,
            }}>
              ₱{crop.price} / {crop.unit}
            </div>
          </div>

          {/* Info rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {/* Seller */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', borderRadius: '12px', padding: '12px 16px' }}>
              <span style={{ fontSize: '1.3rem' }}>🧑‍🌾</span>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Seller</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a202c' }}>{crop.seller}</div>
              </div>
            </div>

            {/* Location */}
            {crop.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', borderRadius: '12px', padding: '12px 16px' }}>
                <LuMapPin size={18} color="#6b7280" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Location</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>{crop.location}</div>
                </div>
              </div>
            )}

            {/* Distance */}
            {distanceKm !== null && distanceKm !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px 16px' }}>
                <span style={{ fontSize: '1.2rem' }}>📍</span>
                <div>
                  <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600 }}>Distance from you</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d4ed8' }}>{formatDistance(distanceKm)}</div>
                </div>
              </div>
            )}

            {/* Quantity */}
            {crop.quantity && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', borderRadius: '12px', padding: '12px 16px' }}>
                <span style={{ fontSize: '1.3rem' }}>📦</span>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Available</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>{crop.quantity}</div>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: '16px' }} />

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {crop.facebook && (
              <button
                onClick={() => window.open(`https://m.me/${crop.facebook}`, '_blank', 'noopener,noreferrer')}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: '#32ce0e', color: 'white', border: 'none',
                  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontFamily: 'inherit',
                }}
              >
                <LuMessageCircle size={16} /> Message on Messenger
              </button>
            )}

            {crop.contact && !crop.facebook && (
              <a href={`tel:${crop.contact}`} style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: '#1a202c', color: 'white', border: 'none',
                  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontFamily: 'inherit',
                }}>
                  <LuPhone size={16} /> Call {crop.contact}
                </button>
              </a>
            )}

            {crop.latitude && crop.longitude && (
              <button
                onClick={openDirections}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: 'white', color: '#3182ce',
                  border: '1.5px solid #3182ce',
                  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontFamily: 'inherit',
                }}
              >
                <LuNavigation size={16} /> Get Directions
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SellerDetailModal;