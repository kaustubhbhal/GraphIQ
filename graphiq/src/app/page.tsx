// src/app/page.tsx
import React from 'react';
import MainUI from './mainUI'; // Adjust the path if necessary
import TesterUI from './testpage'; // Adjust the path if necessary
import { Main } from 'next/document';

const Page: React.FC = () => {
  return (
    <div>
      <MainUI />
    </div>
  );
};

export default Page;
