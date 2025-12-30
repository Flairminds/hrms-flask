import React, { useState } from 'react';
import SickLeave from '../../components/sickLeave/SickLeave';
import LatencyLeave from '../../components/latency/LatencyLeave';
import styleHrLeave from './HrLeaveManagement.module.css';
import ExemptComp from '../../components/exempt/ExemptComp';

const HRLeaveComponent = () => {
  const [activeTab, setActiveTab] = useState('sick');

  const renderContent = () => {
    switch (activeTab) {
      case 'sick':
        return <SickLeave />;
      case 'latency':
        return <LatencyLeave />;
      case 'exempt':
        return <ExemptComp />;
      default:
        return <SickLeave />;
    }
  };

  return (
    <div className={styleHrLeave.wrapper}>
      <div className={styleHrLeave.tabContainer}>
        <button
          className={`${styleHrLeave.tabButton} ${activeTab === 'sick' ? styleHrLeave.activeTab : ''}`}
          onClick={() => setActiveTab('sick')}
        >
          Sick Leave
        </button>
        <button
          className={`${styleHrLeave.tabButton} ${activeTab === 'latency' ? styleHrLeave.activeTab : ''}`}
          onClick={() => setActiveTab('latency')}
        >
          Lateral Data
        </button>
        <button
          className={`${styleHrLeave.tabButton} ${activeTab === 'exempt' ? styleHrLeave.activeTab : ''}`}
          onClick={() => setActiveTab('exempt')}
        >
          Entry Exempt Data 
        </button>
      </div>
      <div className={styleHrLeave.contentContainer}>
        {renderContent()}
      </div>
    </div>
  );
};

export default HRLeaveComponent;
