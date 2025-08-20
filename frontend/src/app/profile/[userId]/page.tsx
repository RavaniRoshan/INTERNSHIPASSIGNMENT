'use client';

import { UserProfile } from '@/components/user/UserProfile';

interface ProfilePageProps {
  params: {
    userId: string;
  };
}

export default function ProfilePage({ params }: ProfilePageProps) {
  return <UserProfile userId={params.userId} />;
}