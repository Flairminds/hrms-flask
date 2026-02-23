import React from 'react';
import { Tabs, Card } from 'antd';
import styleMasterHrLeave from './MasterHR.module.css';
import Lob from '../../components/Lob/Lob';
import MasterRole from '../../components/MasterRole/MasterRole';
import SubRole from '../../components/SubRole/SubRole';
import Designation from '../../components/Band/Band';
import Holiday from '../../components/Holiday/Holiday';
import TeamLead from '../../components/TeamLead/TeamLead';
import Projects from '../../pages/Projects/Projects';
import SkillsAssessment from '../../components/SkillsAssessment/SkillsAssessment';
import CapabilityDevelopmentLead from '../CapabilityDevelopmentLead/CapabilityDevelopmentLead';
import EmailNotifications from '../../components/EmailNotifications/EmailNotifications';

const MasterHR = () => {
    const items = [
        {
            key: 'Master Role',
            label: 'Master Role',
            children: <MasterRole />,
        },
        {
            key: 'Sub Role',
            label: 'Sub Role',
            children: <SubRole />,
        },
        {
            key: 'Designation',
            label: 'Designation',
            children: <Designation />,
        },
        {
            key: 'Email Notifications',
            label: 'Email Notifications',
            children: <EmailNotifications />,
        },
        // {
        //     key: 'Lob',
        //     label: 'Lob',
        //     children: <Lob />,
        // },
        // {
        //     key: 'Holiday List',
        //     label: 'Holiday List',
        //     children: <Holiday />,
        // },
        // {
        //     key: 'Team Lead',
        //     label: 'Team Lead',
        //     children: <TeamLead />,
        // },
        // {
        //     key: 'Projects',
        //     label: 'Projects',
        //     children: <Projects />,
        // },
        // {
        //     key: 'Skills Assessment',
        //     label: 'Skills Assessment',
        //     children: <SkillsAssessment />,
        // },
        // {
        //     key: 'Capability Development Lead',
        //     label: 'Capability Development Lead',
        //     children: <CapabilityDevelopmentLead />,
        // },
    ];

    return (
        <div className={styleMasterHrLeave.wrapper}>
            <Card bordered={false} className={styleMasterHrLeave.cardContainer}>
                <Tabs defaultActiveKey="Master Role" items={items} />
            </Card>
        </div>
    );
};

export default MasterHR;
