import React from 'react';
import { VaporwaveGame } from './components/VaporwaveGame';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <VaporwaveGame />
    </div>
  );
};

export default App;