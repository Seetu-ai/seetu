import { LoginForm } from './login-form';

interface LoginPageProps {
  searchParams: Promise<{
    redirect?: string | string[];
  }>;
}

function normalizeRedirect(target?: string | string[]) {
  const value = Array.isArray(target) ? target[0] : target;

  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect } = await searchParams;

  return <LoginForm redirectTo={normalizeRedirect(redirect)} />;
}
