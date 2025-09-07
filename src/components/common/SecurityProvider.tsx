import React, { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const { toast } = useToast();

  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      
      // Show alert when right-click is attempted
      toast({
        title: "⚠️ Action Restricted",
        description: "Right-click is disabled for security purposes.",
        variant: "default",
        duration: 2000,
      });
      
      return false;
    };

    // Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+Shift+C
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      if (e.keyCode === 123) {
        e.preventDefault();
        toast({
          title: "Developer Tools Disabled",
          description: "Developer tools access is restricted.",
          variant: "destructive",
        });
        return false;
      }

      // Ctrl+Shift+I (Developer Tools)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        toast({
          title: " Developer Tools Disabled",
          description: "Developer tools access is restricted.",
          variant: "destructive",
        });
        return false;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        toast({
          title: "View Source Disabled",
          description: "Viewing page source is not allowed.",
          variant: "destructive",
        });
        return false;
      }

      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        e.preventDefault();
        toast({
          title: " Inspect Element Disabled",
          description: "Element inspection is not allowed.",
          variant: "destructive",
        });
        return false;
      }
    };

    // Disable text selection for security (optional)
    const disableSelection = () => {
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', disableSelection);
    document.addEventListener('dragstart', disableSelection);

    // Cleanup event listeners
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', disableSelection);
      document.removeEventListener('dragstart', disableSelection);
    };
  }, [toast]);

  return <>{children}</>;
};