import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Tag, message, Tooltip } from 'antd';
import { SearchOutlined, EditOutlined, SaveOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { getCookie } from '../../../util/CookieSet';
import styles from './MySkillsTab.module.css';
import { getMySkillsCapDev, getMasterSkills } from '../../../services/api';
import AddEditSkillModal from './AddEditSkillModal';

const MySkillsTab = () => {
    const [skills, setSkills] = useState([]);
    const [masterSkills, setMasterSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [editingSkill, setEditingSkill] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState(null);

    const employeeId = getCookie('employeeId');

    useEffect(() => {
        fetchSkills();
        fetchMasterSkills();
    }, []);

    const fetchSkills = async () => {
        try {
            setLoading(true);
            const response = await getMySkillsCapDev();
            const skillsData = response.data?.skills || [];
            setSkills(Array.isArray(skillsData) ? skillsData : []);
        } catch (error) {
            console.error('Error fetching skills:', error);
            message.error('Failed to load skills');
            setSkills([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterSkills = async () => {
        try {
            const response = await getMasterSkills();
            const skillsList = response.data.data || [];
            // Transform to options format
            const options = skillsList.map(skill => ({
                value: skill.skillId,
                label: skill.skillName
            }));
            setMasterSkills(options);
        } catch (err) {
            console.error('Error fetching master skills:', err);
            message.error('Failed to load available skills');
        }
    };

    const handleUpdateSelfEvaluation = async (skillId) => {
        try {
            await addUpdateSkill({
                employeeId,
                skillId,
                selfEvaluation: parseInt(editValue)
            });
            message.success('Self-evaluation updated');
            setEditingSkill(null);
            fetchSkills();
        } catch (error) {
            console.error('Error updating evaluation:', error);
            message.error('Failed to update evaluation');
        }
    };

    const handleAddSkill = () => {
        setSelectedSkill(null);
        setModalVisible(true);
    };

    const handleEditSkill = (skill) => {
        setSelectedSkill(skill);
        setModalVisible(true);
    };

    const handleModalClose = () => {
        setModalVisible(false);
        setSelectedSkill(null);
    };

    const handleModalSuccess = () => {
        fetchSkills();
    };

    const getLevelColor = (level) => {
        const colors = {
            'Beginner': 'red',
            'Intermediate': 'orange',
            'Advanced': 'green',
            'Expert': 'blue'
        };
        return colors[level] || 'default';
    };

    const columns = [
        {
            title: 'Skill Name',
            dataIndex: 'skillName',
            sorter: (a, b) => (a.skillName || '').localeCompare(b.skillName || ''),
            render: (text) => <b>{text}</b>
        },
        {
            title: 'Category',
            dataIndex: 'skillCategory',
            filters: [...new Set(skills.map(s => s.skillCategory).filter(Boolean))].map(c => ({ text: c, value: c })),
            onFilter: (value, record) => record.skillCategory === value,
            render: (category) => category ? <Tag color="blue">{category}</Tag> : '-'
        },
        {
            title: 'Level',
            dataIndex: 'skillLevel',
            filters: [
                { text: 'Beginner', value: 'Beginner' },
                { text: 'Intermediate', value: 'Intermediate' },
                { text: 'Advanced', value: 'Advanced' },
                { text: 'Expert', value: 'Expert' }
            ],
            onFilter: (value, record) => record.skillLevel === value,
            sorter: (a, b) => (a.skillLevel || '').localeCompare(b.skillLevel || ''),
            render: (level) => level ? <Tag color={getLevelColor(level)}>{level}</Tag> : '-'
        },
        {
            title: 'Self Evaluation',
            dataIndex: 'selfEvaluation',
            sorter: (a, b) => (a.selfEvaluation || 0) - (b.selfEvaluation || 0),
            render: (val) => (
                <span>
                    <span style={{ fontSize: 'larger' }}>{val || 'N/A'}</span>{val ? '/5' : ''}
                </span>
            )
        },
        {
            title: 'Eval by Others',
            dataIndex: 'scoreByLead',
            sorter: (a, b) => (a.scoreByLead || 0) - (b.scoreByLead || 0),
            render: (score) => score ? (
                <span style={{ fontWeight: 600, color: '#059669' }}>{score}/5</span>
            ) : (
                <span style={{ color: '#9ca3af' }}>-</span>
            )
        },
        {
            title: '',
            key: 'actions',
            render: (_, record) => (
                <Tooltip title="Edit Skill Details">
                    <Button
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEditSkill(record)}
                    >
                        Edit
                    </Button>
                </Tooltip>
            )
        }
    ];

    const filteredSkills = skills.filter(skill =>
        skill.skillName?.toLowerCase().includes(searchText.toLowerCase()) ||
        skill.skillCategory?.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    {/* <h2>My Skills</h2> */}
                    <p>{skills.length} skills total</p>
                </div>
            </div>

            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Input
                    placeholder="Search skills by name or category..."
                    prefix={<SearchOutlined />}
                    onChange={e => setSearchText(e.target.value)}
                    style={{ width: 400 }}
                />
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddSkill}
                >
                    Add Skill
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={filteredSkills}
                rowKey={(record, index) => index}
                loading={loading}
                pagination={{ pageSize: 10 }}
                bordered
            />

            <AddEditSkillModal
                visible={modalVisible}
                onClose={handleModalClose}
                skill={selectedSkill}
                masterSkills={masterSkills}
                onSuccess={handleModalSuccess}
            />
        </div>
    );
};

export default MySkillsTab;
