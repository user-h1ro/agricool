import {
  VStack,
  Heading,
  Text,
  Box,
  HStack,
  Badge,
  Flex,
  IconButton,
  Input,
  Button,
  Spinner,
} from '@chakra-ui/react';
import { useAuth } from '@/context/AuthProvider';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/supabase';
import {
  LuTrash2,
  LuEye,
  LuEyeOff,
  LuPencil,
  LuCheck,
  LuX,
  LuUser,
  LuMail,
  LuShield,
  LuMapPin,
  LuPackage,
  LuLogOut,
  LuChevronRight,
  LuCamera,
  LuCreditCard,
  LuCopy,
} from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import BillingTab from '@/components/BillingTab';

// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard = ({ children, ...props }: any) => (
  <Box
    bg="white"
    border="1px solid"
    borderColor="gray.100"
    borderRadius="2xl"
    overflow="hidden"
    boxShadow="0 1px 3px rgba(0,0,0,0.05)"
    {...props}
  >
    {children}
  </Box>
);

const SectionHeader = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
  <Box px={6} py={4} borderBottom="1px solid" borderColor="gray.50">
    <HStack gap={3}>
      <Flex
        w="36px" h="36px"
        borderRadius="10px"
        bg="green.50"
        color="green.600"
        align="center"
        justify="center"
        fontSize="16px"
      >
        {icon}
      </Flex>
      <Box>
        <Text fontWeight="700" fontSize="sm" color="gray.800">{title}</Text>
        {subtitle && <Text fontSize="xs" color="gray.400">{subtitle}</Text>}
      </Box>
    </HStack>
  </Box>
);

// ─── Editable Field ───────────────────────────────────────────────────────────
const EditableField = ({
  label,
  value,
  editValue,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  onChange,
  type = 'text',
  readOnly = false,
  placeholder,
}: {
  label: string;
  value: string;
  editValue: string;
  isEditing: boolean;
  isSaving?: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onChange: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  placeholder?: string;
}) => (
  <Box py={4} px={6} borderBottom="1px solid" borderColor="gray.50" _last={{ borderBottom: 'none' }}>
    <HStack justify="space-between" align="center">
      <Box flex={1}>
        <Text fontSize="11px" fontWeight="700" color="gray.400" textTransform="uppercase" letterSpacing="wider" mb={1}>
          {label}
        </Text>
        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            type={type}
            placeholder={placeholder}
            size="sm"
            borderRadius="lg"
            borderColor="green.300"
            _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 3px rgba(22,163,74,0.1)' }}
            maxW="320px"
            autoFocus
          />
        ) : (
          <Text fontSize="sm" fontWeight="600" color={value ? 'gray.800' : 'gray.400'}>
            {value || placeholder || '—'}
          </Text>
        )}
      </Box>
      {!readOnly && (
        <HStack gap={1}>
          {isEditing ? (
            <>
              <IconButton
                size="xs"
                bg="green.500"
                color="white"
                borderRadius="full"
                onClick={onSave}
                _hover={{ bg: 'green.600' }}
                aria-label="Save"
                disabled={isSaving}
              >
                {isSaving ? <Spinner size="xs" /> : <LuCheck size={12} />}
              </IconButton>
              <IconButton
                size="xs"
                bg="gray.100"
                color="gray.500"
                borderRadius="full"
                onClick={onCancel}
                _hover={{ bg: 'gray.200' }}
                aria-label="Cancel"
                disabled={isSaving}
              >
                <LuX size={12} />
              </IconButton>
            </>
          ) : (
            <IconButton
              size="xs"
              variant="ghost"
              color="gray.400"
              borderRadius="full"
              onClick={onEdit}
              _hover={{ bg: 'green.50', color: 'green.600' }}
              aria-label="Edit"
            >
              <LuPencil size={12} />
            </IconButton>
          )}
        </HStack>
      )}
    </HStack>
  </Box>
);

