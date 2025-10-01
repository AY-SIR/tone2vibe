import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleAuth() {
      // Supabase will automatically use ?code=... to set the session
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
        navigate("/login", { replace: true });
        return;
      }

      if (data.session) {
        console.log("Login success:", data.session.user);
        navigate("/tool", { replace: true }); // go to dashboard
      } else {
        navigate("/login", { replace: true });
      }

      // Clean URL (remove ?code=...)
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    handleAuth();
  }, [navigate]);

  return <p>Finishing login...</p>;
}
