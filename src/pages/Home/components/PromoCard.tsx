import { Card } from '@chakra-ui/react';
import Button from '@/components/ui/button';

const PromoCard = () => {
  return (
    <Card.Root width="320px" boxShadow={'lg'}>
      <Card.Body gap="3">
        <Card.Title mb="2">🌱 Grow with AgriCool</Card.Title>

        <Card.Description>
          Join a community of growers sharing tips, tracking progress, and
          turning everyday farming into something more rewarding.
        </Card.Description>
      </Card.Body>
      <Card.Footer justifyContent="flex-end">
        <Button width={'100%'}>Start Growing</Button>
      </Card.Footer>
    </Card.Root>
  );
};

export default PromoCard;
