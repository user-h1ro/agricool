import Button from '@/components/ui/button';
import { Box, HStack, Text, VStack, IconButton } from '@chakra-ui/react';
import { LuTrash2, LuPlus, LuMinus, LuMapPin, LuArrowRight, LuShoppingCart } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/supabase';
import { useAuth } from '@/context/AuthProvider';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #cdc3a0 0%, #bfb490 40%, #d0c8a8 100%)',
    padding: '28px 20px',
  } as React.CSSProperties,
  inner: {
    maxWidth: '860px',
    margin: '0 auto',
  } as React.CSSProperties,
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  } as React.CSSProperties,
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  } as React.CSSProperties,
  titleIcon: {
    width: '48px',
    height: '48px',
    background: '#2d5a1b',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6dc62a',
    fontSize: '22px',
    flexShrink: 0,
  } as React.CSSProperties,
  titleText: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: '28px',
    color: '#2d2010',
    letterSpacing: '0.01em',
    lineHeight: 1.2,
  } as React.CSSProperties,
  titleSub: {
    fontSize: '13px',
    color: '#6b4f2a',
    fontWeight: 500,
    marginTop: '2px',
  } as React.CSSProperties,
  clearBtn: {
    background: 'transparent',
    border: '1.5px solid #c8a882',
    color: '#6b4f2a',
    padding: '8px 18px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  item: {
    background: '#ffffff',
    borderRadius: '18px',
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid rgba(200,184,130,0.3)',
    boxShadow: '0 2px 12px rgba(45,26,15,0.06)',
    transition: 'box-shadow 0.2s',
  } as React.CSSProperties,
  emojiWrap: {
    width: '62px',
    height: '62px',
    borderRadius: '14px',
    background: '#eef6e6',
    border: '1.5px solid #d4ebb8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '30px',
    flexShrink: 0,
  } as React.CSSProperties,
  itemName: {
    fontWeight: 600,
    fontSize: '16px',
    color: '#1e2d10',
  } as React.CSSProperties,
  itemMeta: {
    fontSize: '13px',
    color: '#9a7a50',
    marginTop: '2px',
  } as React.CSSProperties,
  itemPrice: {
    color: '#2d7a1b',
    fontWeight: 700,
    fontSize: '15px',
    marginTop: '4px',
  } as React.CSSProperties,
  itemLocation: {
    fontSize: '12px',
    color: '#b0956a',
    marginTop: '3px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,
  qtyBtn: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    background: '#1e4a0f',
    color: '#6dc62a',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    minWidth: '30px',
  } as React.CSSProperties,
  qtyVal: {
    fontWeight: 700,
    fontSize: '16px',
    color: '#2d1f0a',
    minWidth: '24px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  itemTotal: {
    fontSize: '14px',
    color: '#2d7a1b',
    fontWeight: 700,
    textAlign: 'center' as const,
  } as React.CSSProperties,
  removeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#c8a882',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  summaryCard: {
    background: '#2d5a1b',
    borderRadius: '20px',
    padding: '24px 26px',
    marginTop: '20px',
  } as React.CSSProperties,
  summaryLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: '14px',
    fontWeight: 500,
  } as React.CSSProperties,
  summaryDivider: {
    borderTop: '1px solid rgba(255,255,255,0.12)',
    margin: '14px 0',
  } as React.CSSProperties,
  summaryTotalLabel: {
    color: '#fff',
    fontSize: '17px',
    fontWeight: 600,
  } as React.CSSProperties,
  summaryTotalAmount: {
    color: '#a4e060',
    fontSize: '30px',
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontWeight: 400,
  } as React.CSSProperties,
  checkoutBtn: {
    width: '100%',
    marginTop: '18px',
    background: '#6dc62a',
    color: '#0e2205',
    border: 'none',
    borderRadius: '14px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    letterSpacing: '0.02em',
  } as React.CSSProperties,
  badge: {
    background: 'rgba(109,198,42,0.15)',
    color: '#a4e060',
    fontSize: '12px',
    fontWeight: 600,
    padding: '3px 12px',
    borderRadius: '20px',
    border: '1px solid rgba(109,198,42,0.25)',
  } as React.CSSProperties,
  emptyWrap: {
    background: '#fff',
    borderRadius: '24px',
    padding: '60px 40px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 20px rgba(45,26,15,0.08)',
  } as React.CSSProperties,
  modal: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(20,30,10,0.6)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  modalBox: {
    background: '#f5f0e4',
    padding: '36px',
    borderRadius: '20px',
    maxWidth: '420px',
    width: '90%',
    textAlign: 'center' as const,
    boxShadow: '0 20px 60px rgba(20,30,10,0.3)',
  } as React.CSSProperties,
  modalTitle: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: '24px',
    color: '#1e2d10',
    marginBottom: '12px',
  } as React.CSSProperties,
  modalText: {
    fontSize: '15px',
    color: '#6b4f2a',
    lineHeight: 1.6,
    marginBottom: '24px',
  } as React.CSSProperties,
};

