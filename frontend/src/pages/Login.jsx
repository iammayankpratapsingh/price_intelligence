import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginScreen from '../components/LoginScreen.jsx';
import SliceTransition from '../components/SliceTransition.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useMediaQuery } from '../lib/useMediaQuery.js';
import { useTheme } from '../lib/theme.jsx';

/** Someone who asked for less motion gets a brief fade, not the full drive. */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Login() {
  const { authenticate, commitSession } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 960px)');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [slicing, setSlicing] = useState(false);
  const [remember, setRemember] = useState(true);

  const from = location.state?.from?.pathname || '/dashboard';

  // Runs once the halves have parted: publish the session and open the app.
  const finish = useCallback(() => {
    commitSession();
    navigate(from, { replace: true });
  }, [commitSession, navigate, from]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      // The token is stored here, but the session is only published once the
      // transition has finished — otherwise /login would redirect mid-animation.
      await authenticate(email, password, remember);
      setSlicing(true);
    } catch (err) {
      setError(err.message || 'Could not sign in.');
      setBusy(false);
    }
  };

  // The same props drive the live screen and the two inert copies that get cut,
  // so the transition starts from exactly what the user was looking at.
  const screenProps = {
    isMobile,
    dark,
    onToggleTheme: toggle,
    email,
    password,
    show,
    error,
    busy,
    onSubmit,
    onEmailChange: (e) => setEmail(e.target.value),
    onPasswordChange: (e) => setPassword(e.target.value),
    onToggleShow: () => setShow((v) => !v),
    remember,
    onRememberChange: (e) => setRemember(e.target.checked),
  };

  if (slicing) {
    return (
      <SliceTransition
        onDone={finish}
        screenProps={screenProps}
        duration={prefersReducedMotion() ? 400 : 1600}
      />
    );
  }

  return <LoginScreen {...screenProps} />;
}