// ─── Password Field Row ───────────────────────────────────────────────────────
const PasswordFieldRow = ({
  label,
  value,
  show,
  onChange,
  onToggleShow,
  placeholder,
}: {
  label: string;
  value: string;
  show: boolean;
  onChange: (v: string) => void;
  onToggleShow: () => void;
  placeholder: string;
}) => (
  <Box>
    <Text fontSize="11px" fontWeight="700" color="gray.400" textTransform="uppercase" letterSpacing="wider" mb={2}>
      {label}
    </Text>
    <HStack>
      <Input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        borderRadius="xl"
        borderColor="gray.200"
        _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 3px rgba(22,163,74,0.1)' }}
        flex={1}
      />
      <IconButton
        variant="ghost"
        color="gray.400"
        borderRadius="xl"
        onClick={onToggleShow}
        aria-label="Toggle visibility"
        _hover={{ color: 'green.600', bg: 'green.50' }}
      >
        {show ? <LuEyeOff size={16} /> : <LuEye size={16} />}
      </IconButton>
    </HStack>
  </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Profile = () => {
  const { user, logout, changePassword } = useAuth();
  const navigate = useNavigate();

  const [myListings, setMyListings] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  // Editable profile fields
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);

  // Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Modal — now also supports a 'confirm' type for delete
  const [modal, setModal] = useState<{
    type: 'success' | 'error' | 'confirm';
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  // User ID copy feedback
  const [copiedId, setCopiedId] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      showModal('error', 'Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showModal('error', 'Image must be under 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      // Normalize extension from mime type to avoid broken uploads (e.g. HEIC, no-extension)
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
      };
      const ext = mimeToExt[file.type] || 'jpg';
      const filePath = `avatars/${user.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      showModal('success', 'Profile picture updated!');
    } catch (err: any) {
      showModal('error', err.message || 'Failed to upload image');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchMyListings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('crops')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setMyListings(data);
  };

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) {
      setProfile(data);
      setEditFirstName(data.first_name || '');
      setEditLastName(data.last_name || '');
      setAvatarUrl(data.avatar_url || null);
    }
  };

  useEffect(() => {
    fetchMyListings();
    fetchProfile();
  }, [user]);

  // Auto-dismiss only for success/error, not confirm
  const showModal = (
    type: 'success' | 'error' | 'confirm',
    message: string,
    onConfirm?: () => void
  ) => {
    setModal({ type, message, onConfirm });
    if (type !== 'confirm') {
      setTimeout(() => setModal(null), 4000);
    }
  };

  const saveField = async (field: 'first_name' | 'last_name') => {
    if (!user) return;
    setSavingField(field);
    const value = field === 'first_name' ? editFirstName : editLastName;
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', user.id);
    if (!error) {
      setProfile((prev: any) => ({ ...prev, [field]: value }));
      showModal('success', 'Profile updated successfully!');
    } else {
      showModal('error', 'Failed to update profile');
    }
    setSavingField(null);
    setEditingField(null);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showModal('error', 'Please fill all password fields');
      return;
    }
    if (oldPassword === newPassword) {
      showModal('error', 'New password cannot be the same as current password');
      return;
    }
    if (newPassword !== confirmPassword) {
      showModal('error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      showModal('error', 'Password must be at least 6 characters');
      return;
    }
    setLoadingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      showModal('success', 'Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err: any) {
      // Show the actual error message from changePassword
      showModal('error', err.message || 'Failed to change password');
    } finally {
      setLoadingPassword(false);
    }
  };

  // Use modal confirmation instead of window.confirm
  const handleDelete = (id: string, name: string) => {
    showModal('confirm', `Delete "${name}" from your listings? This cannot be undone.`, async () => {
      setModal(null);
      const { error } = await supabase.from('crops').delete().eq('id', id);
      if (!error) {
        fetchMyListings();
        showModal('success', 'Listing deleted successfully');
      } else {
        showModal('error', 'Failed to delete listing');
      }
    });
  };

  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  // Safe initials — fall back to 👤 if name is empty
  const fullName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || '';

  const initials = fullName
    ? fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : null;

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long' })
    : 'N/A';

  return (
    <Box minH="100vh" bg="#e8e0c8" py={8}>
      <VStack align="stretch" maxW="680px" mx="auto" px={{ base: 4, md: 6 }} gap={5}>

        {/* ── Page Title ── */}
        <Box>
          <Text fontSize="xs" fontWeight="800" letterSpacing="widest" color="green.600" textTransform="uppercase" mb={1}>
            Account
          </Text>
          <Heading fontSize="2xl" fontWeight="900" color="#14532d" lineHeight="1.1">
            My Profile
          </Heading>
        </Box>

        {/* ── Hero Card ── */}
        <Box
          bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
          borderRadius="2xl"
          p={6}
          position="relative"
          overflow="hidden"
        >
          <Box position="absolute" top="-40px" right="-40px" w="180px" h="180px" borderRadius="full" bg="rgba(255,255,255,0.05)" />
          <Box position="absolute" bottom="-60px" right="60px" w="120px" h="120px" borderRadius="full" bg="rgba(255,255,255,0.04)" />

          <HStack gap={4} align="center">
            {/* Avatar */}
            <Box position="relative" flexShrink={0}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
              <Flex
                w="72px" h="72px"
                borderRadius="full"
                bg="rgba(255,255,255,0.15)"
                border="2.5px solid rgba(255,255,255,0.3)"
                align="center"
                justify="center"
                color="white"
                fontSize="1.6rem"
                fontWeight="800"
                letterSpacing="-1px"
                backdropFilter="blur(10px)"
                overflow="hidden"
                cursor="pointer"
                onClick={handleAvatarClick}
                opacity={uploadingAvatar ? 0.6 : 1}
                transition="opacity 0.2s"
              >
                {uploadingAvatar ? (
                  <Spinner size="md" color="white" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : initials ? (
                  initials
                ) : (
                  <Text fontSize="2rem">👤</Text>
                )}
              </Flex>
              <Flex
                position="absolute" bottom="-2px" right="-2px"
                w="22px" h="22px"
                borderRadius="full"
                bg={uploadingAvatar ? 'gray.300' : 'white'}
                align="center" justify="center"
                cursor="pointer"
                boxShadow="sm"
                onClick={handleAvatarClick}
                transition="background 0.2s"
              >
                <LuCamera size={11} color="#15803d" />
              </Flex>
            </Box>

            {/* Info */}
            <Box flex={1} minW={0}>
              <Text fontWeight="800" fontSize="xl" color="white" lineHeight="1.2"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fullName || user?.email?.split('@')[0] || 'New Farmer'}
              </Text>
              <HStack gap={2} mt={1} flexWrap="wrap">
                <Badge
                  bg="rgba(255,255,255,0.2)" color="white" borderRadius="full"
                  px={2.5} py={0.5} fontSize="10px" fontWeight="700" backdropFilter="blur(10px)"
                >
                  🌱 Active Seller
                </Badge>
              </HStack>
              <Text fontSize="xs" color="rgba(255,255,255,0.6)" mt={1.5}>Member since {memberSince}</Text>
            </Box>

            {/* Stats pill */}
            <Box
              bg="rgba(255,255,255,0.12)" borderRadius="xl" p={3}
              textAlign="center" backdropFilter="blur(10px)"
              border="1px solid rgba(255,255,255,0.15)" flexShrink={0}
            >
              <Text fontWeight="900" fontSize="xl" color="white">{myListings.length}</Text>
              <Text fontSize="10px" fontWeight="700" color="rgba(255,255,255,0.6)" textTransform="uppercase" letterSpacing="wider">
                Listings
              </Text>
            </Box>
          </HStack>
        </Box>

        {/* ── Personal Information ── */}
        <SectionCard>
          <SectionHeader icon={<LuUser size={16} />} title="Personal Information" subtitle="Update your name and details" />
          <EditableField
            label="First Name"
            value={profile?.first_name || ''}
            editValue={editFirstName}
            isEditing={editingField === 'first_name'}
            isSaving={savingField === 'first_name'}
            onEdit={() => { setEditFirstName(profile?.first_name || ''); setEditingField('first_name'); }}
            onSave={() => saveField('first_name')}
            onCancel={() => setEditingField(null)}
            onChange={setEditFirstName}
            placeholder="Enter first name"
          />
          <EditableField
            label="Last Name"
            value={profile?.last_name || ''}
            editValue={editLastName}
            isEditing={editingField === 'last_name'}
            isSaving={savingField === 'last_name'}
            onEdit={() => { setEditLastName(profile?.last_name || ''); setEditingField('last_name'); }}
            onSave={() => saveField('last_name')}
            onCancel={() => setEditingField(null)}
            onChange={setEditLastName}
            placeholder="Enter last name"
          />
        </SectionCard>

        {/* ── Account Details ── */}
        <SectionCard>
          <SectionHeader icon={<LuMail size={16} />} title="Account Details" subtitle="Your account credentials" />
          <EditableField
            label="Email Address"
            value={user?.email || ''}
            editValue={user?.email || ''}
            isEditing={false}
            onEdit={() => {}}
            onSave={() => {}}
            onCancel={() => {}}
            onChange={() => {}}
            readOnly
            placeholder="—"
          />
          {/* User ID — now a copy button instead of raw UUID display */}
          <Box py={4} px={6}>
            <Text fontSize="11px" fontWeight="700" color="gray.400" textTransform="uppercase" letterSpacing="wider" mb={2}>
              User ID
            </Text>
            <HStack gap={2}>
              <Text fontSize="xs" fontWeight="500" color="gray.400" fontFamily="mono"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                {user?.id}
              </Text>
              <IconButton
                size="xs"
                variant="ghost"
                color={copiedId ? 'green.500' : 'gray.400'}
                borderRadius="full"
                onClick={handleCopyId}
                aria-label="Copy User ID"
                _hover={{ bg: 'green.50', color: 'green.600' }}
              >
                {copiedId ? <LuCheck size={12} /> : <LuCopy size={12} />}
              </IconButton>
              {copiedId && <Text fontSize="10px" color="green.500" fontWeight="700">Copied!</Text>}
            </HStack>
          </Box>
        </SectionCard>

        {/* ── Farm Location ── */}
        <SectionCard
          cursor="pointer"
          _hover={{ borderColor: 'green.200', boxShadow: '0 4px 12px rgba(22,163,74,0.08)' }}
          transition="all 0.2s"
          onClick={() => navigate('/dashboard/profile/farm-location')}
        >
          <Box px={6} py={4}>
            <HStack justify="space-between" align="center">
              <HStack gap={3}>
                <Flex w="36px" h="36px" borderRadius="10px" bg="green.50" color="green.600" align="center" justify="center">
                  <LuMapPin size={16} />
                </Flex>
                <Box>
                  <Text fontWeight="700" fontSize="sm" color="gray.800">Default Farm Location</Text>
                  <Text fontSize="xs" color="gray.400">
                    {profile?.farm_name ? `📍 ${profile.farm_name}` : 'Set your usual selling/farm location'}
                  </Text>
                </Box>
              </HStack>
              <HStack gap={2}>
                <Badge colorScheme="green" variant="subtle" borderRadius="full" fontSize="10px" px={2}>Manage</Badge>
                <Box color="gray.400"><LuChevronRight size={16} /></Box>
              </HStack>
            </HStack>
          </Box>
        </SectionCard>

        {/* ── Change Password ── */}
        <SectionCard>
          <Box px={6} py={4} borderBottom={showPasswordForm ? '1px solid' : 'none'} borderColor="gray.50">
            <HStack justify="space-between" align="center">
              <HStack gap={3}>
                <Flex w="36px" h="36px" borderRadius="10px" bg="orange.50" color="orange.500" align="center" justify="center">
                  <LuShield size={16} />
                </Flex>
                <Box>
                  <Text fontWeight="700" fontSize="sm" color="gray.800">Change Password</Text>
                  <Text fontSize="xs" color="gray.400">Keep your account secure</Text>
                </Box>
              </HStack>
              <Button
                size="xs"
                variant={showPasswordForm ? 'solid' : 'outline'}
                colorScheme={showPasswordForm ? 'gray' : 'green'}
                borderRadius="full"
                fontWeight="700"
                onClick={() => setShowPasswordForm(!showPasswordForm)}
              >
                {showPasswordForm ? 'Cancel' : 'Update'}
              </Button>
            </HStack>
          </Box>

          {showPasswordForm && (
            <Box px={6} py={5}>
              <VStack gap={4} align="stretch">
                <PasswordFieldRow
                  label="Current Password"
                  value={oldPassword}
                  show={showOldPassword}
                  onChange={setOldPassword}
                  onToggleShow={() => setShowOldPassword(!showOldPassword)}
                  placeholder="Enter current password"
                />
                <PasswordFieldRow
                  label="New Password"
                  value={newPassword}
                  show={showNewPassword}
                  onChange={setNewPassword}
                  onToggleShow={() => setShowNewPassword(!showNewPassword)}
                  placeholder="Min. 6 characters"
                />
                <PasswordFieldRow
                  label="Confirm New Password"
                  value={confirmPassword}
                  show={showConfirmPassword}
                  onChange={setConfirmPassword}
                  onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
                  placeholder="Repeat new password"
                />
                <Button
                  bg="green.600" color="white" size="md" borderRadius="xl" fontWeight="700"
                  onClick={handleChangePassword}
                  loading={loadingPassword}
                  loadingText="Saving..."
                  _hover={{ bg: 'green.700' }}
                  mt={1}
                >
                  Save New Password
                </Button>
              </VStack>
            </Box>
          )}
        </SectionCard>

        {/* ── My Listings ── */}
        <SectionCard>
          <SectionHeader
            icon={<LuPackage size={16} />}
            title="My Listings"
            subtitle={`${myListings.length} active crop${myListings.length !== 1 ? 's' : ''} listed`}
          />

          {myListings.length === 0 ? (
            <Box px={6} py={10} textAlign="center">
              <Text fontSize="3xl" mb={3}>🌱</Text>
              <Text fontWeight="700" fontSize="sm" color="gray.500">No listings yet</Text>
              <Text fontSize="xs" color="gray.400" mt={1}>Start selling your crops on the marketplace!</Text>
            </Box>
          ) : (
            <VStack gap={0} align="stretch">
              {myListings.map((crop, i) => (
                <Box
                  key={crop.id}
                  px={6} py={4}
                  borderBottom={i < myListings.length - 1 ? '1px solid' : 'none'}
                  borderColor="gray.50"
                  _hover={{ bg: 'gray.50' }}
                  transition="background 0.15s"
                >
                  <HStack justify="space-between">
                    <HStack gap={3}>
                      <Flex
                        w="44px" h="44px" borderRadius="12px"
                        bg={crop.bg || 'green.50'} align="center" justify="center"
                        fontSize="1.3rem" flexShrink={0}
                      >
                        {crop.emoji}
                      </Flex>
                      <Box>
                        <Text fontWeight="700" fontSize="sm" color="gray.800">{crop.name}</Text>
                        <Text fontSize="xs" color="gray.400">{crop.variety} · {crop.quantity}</Text>
                        <Text fontSize="xs" color="green.600" fontWeight="700" mt={0.5}>₱{crop.price} / {crop.unit}</Text>
                      </Box>
                    </HStack>
                    <IconButton
                      size="sm"
                      bg="red.50" color="red.500" borderRadius="xl"
                      _hover={{ bg: 'red.500', color: 'white' }}
                      transition="all 0.15s"
                      onClick={() => handleDelete(crop.id, crop.name)}
                      aria-label="Delete listing"
                    >
                      <LuTrash2 size={14} />
                    </IconButton>
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
        </SectionCard>

        {/* ── Billing & Subscription ── */}
        <SectionCard>
          <SectionHeader
            icon={<LuCreditCard size={16} />}
            title="Billing & Subscription"
            subtitle="Manage your plan and transaction history"
          />
          {/* No extra padding wrapper — BillingTab has padding: 0 internally */}
          <Box px={6} py={5}>
            <BillingTab />
          </Box>
        </SectionCard>

        {/* ── Log Out ── */}
        <Box
          as="button" w="full" py={4} px={6}
          bg="white" border="1px solid" borderColor="red.100"
          borderRadius="2xl" onClick={logout} cursor="pointer"
          _hover={{ bg: 'red.50', borderColor: 'red.200' }}
          transition="all 0.2s"
        >
          <HStack justify="center" gap={2} color="red.500">
            <LuLogOut size={16} />
            <Text fontWeight="700" fontSize="sm">Log Out</Text>
          </HStack>
        </Box>

        <Box h={4} />
      </VStack>

      {/* ── Modal (success / error / confirm) ── */}
      {modal && (
        <Box
          position="fixed" top={0} left={0} right={0} bottom={0}
          bg="blackAlpha.700" zIndex={9999}
          display="flex" alignItems="center" justifyContent="center" px={4}
          onClick={() => modal.type !== 'confirm' && setModal(null)}
        >
          <Box
            bg="white" p={8} borderRadius="2xl" textAlign="center"
            maxW="360px" w="full"
            boxShadow="0 25px 60px rgba(0,0,0,0.2)"
            onClick={(e) => e.stopPropagation()}
          >
            <Text fontSize="4xl" mb={4}>
              {modal.type === 'success' ? '✅' : modal.type === 'error' ? '❌' : '🗑️'}
            </Text>
            <Heading size="md" mb={3}
              color={modal.type === 'success' ? 'green.600' : modal.type === 'error' ? 'red.600' : 'gray.800'}
            >
              {modal.type === 'success' ? 'Success!' : modal.type === 'error' ? 'Error' : 'Are you sure?'}
            </Heading>
            <Text fontSize="sm" color="gray.600" mb={6}>{modal.message}</Text>

            {modal.type === 'confirm' ? (
              <HStack gap={3}>
                <Button
                  flex={1} variant="outline" borderRadius="xl" fontWeight="700"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  flex={1} colorScheme="red" borderRadius="xl" fontWeight="700"
                  onClick={modal.onConfirm}
                >
                  Delete
                </Button>
              </HStack>
            ) : (
              <Button
                onClick={() => setModal(null)}
                colorScheme={modal.type === 'success' ? 'green' : 'red'}
                borderRadius="xl" fontWeight="700" w="full"
              >
                Got it
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Profile;