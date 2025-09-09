import { useLocation } from 'react-router-dom';
import FloatingNav from './FloatingNav';

interface FloatingNavControllerProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const FloatingNavController: React.FC<FloatingNavControllerProps> = ({
  activeSection,
  onSectionChange
}) => {
  const location = useLocation();
  
  // Hide floating nav on specific routes
  const hideOnRoutes = ['/tool', '/payment', '/history', '/profile', '/analytics'];
  const shouldHide = hideOnRoutes.some(route => location.pathname.startsWith(route));
  
  if (shouldHide) {
    return null;
  }
  
  return (
    <FloatingNav 
      activeSection={activeSection}
      onSectionChange={onSectionChange}
      className="hidden sm:flex"
    />
  );
};

export default FloatingNavController;