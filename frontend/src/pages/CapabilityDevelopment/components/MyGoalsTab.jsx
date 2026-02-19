import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Tag, Tooltip } from 'antd';
import { SearchOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { getMyGoals, updateGoalDetails, updateGoalProgress, deleteGoal } from '../../../services/api';
import CreateGoalModal from './CreateGoalModal';
import { toast } from 'react-toastify';
import styles from './MySkillsTab.module.css';

const STATUS_COLOR = {
    pending: 'orange',
    in_progress: 'blue',
    completed: 'green',
};

const STATUS_LABEL = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
};

const MyGoalsTab = () => {
    const [allGoals, setAllGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState(null); // null = create mode

    useEffect(() => {
        fetchGoals();
    }, []);

    const fetchGoals = async () => {
        try {
            setLoading(true);
            const response = await getMyGoals();
            const skillGoals = response.data.skillDevelopment || [];
            const otherGoals = response.data.other || [];
            setAllGoals([...skillGoals, ...otherGoals]);
        } catch (error) {
            console.error('Error fetching goals:', error);
            toast.error('Failed to load goals');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setSelectedGoal(null);
        setModalVisible(true);
    };

    const openView = (goal) => {
        setSelectedGoal(goal);
        setModalVisible(true);
    };

    const handleClose = () => {
        setModalVisible(false);
        setSelectedGoal(null);
    };

    const columns = [
        {
            title: 'Goal Title',
            dataIndex: 'title',
            sorter: (a, b) => (a.title || '').localeCompare(b.title || ''),
            render: (text) => <b>{text}</b>,
        },
        {
            title: 'Type',
            dataIndex: 'type',
            filters: [...new Set(allGoals.map(g => g.type).filter(Boolean))].map(t => ({ text: t, value: t })),
            onFilter: (value, record) => record.type === value,
            render: (type) => type ? <Tag color="purple">{type}</Tag> : '-',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            filters: [
                { text: 'Pending', value: 'pending' },
                { text: 'In Progress', value: 'in_progress' },
                { text: 'Completed', value: 'completed' },
            ],
            onFilter: (value, record) => record.status === value,
            sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
            render: (status) => (
                <Tag color={STATUS_COLOR[status] || 'default'}>
                    {STATUS_LABEL[status] || status || '-'}
                </Tag>
            ),
        },
        {
            title: 'Progress',
            dataIndex: 'progress',
            sorter: (a, b) => (a.progress || 0) - (b.progress || 0),
            render: (progress) => (
                <span>
                    <span style={{ fontSize: 'larger' }}>{progress ?? 0}</span>%
                </span>
            ),
        },
        {
            title: 'Due Date',
            dataIndex: 'dueDate',
            sorter: (a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0),
            render: (date) => date ? new Date(date).toLocaleDateString() : '-',
        },
        {
            title: '',
            key: 'actions',
            render: (_, record) => (
                <Tooltip title="View / Edit">
                    <Button
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => openView(record)}
                    >
                        View
                    </Button>
                </Tooltip>
            ),
        },
    ];

    const filteredGoals = allGoals.filter(goal =>
        goal.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        goal.type?.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <p>{allGoals.length} goals total</p>
                </div>
            </div>

            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Input
                    placeholder="Search goals by title or type..."
                    prefix={<SearchOutlined />}
                    onChange={e => setSearchText(e.target.value)}
                    style={{ width: 400 }}
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Create Goal
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={filteredGoals}
                rowKey={(record, index) => record.goalId ?? index}
                loading={loading}
                pagination={{ pageSize: 10 }}
                bordered
            />

            <CreateGoalModal
                visible={modalVisible}
                onClose={handleClose}
                onSuccess={fetchGoals}
                goal={selectedGoal}
            />
        </div>
    );
};

export default MyGoalsTab;
