import { Box, HStack, Text, IconButton, Button } from '@chakra-ui/react';
import { LuTrash2, LuPencil, LuMapPin, LuFacebook } from 'react-icons/lu';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/supabase';
import L from 'leaflet';

interface CropCardProps {
  crop: any;
  userLocation?: [number, number] | null;
  onDelete?: () => void;
  onAddToCart?: (crop: any) => void;
  onEdit?: (crop: any) => void;
}

const CropCard = ({
  crop,
  userLocation,
  onDelete,
  onAddToCart,
  onEdit,
}: CropCardProps) => {
  const { user } = useAuth();
  const isOwner = user && user.id === crop.seller_id;

  let distanceText = '';
  if (userLocation && crop.latitude && crop.longitude) {
    const dist = L.latLng(userLocation).distanceTo([crop.latitude, crop.longitude]) / 1000;
    distanceText = dist < 1
      ? `${(dist * 1000).toFixed(0)}m away`
      : `${dist.toFixed(1)}km away`;
  }

  // Build FB messenger or profile link
  const fbContact = crop.facebook || crop.contact || '';
  const isFbUrl = fbContact.startsWith('http') || fbContact.startsWith('facebook.com') || fbContact.startsWith('www.facebook');
  const fbLink = isFbUrl
    ? (fbContact.startsWith('http') ? fbContact : `https://${fbContact}`)
    : fbContact
    ? `https://www.facebook.com/${fbContact.replace(/^@/, '')}`
    : `https://www.facebook.com/messages/t/?text=${encodeURIComponent(`Hi! Interested in your ${crop.name} (${crop.quantity}) at ₱${crop.price}/${crop.unit}. Is it still available?`)}`;

  const fbDisplayName = fbContact
    ? (fbContact.replace(/^@/, '').replace(/https?:\/\/(www\.)?facebook\.com\/?/, '') || 'Message on Facebook')
    : 'Message on Facebook';

  return (
    <Box
      flex="0 0 calc(33.333% - 14px)"
      minW="280px"
      borderRadius="16px"
      overflow="hidden"
      position="relative"
      style={{
        background: 'linear-gradient(145deg, #faf8f0, #f5f0e4)',
        border: '1.5px solid #ddd0b0',
        boxShadow: '0 2px 8px rgba(80,60,20,0.08)',
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
      }}
      _hover={{
        boxShadow: '0 8px 28px rgba(80,60,20,0.16)',
        transform: 'translateY(-5px)',
        borderColor: '#bfaa80',
      }}
    >
      {/* Emoji Header */}
      <Box
        position="relative"
        h="80px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        style={{
          background: crop.bg || '#f0fdf4',
          borderBottom: '1.5px solid rgba(0,0,0,0.06)',
        }}
      >
        <Text fontSize="3rem" lineHeight="1" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))' }}>
          {crop.emoji || '🌱'}
        </Text>

        {/* Category pill */}
        <Box
          position="absolute"
          bottom={2}
          left={3}
          px={2}
          py="2px"
          borderRadius="full"
          style={{
            background: 'rgba(255,255,255,0.75)',
            border: '1px solid rgba(0,0,0,0.1)',
            fontSize: '10px',
            fontWeight: '700',
            color: '#4a3520',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            backdropFilter: 'blur(4px)',
          }}
        >
          {crop.category?.replace('_', ' ') || 'Crop'}
        </Box>

        {isOwner && (
          <HStack position="absolute" top={2} right={2} gap={1}>
            <IconButton
              aria-label="Edit listing"
              size="xs"
              onClick={(e) => { e.stopPropagation(); onEdit?.(crop); }}
              style={{
                background: '#f59e0b',
                color: 'white',
                borderRadius: '7px',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <LuPencil size={12} />
            </IconButton>
            <IconButton
              aria-label="Delete listing"
              size="xs"
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm('Delete this listing?')) {
                  const { error } = await supabase.from('crops').delete().eq('id', crop.id);
                  if (error) {
                    alert('❌ Failed to delete: ' + error.message);
                  } else {
                    onDelete?.();
                  }
                }
              }}
              style={{
                background: '#ef4444',
                color: 'white',
                borderRadius: '7px',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <LuTrash2 size={12} />
            </IconButton>
          </HStack>
        )}
      </Box>

      {/* Card Body */}
      <Box px={4} pt={3} pb={4}>
        {/* Crop name + variety */}
        <Text
          fontWeight="700"
          fontSize="lg"
          color="#2d1f0a"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          {crop.name}
        </Text>
        <Text fontSize="sm" color="#8a7a5a" mt="1px">
          {crop.variety ? `${crop.variety} • ` : ''}{crop.quantity}
        </Text>

        {/* Price */}
        <HStack mt={2} align="baseline" gap={1}>
          <Text fontWeight="800" fontSize="2xl" color="#3d5a2e" lineHeight="1">
            ₱{crop.price}
          </Text>
          <Text fontSize="13px" color="#9a8a6e">/{crop.unit}</Text>
        </HStack>

        {/* Distance + location */}
        <HStack mt={2} gap={2} flexWrap="wrap">
          {distanceText && (
            <Box
              px={2}
              py="2px"
              borderRadius="full"
              style={{
                background: '#dbeafe',
                color: '#1e40af',
                fontSize: '11px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <LuMapPin size={10} /> {distanceText}
            </Box>
          )}
          {crop.location && (
            <Text fontSize="11px" color="#9a8a6e" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <LuMapPin size={10} /> {crop.location}
            </Text>
          )}
        </HStack>

        {/* Seller row */}
        <HStack
          mt={3}
          pt={3}
          gap={2}
          align="center"
          style={{ borderTop: '1px solid #e8dfc8' }}
        >
          <Box
            w="30px"
            h="30px"
            borderRadius="full"
            flexShrink={0}
            style={{
              background: crop.avatar_bg || '#d4c5a0',
              color: crop.avatar_color || '#4a3520',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '800',
              border: '2px solid rgba(255,255,255,0.8)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}
          >
            {crop.seller?.slice(0, 2).toUpperCase() || '??'}
          </Box>
          <Box flex={1} minW={0}>
            <Text fontSize="13px" fontWeight="600" color="#3d2e1a" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {crop.seller || 'Local Farmer'}
            </Text>
            {/* Facebook link display */}
            {fbContact ? (
              <HStack gap={1} align="center">
                <LuFacebook size={11} color="#1877f2" />
                <Text fontSize="11px" color="#1877f2" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fbDisplayName.length > 20 ? fbDisplayName.slice(0, 20) + '…' : fbDisplayName}
                </Text>
              </HStack>
            ) : (
              <Text fontSize="11px" color="#9a8a6e">No Facebook provided</Text>
            )}
          </Box>
        </HStack>

        {/* Action Buttons */}
        <HStack mt={3} gap={2}>
          {isOwner ? (
            <Button
              size="sm"
              flex={1}
              onClick={() => onEdit?.(crop)}
              style={{
                background: '#f59e0b',
                color: 'white',
                borderRadius: '9px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                border: 'none',
                height: '36px',
              }}
            >
              ✏️ Edit Listing
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                flex={1}
                onClick={() => window.open(fbLink, '_blank')}
                style={{
                  background: '#1877f2',
                  color: 'white',
                  borderRadius: '9px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  border: 'none',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                }}
              >
                <LuFacebook size={14} /> Message
              </Button>

              {onAddToCart && (
                <Button
                  size="sm"
                  flex={1}
                  onClick={() => onAddToCart(crop)}
                  style={{
                    background: '#3d5a2e',
                    color: 'white',
                    borderRadius: '9px',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    border: 'none',
                    height: '36px',
                  }}
                >
                  🛒 Add to Cart
                </Button>
              )}
            </>
          )}
        </HStack>
      </Box>
    </Box>
  );
};

export default CropCard;