import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import { getMasterRoles } from '../../services/api';
import { Table, Input, Card, Space, Typography } from 'antd';
import styles from '../Role/Role.module.css';

const { Title } = Typography;

function MasterRole() {
    const [roleData, setRoleData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getRoleList = async () => {
        try {
            setLoading(true);
            const res = await getMasterRoles();
            setRoleData(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching master role data:', err);
            setError('Failed to fetch master role data');
            setLoading(false);
        }
    };

    useEffect(() => {
        getRoleList();
    }, []);

    const filteredRoles = searchQuery
        ? roleData.filter((item) =>
            item.role_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : roleData;

    const columns = [
        {
            title: 'Role ID',
            dataIndex: 'role_id',
            key: 'role_id',
            width: '30%',
        },
        {
            title: 'Role Name',
            dataIndex: 'role_name',
            key: 'role_name',
        },
    ];

    return (
        <Card className={styles.mainContainer}>
            <Title level={4} className={styles.heading}>Master Roles List</Title>

            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                <Input
                    placeholder="Search roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: 300 }}
                />
                {/* <CSVLink
                    data={filteredRoles}
                    headers={[
                        { label: 'Role ID', key: 'role_id' },
                        { label: 'Role Name', key: 'role_name' },
                    ]}
                    filename="master_role_list.csv"
                    className={styles.downloadButton}
                >
                    Download CSV
                </CSVLink> */}
            </Space>

            <Table
                columns={columns}
                dataSource={filteredRoles}
                rowKey="role_id"
                loading={loading}
                pagination={{ pageSize: 15 }}
                bordered
            />
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </Card>
    );
}

export default MasterRole;
