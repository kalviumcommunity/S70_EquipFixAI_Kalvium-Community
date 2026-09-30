import React from 'react';
import { AITroubleshootingPanel } from '../components/ai/AITroubleshootingPanel';

export const AIAssistantPage = () => {
  return (
    <div style={{
      height: 'calc(100vh - 60px)',
      width: '100%',
      backgroundColor: '#080c16',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <AITroubleshootingPanel isFullPage={true} />
    </div>
  );
};
