import {
  Box,
  Heading,
  VStack,
  Input,
  Button,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabase';
import { LuEye, LuEyeOff } from 'react-icons/lu';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setMessage("This reset link is invalid or has expired.");
      }
    });
  }, []);

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setMessage("✅ Password updated successfully! Redirecting...");
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2500);
    } catch (err: any) {
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
      <Box 
        bg="white" 
        p={8} 
        borderRadius="2xl" 
        boxShadow="lg" 
        maxW="420px" 
        w="full"
        border="1px solid"
        borderColor="gray.200"
      >
        <VStack gap={6}>
          <Heading size="xl" textAlign="center">Reset Your Password</Heading>
          
          <Text color="gray.600" textAlign="center">
            Enter your new password
          </Text>

          {/* New Password with Toggle */}
          <HStack w="full">
            <Input
              type={showNewPassword ? "text" : "password"}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              flex={1}
            />
            <Button variant="ghost" onClick={() => setShowNewPassword(!showNewPassword)} p={2}>
              {showNewPassword ? <LuEyeOff /> : <LuEye />}
            </Button>
          </HStack>

          {/* Confirm Password with Toggle */}
          <HStack w="full">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              flex={1}
            />
            <Button variant="ghost" onClick={() => setShowConfirmPassword(!showConfirmPassword)} p={2}>
              {showConfirmPassword ? <LuEyeOff /> : <LuEye />}
            </Button>
          </HStack>

          {message && (
            <Text 
              textAlign="center" 
              color={message.includes("✅") ? "green.600" : "red.500"}
              fontWeight="medium"
            >
              {message}
            </Text>
          )}

          <Button 
            colorScheme="green" 
            size="lg" 
            w="full" 
            onClick={handleSubmit}
            loading={loading}
          >
            Update Password
          </Button>

          <Button variant="link" onClick={() => navigate('/')}>
            Back to Login
          </Button>
        </VStack>
      </Box>
    </Box>
  );
};

export default ResetPassword;