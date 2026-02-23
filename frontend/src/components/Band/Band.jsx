import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import { getCompanyBands } from '../../services/api';
import { Table, Input, Card, Space, Typography } from 'antd';
import styles from './Band.module.css';

const { Title } = Typography;

function Band() {
  const [bandData, setBandData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getBandList = async () => {
    try {
      setLoading(true);
      const res = await getCompanyBands();
      setBandData(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching band data:', err);
      setError('Failed to fetch band data');
      setLoading(false);
    }
  };

  useEffect(() => {
    getBandList();
  }, []);

  const filteredBands = searchQuery
    ? bandData.filter((item) =>
      item.designation_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : bandData;

  const columns = [
    {
      title: 'Designation ID',
      dataIndex: 'designation_id',
      key: 'designation_id',
      width: '30%',
    },
    {
      title: 'Designation Name',
      dataIndex: 'designation_name',
      key: 'designation_name',
    },
  ];

  return (
    <Card className={styles.mainContainer}>
      <Title level={4} className={styles.heading}>Designations List</Title>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Input
          placeholder="Search designations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 300 }}
        />
        {/* <CSVLink
          data={filteredBands}
          headers={[
            { label: 'Designation ID', key: 'designation_id' },
            { label: 'Designation Name', key: 'designation_name' },
          ]}
          filename="designation_list.csv"
          className={styles.downloadButton}
        >
          Download CSV
        </CSVLink> */}
      </Space>

      <Table
        columns={columns}
        dataSource={filteredBands}
        rowKey="designation_id"
        loading={loading}
        pagination={{ pageSize: 5 }}
        bordered
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </Card>
  );
}

export default Band;