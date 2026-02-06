import React, { useState } from 'react';
import styleMasterHrLeave from './MasterHR.module.css';
import Lob from '../../components/Lob/Lob';
import Role from '../../components/Role/Role';
import Band from '../../components/Band/Band';
import Holiday from '../../components/Holiday/Holiday';
import TeamLead from '../../components/TeamLead/TeamLead';
import Projects from '../../pages/Projects/Projects';
import SkillsAssessment from '../../components/SkillsAssessment/SkillsAssessment';
import CapabilityDevelopmentLead from '../CapabilityDevelopmentLead/CapabilityDevelopmentLead';

const MasterHR = () => {
    const [activeTab, setActiveTab] = useState('lob');

    const renderContent = () => {
        switch (activeTab) {
            case 'Lob':
                return <Lob />;
            case 'Role':
                return <Role />;
            case 'Band':
                return <Band />;
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
                return <Lob />;
        }
    };

    return (
        <div className={styleMasterHrLeave.wrapper}>
            <div className={styleMasterHrLeave.tabContainer}>
                <button
                    className={`${styleMasterHrLeave.tabButton} ${activeTab === 'Lob' ? styleMasterHrLeave.activeTab : ''}`}
                    onClick={() => setActiveTab('Lob')}
                >
                    Lob
                </button>
                <button
                    className={`${styleMasterHrLeave.tabButton} ${activeTab === 'Role' ? styleMasterHrLeave.activeTab : ''}`}
                    onClick={() => setActiveTab('Role')}
                >
                    Role
                </button>
                <button
                    className={`${styleMasterHrLeave.tabButton} ${activeTab === 'Band' ? styleMasterHrLeave.activeTab : ''}`}
                    onClick={() => setActiveTab('Band')}
                >
                    Band
                </button>
                <button
                    className={`${styleMasterHrLeave.tabButton} ${activeTab === 'Holiday List' ? styleMasterHrLeave.activeTab : ''}`}
                    onClick={() => setActiveTab('Holiday List')}
                >
                    Holiday List
                </button>
                <button
                    className={`${styleMasterHrLeave.tabButton} ${activeTab === 'Team Lead' ? styleMasterHrLeave.activeTab : ''}`}
                    onClick={() => setActiveTab('Team Lead')}
                >
                    Team Lead
                </button>

                <button
                    className={`${styleMasterHrLeave.tabButton} ${activeTab === 'Projects' ? styleMasterHrLeave.activeTab : ''}`}
                    onClick={() => setActiveTab('Projects')}
                >
                    Projects
                </button>

                <button
                    className={`${styleMasterHrLeave.tabButton} ${activeTab === 'Skills Assessment' ? styleMasterHrLeave.activeTab : ''}`}
                    onClick={() => setActiveTab('Skills Assessment')}
                >
                    Skills Assessment
                </button>
                <button
                    className={`${styleMasterHrLeave.tabButton} ${activeTab === 'Capability Development Lead' ? styleMasterHrLeave.activeTab : ''}`}
                    onClick={() => setActiveTab('Capability Development Lead')}
                >
                    Capability Development Lead
                </button>

            </div>
            <div className={styleMasterHrLeave.contentContainer}>
                {renderContent()}
            </div>
        </div>
    );
};

export default MasterHR;
