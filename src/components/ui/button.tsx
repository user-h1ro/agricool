import { Button as ChakraButton, ButtonProps } from '@chakra-ui/react';

type ExtendedVariant =
  | 'outline'
  | 'solid'
  | 'subtle'
  | 'surface'
  | 'ghost'
  | 'plain'
  | 'primary'
  | 'secondary';

interface Props extends Omit<ButtonProps, 'variant'> {
  variant?: ExtendedVariant;
}

const variantStyles: Partial<Record<ExtendedVariant, ButtonProps>> = {
  primary: {
    bg: '#32ce0e',
    color: '#ffffff',
    _hover: { bg: '#2bb60c' },
  },
  secondary: {
    bg: '#cccccc',
    color: '#1A1A1A',
    _hover: { bg: '#bfbfbf' },
  },
};

const Button = ({ variant = 'primary', ...props }: Props) => {
  const customStyles = variantStyles[variant] ?? {};
  return (
    <ChakraButton
      variant={variant as ButtonProps['variant']}
      {...customStyles}
      {...props}
    />
  );
};

export default Button;
