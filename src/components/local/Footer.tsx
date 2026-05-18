import { HStack, Heading, Image } from '@chakra-ui/react';
import LayoutContainer from '../ui/layourContainer';
import agriCoolImage from '@/assets/agricool_logo.svg';

const Footer = () => {
  return (
    <LayoutContainer>
      <HStack width={'100%'} justifyContent={"space-between"} as={'footer'}>
        <HStack alignItems={'center'} py="10px">
          <Image src={agriCoolImage} width="10px" />
          <Heading size="lg">AgriCool</Heading>
        </HStack>
        <div>
          <p>
            © {new Date().getFullYear()} AgriCool. Made for Filipino growers.
          </p>
        </div>
      </HStack>
    </LayoutContainer>
  );
};

export default Footer;
