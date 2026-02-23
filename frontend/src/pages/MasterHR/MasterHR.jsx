import React, { useState } from 'react';
import styleMasterHrLeave from './MasterHR.module.css';
import Lob from '../../components/Lob/Lob';
import MasterRole from '../../components/MasterRole/MasterRole';
import SubRole from '../../components/SubRole/SubRole';
import Designation from '../../components/Band/Band'; // Reusing Band.jsx but will refactor it
import Holiday from '../../components/Holiday/Holiday';
import TeamLead from '../../components/TeamLead/TeamLead';
import Projects from '../../pages/Projects/Projects';
import SkillsAssessment from '../../components/SkillsAssessment/SkillsAssessment';
import CapabilityDevelopmentLead from '../CapabilityDevelopmentLead/CapabilityDevelopmentLead';

const MasterHR = () => {
    const [activeTab, setActiveTab] = useState('Master Role');

    const renderContent = () => {
        switch (activeTab) {
            case 'Lob':
                return <Lob />;
            case 'Master Role':
                return <MasterRole />;
            case 'Sub Role':
                return <SubRole />;
            case 'Designation':
                return <Designation />;
            case 'Holiday List':
                return <Holiday />;
            case 'Team Lead':
                return <TeamLead />;
            case 'Projects':
                return <Projects />;
            case 'Skills Assessment':
                return <SkillsAssessment />;
            case 'Capability Development Lead':
                return <CapabilityDevelopmentLead />;

            default:
                return <MasterRole />;
        }
    };

    const tabs = [
        // 'Lob',
        'Master Role',
        'Sub Role',
        'Designation',
        // 'Holiday List',
        // 'Team Lead',
        // 'Projects',
        // 'Skills Assessment',
        // 'Capability Development Lead'
    ];

    return (
        <div className={styleMasterHrLeave.wrapper}>
            <div className={styleMasterHrLeave.tabContainer}>
                {tabs.map(tab => (
                    <button
                        key={tab}
                        className={`${styleMasterHrLeave.tabButton} ${activeTab === tab ? styleMasterHrLeave.activeTab : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>
            <div className={styleMasterHrLeave.contentContainer}>
                {renderContent()}
            </div>
        </div>
    );
};

export default MasterHR;
