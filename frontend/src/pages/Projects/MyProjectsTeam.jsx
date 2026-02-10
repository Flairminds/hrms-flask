import React, { useState, useEffect } from 'react';
import { Table, Card, message, Tag } from 'antd';
import { getMyProjectsTeam } from '../../services/api';

const MyProjectsTeam = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchMyProjects();
    }, []);

    const fetchMyProjects = async () => {
        setLoading(true);
        try {
            const response = await getMyProjectsTeam();
            setProjects(response.data);
        } catch (err) {
            message.error('Failed to fetch my projects');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Project Name', dataIndex: 'project_name', key: 'project_name' },
        { title: 'Lead', dataIndex: 'lead_name', key: 'lead_name' },
        { title: 'Client', dataIndex: 'client', key: 'client' },
        { title: 'My Role', dataIndex: 'my_role', key: 'my_role' },
        {
            title: 'My Allocation %',
            dataIndex: 'my_allocation',
            key: 'my_allocation',
            render: (val) => `${val}%`
        },
        {
            title: 'Team Size',
            dataIndex: 'team_members',
            key: 'team_size',
            render: (team) => <Tag color="blue">{team?.length || 0} members</Tag>
        }
    ];

    const expandedRowRender = (record) => {
        const teamColumns = [
            { title: 'Employee ID', dataIndex: 'employee_id', key: 'employee_id' },
            { title: 'Name', dataIndex: 'employee_name', key: 'employee_name' },
            { title: 'Email', dataIndex: 'email', key: 'email' },
            { title: 'Role', dataIndex: 'role', key: 'role' },
            {
                title: 'Allocation %',
                dataIndex: 'allocation',
                key: 'allocation',
                render: (val) => `${val}%`
            }
        ];

        return (
            <div style={{ margin: '0 0 0 5rem' }}>
                <Table
                    columns={teamColumns}
                    dataSource={record.team_members}
                    pagination={false}
                    size="small"
                    rowKey="employee_id"
                />
            </div>
        );
    };

    return (
        <div>
            <Card>
                <Table
                    columns={columns}
                    dataSource={projects}
                    expandable={{
                        expandedRowRender,
                        rowExpandable: (record) => record.team_members && record.team_members.length > 0
                    }}
                    rowKey="project_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </div>
    );
};

export default MyProjectsTeam;