const Cart = () => {
  const [cart, setCart] = useState<any[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('agricool_cart') || '[]');
    setCart(saved);
  }, []);

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const updatedCart = [...cart];
    updatedCart[index] = { ...updatedCart[index], quantity: newQuantity };
    setCart(updatedCart);
    localStorage.setItem('agricool_cart', JSON.stringify(updatedCart));
  };

  const removeFromCart = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    localStorage.setItem('agricool_cart', JSON.stringify(newCart));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('agricool_cart');
  };

  const total = cart.reduce((sum, item) => {
    return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
  }, 0);

  const confirmOrder = async () => {
    setShowConfirm(false);
    setShowSuccess(true);

    // Fire a checkout notification to each seller for their items
    // NOTE: Only use columns that exist in the notifications table.
    // Quantity + unit are encoded in the message so the seller can parse them.
    const buyerName = user?.email?.split('@')[0] || 'A buyer';
    const notifications = cart
      .filter((item) => item.seller_id && item.seller_id !== user?.id)
      .map((item) => ({
        user_id: item.seller_id,
        type: 'checkout',
        title: '🧺 Someone checked out your crop!',
        // Message format is parsed by Notifications.tsx to extract qty + unit
        message: `${buyerName} ordered ${Number(item.quantity) || 1} ${item.unit || 'unit'} of your ${item.name}. crop_id:${item.id}`,
        is_read: false,
      }));

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    setTimeout(() => {
      clearCart();
      setShowSuccess(false);
      navigate('/dashboard/marketplace');
    }, 2800);
  };

  return (
    <div style={styles.page}>
      <div style={styles.inner}>

        {/* Header */}
        <div style={styles.pageHeader}>
          <div style={styles.titleGroup}>
            <div style={styles.titleIcon}>
              <LuShoppingCart />
            </div>
            <div>
              <div style={styles.titleText}>Your Cart</div>
              <div style={styles.titleSub}>
                {cart.length > 0 ? `${cart.length} item${cart.length !== 1 ? 's' : ''} from local farmers` : 'Fresh produce awaits'}
              </div>
            </div>
          </div>
          {cart.length > 0 && (
            <button style={styles.clearBtn} onClick={clearCart}>
              <LuTrash2 size={14} /> Clear Cart
            </button>
          )}
        </div>

        {/* Empty state */}
        {cart.length === 0 ? (
          <div style={styles.emptyWrap}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</div>
            <div style={{ ...styles.titleText, fontSize: '22px', marginBottom: '10px' }}>Your cart is empty</div>
            <div style={{ fontSize: '15px', color: '#9a7a50', marginBottom: '28px' }}>
              Add some fresh produce from local farmers!
            </div>
            <button
              style={{ ...styles.checkoutBtn, width: 'auto', padding: '13px 28px', background: '#2d5a1b', color: '#a4e060' }}
              onClick={() => navigate('/dashboard/marketplace')}
            >
              Browse Marketplace <LuArrowRight />
            </button>
          </div>
        ) : (
          <>
            {/* Cart items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {cart.map((item, index) => {
                const qty = Number(item.quantity) || 1;
                const itemTotal = (Number(item.price) || 0) * qty;

                return (
                  <div key={index} style={styles.item}>
                    <div style={styles.emojiWrap}>{item.emoji || '🌿'}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.itemName}>{item.name}</div>
                      <div style={styles.itemMeta}>{item.variety} · {item.unit}</div>
                      <div style={styles.itemPrice}>₱{item.price} / {item.unit}</div>
                      <div style={styles.itemLocation}>
                        <LuMapPin size={11} />
                        {item.location} · {item.seller}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button style={styles.qtyBtn} onClick={() => updateQuantity(index, qty - 1)}>
                          <LuMinus size={13} />
                        </button>
                        <span style={styles.qtyVal}>{qty}</span>
                        <button style={styles.qtyBtn} onClick={() => updateQuantity(index, qty + 1)}>
                          <LuPlus size={13} />
                        </button>
                      </div>
                      <span style={styles.itemTotal}>₱{itemTotal}</span>
                    </div>

                    <button
                      style={styles.removeBtn}
                      onClick={() => removeFromCart(index)}
                      aria-label="Remove item"
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff0f0'; (e.currentTarget as HTMLElement).style.color = '#d85a30'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#c8a882'; }}
                    >
                      <LuTrash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Summary card */}
            <div style={styles.summaryCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={styles.summaryLabel}>Order Summary</span>
                <span style={styles.badge}>{cart.length} seller{cart.length !== 1 ? 's' : ''}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cart.map((item, i) => {
                  const qty = Number(item.quantity) || 1;
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{item.name} × {qty}</span>
                      <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                        ₱{(Number(item.price) || 0) * qty}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={styles.summaryDivider} />

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={styles.summaryTotalLabel}>Total Amount</span>
                <span style={styles.summaryTotalAmount}>₱{total}</span>
              </div>

              <button
                style={styles.checkoutBtn}
                onClick={() => setShowConfirm(true)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#82d840'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#6dc62a'; }}
              >
                <LuArrowRight size={18} />
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧺</div>
            <div style={styles.modalTitle}>Confirm Your Order</div>
            <div style={styles.modalText}>
              Total Amount: <strong style={{ color: '#2d5a1b' }}>₱{total}</strong>
              <br /><br />
              Sellers will contact you via Facebook Messenger for payment and pickup arrangements.
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                style={{ ...styles.clearBtn, padding: '11px 22px' }}
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.checkoutBtn, width: 'auto', padding: '11px 26px', marginTop: 0 }}
                onClick={confirmOrder}
              >
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      {showSuccess && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
            <div style={{ ...styles.modalTitle, color: '#2d5a1b' }}>Order Placed!</div>
            <div style={styles.modalText}>
              Thank you for using AgriCool!<br />
              The farmers will contact you soon via Facebook Messenger.
            </div>
            <button
              style={{ ...styles.checkoutBtn, width: 'auto', padding: '12px 28px', margin: '0 auto' }}
              onClick={() => navigate('/dashboard/marketplace')}
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;