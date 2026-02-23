import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import { getCompanyRoles } from '../../services/api';
import { Table, Input, Card, Space, Typography } from 'antd';
import styles from '../Role/Role.module.css';

const { Title } = Typography;

function SubRole() {
    const [roleData, setRoleData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getRoleList = async () => {
        try {
            setLoading(true);
            const res = await getCompanyRoles();
            setRoleData(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching sub-role data:', err);
            setError('Failed to fetch sub-role data');
            setLoading(false);
        }
    };

    useEffect(() => {
        getRoleList();
    }, []);

    const filteredRoles = searchQuery
        ? roleData.filter((item) =>
            item.sub_role_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : roleData;

    const columns = [
        {
            title: 'Sub-Role ID',
            dataIndex: 'sub_role_id',
            key: 'sub_role_id',
            width: '30%',
        },
        {
            title: 'Sub-Role Name',
            dataIndex: 'sub_role_name',
            key: 'sub_role_name',
        },
    ];

    return (
        <Card className={styles.mainContainer}>
            <Title level={4} className={styles.heading}>Sub-Roles List</Title>

            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                <Input
                    placeholder="Search sub-roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: 300 }}
                />
                {/* <CSVLink
                    data={filteredRoles}
                    headers={[
                        { label: 'Sub-Role ID', key: 'sub_role_id' },
                        { label: 'Sub-Role Name', key: 'sub_role_name' },
                    ]}
                    filename="sub_role_list.csv"
                    className={styles.downloadButton}
                >
                    Download CSV
                </CSVLink> */}
            </Space>

            <Table
                columns={columns}
                dataSource={filteredRoles}
                rowKey="sub_role_id"
                loading={loading}
                pagination={{ pageSize: 15 }}
                bordered
            />
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </Card>
    );
}

export default SubRole;
