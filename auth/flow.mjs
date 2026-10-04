// This controls sign-in steps only; it never grants database membership.
export function nextStep({user, audience, currentLevel, nextLevel, passwordSetup}) {
  if (!user) return 'signin';
  if (currentLevel !== 'aal2' && nextLevel === 'aal2') return 'mfa';
  if (passwordSetup) return 'set-password';
  if (audience === 'staff' && currentLevel !== 'aal2') return 'mfa';
  return 'signed-in';
}
export function validConfiguration(config) {
  return config?.url === 'https://omvkwiosonatswocbdgx.supabase.co'
    && /^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey);
}
