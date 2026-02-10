import React, { useState, useEffect } from 'react';
import { Table, Button, Input, message, Popconfirm, Tooltip, Card, Tag, Row, Col, Statistic, Progress, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ProjectOutlined, TeamOutlined, RiseOutlined } from '@ant-design/icons';
import { getProjects, deleteProject, getProjectStats } from '../../services/api';
import ProjectModal from '../../components/modal/ProjectModal/ProjectModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import EmployeeAllocations from './EmployeeAllocations.jsx';

const Projects = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [stats, setStats] = useState({
        active_projects: 0,
        prospective_projects: 0,
        total_allocation: 0,
        billable_allocation: 0,
        total_employees: 0
    });
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [isReadOnly, setIsReadOnly] = useState(false);

    const isHRorAdmin = user?.roleName === 'HR' || user?.roleName === 'Admin';

    useEffect(() => {
        fetchProjects();
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await getProjectStats();
            setStats(res.data);
        } catch (err) {
            console.error("Failed to load stats", err);
        }
    };

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await getProjects();
            // Ensure we handle both direct array or response.data structure
            const data = Array.isArray(res.data) ? res.data : (res.data.projects || []);
            setProjects(data);
        } catch (err) {
            message.error("Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingProject(null);
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingProject(record);
        setIsReadOnly(false);
        setIsModalVisible(true);
    };

    const handleView = (record) => {
        setEditingProject(record);
        setIsReadOnly(true);
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await deleteProject(id);
            message.success("Project deleted");
            fetchProjects();
        } catch (err) {
            message.error("Failed to delete project");
        }
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setEditingProject(null);
        setIsReadOnly(false);
    };

    const columns = [
        {
            title: 'Project Name',
            dataIndex: 'project_name',
            sorter: (a, b) => a.project_name.localeCompare(b.project_name),
            render: (text) => <b>{text}</b>
        },
        {
            title: 'Client',
            dataIndex: 'client',
            filters: [...new Set(projects.map(p => p.client))].map(c => ({ text: c, value: c })),
            onFilter: (value, record) => record.client === value,
        },
        {
            title: 'Status',
            dataIndex: 'project_status',
            filters: [
                { text: 'Active', value: 'Active' },
                { text: 'Future Prospect', value: 'Future Prospect' },
                { text: 'Closed', value: 'Closed' },
                { text: 'On-Hold', value: 'On-Hold' }
            ],
            onFilter: (value, record) => record.project_status === value,
            render: (status) => {
                let color = 'geekblue';
                if (status === 'Active') color = 'green';
                if (status === 'Closed') color = 'red';
                if (status === 'On-Hold') color = 'orange';
                return <Tag color={color}>{status || 'Active'}</Tag>;
            }
        },
        {
            title: 'Lead',
            dataIndex: 'lead_name',
            filters: [...new Set(projects.map(p => p.lead_name).filter(Boolean))].sort().map(l => ({ text: l, value: l })),
            onFilter: (value, record) => record.lead_name === value,
        },
        {
            title: 'Dates',
            render: (_, record) => (
                <small>
                    Start: {record.start_date || 'N/A'} <br />
                    End: {record.end_date || 'N/A'}
                </small>
            )
        },
        {
            title: 'Description',
            dataIndex: 'description',
            ellipsis: true,
        },
        {
            title: 'Total Allocation',
            dataIndex: 'total_allocation',
            render: (total) => <>{total / 100 || 0}</>,
            sorter: (a, b) => (a.total_allocation || 0) - (b.total_allocation || 0),
        },
        {
            title: 'Billable Allocation',
            dataIndex: 'billable_allocation',
            render: (total) => <>{total / 100 || 0}</>,
            sorter: (a, b) => (a.billable_allocation || 0) - (b.billable_allocation || 0),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                isHRorAdmin ? (
                    <Tooltip title="Edit Details & Allocation">
                        <Button
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                        >Edit</Button>
                    </Tooltip>
                ) : (
                    <Tooltip title="View Details & Allocation">
                        <Button
                            onClick={() => handleView(record)}
                        >View</Button>
                    </Tooltip>
                )
            )
        },
    ];



    const filteredProjects = projects.filter(p =>
        p.project_name.toLowerCase().includes(searchText.toLowerCase()) ||
        (p.client && p.client.toLowerCase().includes(searchText.toLowerCase())) ||
        (p.lead_name && p.lead_name.toLowerCase().includes(searchText.toLowerCase()))
    );

    return (
        <div style={{ padding: 20 }}>
            {/* <h2 style={{ marginBottom: 24 }}>Projects & Allocation</h2> */}
            <Tabs defaultActiveKey="1">
                <Tabs.TabPane tab="Projects" key="1">

                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} sm={8} md={5}>
                            <Card bordered={false}>
                                <Statistic
                                    title="Active Projects"
                                    value={stats.active_projects}
                                    prefix={<ProjectOutlined />}
                                    valueStyle={{ color: '#3f8600' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={8} md={5}>
                            <Card bordered={false}>
                                <Statistic
                                    title="Prospective Projects"
                                    value={stats.prospective_projects}
                                    prefix={<RiseOutlined />}
                                    valueStyle={{ color: '#1890ff' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={24} md={10}>
                            <Card bordered={false}>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Statistic
                                            title="Allocation"
                                            value={stats.total_allocation}
                                            precision={1}
                                            suffix={`/ ${stats.total_employees}`}
                                            prefix={<TeamOutlined />}
                                        />
                                        <Progress
                                            percent={Math.round((stats.total_allocation / (stats.total_employees || 1)) * 100)}
                                            size="small"
                                            status="active"
                                            strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                                        />
                                    </Col>
                                    <Col span={8}>
                                        <Statistic
                                            title="Billable"
                                            value={stats.billable_allocation}
                                            precision={1}
                                            suffix={`/ ${stats.total_allocation}`}
                                            prefix={<TeamOutlined />}
                                        />
                                        <Progress
                                            percent={Math.round((stats.billable_allocation / (stats.total_allocation || 1)) * 100)}
                                            size="small"
                                            status="active"
                                            strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                                        />
                                    </Col>
                                    <Col span={8}>
                                        <Statistic
                                            title="Billable (total)"
                                            value={stats.billable_allocation}
                                            precision={1}
                                            suffix={`/ ${stats.total_employees}`}
                                            prefix={<TeamOutlined />}
                                        />
                                        <Progress
                                            percent={Math.round((stats.billable_allocation / (stats.total_employees || 1)) * 100)}
                                            size="small"
                                            status="active"
                                            strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                                        />
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                        <Col xs={24} sm={24} md={4}>
                            {isHRorAdmin && (
                                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                                    Add Project
                                </Button>
                            )}
                        </Col>
                    </Row>

                    <Card>
                        <div style={{ marginBottom: 16 }}>
                            <Input
                                placeholder="Search projects by name, client or lead..."
                                prefix={<SearchOutlined />}
                                onChange={e => setSearchText(e.target.value)}
                                style={{ width: 300 }}
                            />
                        </div>

                        <Table
                            columns={columns}
                            dataSource={filteredProjects}
                            rowKey="project_id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    </Card>

                    <ProjectModal
                        visible={isModalVisible}
                        onClose={handleModalClose}
                        project={editingProject}
                        isEditMode={!!editingProject}
                        readOnly={isReadOnly}
                        refreshProjects={fetchProjects}
                    />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Employee Allocations" key="2">
                    <EmployeeAllocations />
                </Tabs.TabPane>
            </Tabs>
        </div>
    );
};

export default Projects;
