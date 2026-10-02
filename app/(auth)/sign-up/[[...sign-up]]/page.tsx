'use client';
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center p-4">
      <SignUp />
    </div>
  );
}