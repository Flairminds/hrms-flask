import React, { useEffect, useState } from 'react';
import { Table, Input, Modal, Button, message } from 'antd';
import { getAllEmployeeEvaluators, deleteEvaluators, sendEvaluatorReminder } from '../../services/api';
import { AssignEvaluator } from '../AssignEvaluator/AssignEvaluator';
import styles from './ViewEvaluators.module.css';

const { Search } = Input;
const { confirm } = Modal;

export const ViewEvaluators = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [selectedEvaluatorIds, setSelectedEvaluatorIds] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [loadingReminders, setLoadingReminders] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await getAllEmployeeEvaluators();
      setData(response.data);
      setFilteredData(response.data);
    } catch (error) {
      console.error("Error fetching evaluator data", error);
      message.error('Failed to fetch evaluator data');
    }
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    const lower = value.toLowerCase();
    const filtered = data.filter(item =>
      item.employeeName.toLowerCase().includes(lower) ||
      item.evaluatorNames.toLowerCase().includes(lower)
    );
    setFilteredData(filtered);
  };

  const openEditModal = (empId, evaluatorIds) => {
    setSelectedEmpId(empId);
    setSelectedEvaluatorIds(evaluatorIds);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    fetchData();
  };

  const handleDelete = (empId) => {
    confirm({
      title: 'Are you sure you want to delete evaluators for this employee?',
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteEvaluators(empId);
          message.success('Evaluator(s) deleted successfully');
          fetchData();
        } catch (err) {
          message.error('Failed to delete evaluator(s)');
          console.error(err);
        }
      }
    });
  };

  const handleSendReminder = async (empId, evaluatorIds) => {
    setLoadingReminders(prev => ({ ...prev, [empId]: true }));
    try {
      const response = await sendEvaluatorReminder(empId, evaluatorIds);
      message.success('Reminder emails sent successfully');
      if (response.data.emailFailures?.length > 0) {
        message.error(`Failed to send reminders to: ${response.data.emailFailures.join(', ')}`);
      }
    } catch (error) {
      message.error(`Failed to send reminders: ${error.response?.data?.error || error.message}`);
      console.error(error);
    } finally {
      setLoadingReminders(prev => ({ ...prev, [empId]: false }));
    }
  };

  const columns = [
    {
      title: 'Employee',
      dataIndex: 'employeeName',
      key: 'employeeName'
    },
    {
      title: 'Evaluator(s)',
      dataIndex: 'evaluatorNames',
      key: 'evaluatorNames'
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <div className={styles.actionButtons}>
          <Button
            type="link"
            className={styles.editButton}
            onClick={() => openEditModal(record.empId, record.evaluatorIds)}
          >
            Edit
          </Button>
          <Button
            type="link"
            className={styles.deleteButton}
            onClick={() => handleDelete(record.empId)}
          >
            Delete
          </Button>
          <Button
            type="link"
            className={styles.reminderButton}
            loading={loadingReminders[record.empId]}
            onClick={() => handleSendReminder(record.empId, record.evaluatorIds)}
          >
            Send Reminder
          </Button>
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Search
        placeholder="Search employee or evaluator"
        onSearch={handleSearch}
        onChange={e => handleSearch(e.target.value)}
        value={searchValue}
        style={{ width: 400, marginBottom: 16 }}
        allowClear
      />

      <Table
        columns={columns}
        dataSource={filteredData}
        pagination={{ pageSize: 6 }}
        rowKey="empId"
        className={styles.table}
      />

      <Modal
        title="Edit Evaluators"
        open={modalVisible}
        footer={null}
        onCancel={handleModalClose}
        destroyOnClose
        centered
        width={600}
      >
        <AssignEvaluator
          mode="edit"
          initialEmployee={selectedEmpId}
          initialEvaluators={selectedEvaluatorIds}
          onClose={handleModalClose}
        />
      </Modal>
    </div>
  );
};