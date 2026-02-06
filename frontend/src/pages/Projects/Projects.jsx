import React, { useState, useEffect } from 'react';
import { Table, Button, Input, message, Popconfirm, Tooltip, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { getProjects, deleteProject } from '../../services/api';
import ProjectModal from '../../components/modal/ProjectModal/ProjectModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import moment from 'moment';

const Projects = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState(null);

    const isHRorAdmin = user?.roleName === 'HR' || user?.roleName === 'Admin';

    useEffect(() => {
        fetchProjects();
    }, []);

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
            title: 'Lead',
            dataIndex: 'lead_name',
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
    ];

    if (isHRorAdmin) {
        columns.push({
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <>
                    <Tooltip title="Edit Details & Allocation">
                        <Button
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                            style={{ marginRight: 8 }}
                        >Edit</Button>
                    </Tooltip>
                    {/* <Popconfirm title="Delete project?" onConfirm={() => handleDelete(record.project_id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm> */}
                </>
            )
        });
    }

    const filteredProjects = projects.filter(p =>
        p.project_name.toLowerCase().includes(searchText.toLowerCase()) ||
        (p.client && p.client.toLowerCase().includes(searchText.toLowerCase())) ||
        (p.lead_name && p.lead_name.toLowerCase().includes(searchText.toLowerCase()))
    );

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2>Projects</h2>
                {isHRorAdmin && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        Add Project
                    </Button>
                )}
            </div>

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
                onProjectSaved={fetchProjects}
            />
        </div>
    );
};

export default Projects;
