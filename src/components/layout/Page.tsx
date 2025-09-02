import React from 'react';

export function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <div
        className="mx-auto w-full max-w-[1536px] 3xl:max-w-[1760px] 4xl:max-w-[1960px] px-4 sm:px-5 lg:px-8"
      >
        {children}
      </div>
    </div>
  );
}

export default Page;
