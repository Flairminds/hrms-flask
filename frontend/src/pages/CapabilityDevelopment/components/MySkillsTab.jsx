import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Tag, message, Tooltip } from 'antd';
import { SearchOutlined, EditOutlined, SaveOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { getCookie } from '../../../util/CookieSet';
import styles from './MySkillsTab.module.css';
import { getSkillsForEmp, addUpdateSkill, getMasterSkills } from '../../../services/api';
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
            const response = await getSkillsForEmp(employeeId);
            const skillsData = response.data?.skills || response.data;
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
                value: skill.SkillId,
                label: skill.SkillName
            }));
            setMasterSkills(options);
        } catch (error) {
            console.error('Error fetching master skills:', error);
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
            dataIndex: 'SkillName',
            sorter: (a, b) => (a.SkillName || '').localeCompare(b.SkillName || ''),
            render: (text) => <b>{text}</b>
        },
        {
            title: 'Category',
            dataIndex: 'SkillCategory',
            filters: [...new Set(skills.map(s => s.SkillCategory).filter(Boolean))].map(c => ({ text: c, value: c })),
            onFilter: (value, record) => record.SkillCategory === value,
            render: (category) => category ? <Tag color="blue">{category}</Tag> : '-'
        },
        {
            title: 'Level',
            dataIndex: 'SkillLevel',
            filters: [
                { text: 'Beginner', value: 'Beginner' },
                { text: 'Intermediate', value: 'Intermediate' },
                { text: 'Advanced', value: 'Advanced' },
                { text: 'Expert', value: 'Expert' }
            ],
            onFilter: (value, record) => record.SkillLevel === value,
            sorter: (a, b) => (a.SkillLevel || '').localeCompare(b.SkillLevel || ''),
            render: (level) => level ? <Tag color={getLevelColor(level)}>{level}</Tag> : '-'
        },
        {
            title: 'Self Evaluation',
            dataIndex: 'SelfEvaluation',
            sorter: (a, b) => (a.SelfEvaluation || 0) - (b.SelfEvaluation || 0),
            render: (_, record, index) => {
                if (editingSkill === index) {
                    return (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Input
                                type="number"
                                min={1}
                                max={5}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                style={{ width: '60px' }}
                                autoFocus
                            />
                            <Button
                                type="primary"
                                size="small"
                                icon={<SaveOutlined />}
                                onClick={() => handleUpdateSelfEvaluation(record.SkillId)}
                            />
                            <Button
                                size="small"
                                icon={<CloseOutlined />}
                                onClick={() => setEditingSkill(null)}
                            />
                        </div>
                    );
                }
                return (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#059669' }}>
                            {record.SelfEvaluation || 'N/A'}/5
                        </span>
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => {
                                setEditingSkill(index);
                                setEditValue(record.SelfEvaluation || 3);
                            }}
                        />
                    </div>
                );
            }
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
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Tooltip title="Edit Skill Details">
                    <Button
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEditSkill(record)}
                    >
                        Edit Details
                    </Button>
                </Tooltip>
            )
        }
    ];

    const filteredSkills = skills.filter(skill =>
        skill.SkillName?.toLowerCase().includes(searchText.toLowerCase()) ||
        skill.SkillCategory?.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2>My Skills</h2>
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
