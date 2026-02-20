import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import {
  Input, Button, Table, Typography, Space, Tabs,
  DatePicker, Form, Modal, Tooltip, Popconfirm, Tag, message
} from 'antd';
import {
  PushpinOutlined, DownloadOutlined, PlusOutlined,
  EditOutlined, DeleteOutlined, CalendarOutlined, SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './HolidayPage.module.css';
import { holidayListData, getAllHolidays, addHoliday, updateHoliday, deleteHoliday } from '../../services/api';
import { convertDate, getWeekDay } from '../../util/helperFunctions';
import WidgetCard from '../../components/common/WidgetCard';
import { useAuth } from '../../context/AuthContext';

const { Text } = Typography;

// Holidays that are ≤ 6 months from today cannot be edited or deleted
const isWithin6Months = (holidayDateStr) => {
  const today = dayjs();
  const holidayDate = dayjs(holidayDateStr);
  const sixMonthsFromNow = today.add(6, 'month');
  return holidayDate.isBefore(sixMonthsFromNow) || holidayDate.isSame(sixMonthsFromNow, 'day');
};

function HolidayPage() {
  const { user } = useAuth();
  const isHROrAdmin = user?.roleName === 'HR' || user?.roleName === 'Admin';

  // --- Holiday List tab state ---
  const [holidayData, setHolidayData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [listLoading, setListLoading] = useState(true);

  // --- Manage Holidays tab state ---
  const [allHolidays, setAllHolidays] = useState([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [addLoading, setAddLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Fetch public holidays for the Holiday List tab
  const fetchHolidayList = async () => {
    setListLoading(true);
    try {
      const res = await holidayListData();
      setHolidayData(res.data);
    } catch (err) {
      console.error('Error fetching holiday data:', err);
    } finally {
      setListLoading(false);
    }
  };

  // Fetch all holidays for the Manage tab (HR/Admin)
  const fetchAllHolidays = async () => {
    setManageLoading(true);
    try {
      const res = await getAllHolidays();
      setAllHolidays(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching all holidays:', err);
      setAllHolidays([]);
    } finally {
      setManageLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidayList();
    if (isHROrAdmin) fetchAllHolidays();
  }, [isHROrAdmin]);

  const filteredHolidays = searchQuery
    ? holidayData.filter(
      (holiday) =>
        holiday.holiday_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        holiday.holiday_date.includes(searchQuery)
    )
    : holidayData;

  // ---------- ADD HOLIDAY ----------
  const handleAddHoliday = async (values) => {
    setAddLoading(true);
    try {
      await addHoliday({
        holiday_date: values.holiday_date.format('YYYY-MM-DD'),
        holiday_name: values.holiday_name.trim(),
      });
      message.success('Holiday added successfully');
      addForm.resetFields();
      await fetchAllHolidays();
      await fetchHolidayList();
    } catch (err) {
      message.error(err?.response?.data?.Message || 'Failed to add holiday');
    } finally {
      setAddLoading(false);
    }
  };

  // ---------- EDIT HOLIDAY ----------
  const openEditModal = (holiday) => {
    setEditingHoliday(holiday);
    editForm.setFieldsValue({
      holiday_date: dayjs(holiday.holiday_date),
      holiday_name: holiday.holiday_name,
    });
    setEditModalOpen(true);
  };

  const handleEditHoliday = async (values) => {
    if (!editingHoliday) return;
    setEditLoading(true);
    try {
      await updateHoliday(editingHoliday.holiday_id, {
        holiday_date: values.holiday_date.format('YYYY-MM-DD'),
        holiday_name: values.holiday_name.trim(),
      });
      message.success('Holiday updated successfully');
      setEditModalOpen(false);
      setEditingHoliday(null);
      await fetchAllHolidays();
      await fetchHolidayList();
    } catch (err) {
      message.error(err?.response?.data?.Message || 'Failed to update holiday');
    } finally {
      setEditLoading(false);
    }
  };

  // ---------- DELETE HOLIDAY ----------
  const handleDeleteHoliday = async (holidayId) => {
    try {
      await deleteHoliday(holidayId);
      message.success('Holiday deleted successfully');
      await fetchAllHolidays();
      await fetchHolidayList();
    } catch (err) {
      message.error(err?.response?.data?.Message || 'Failed to delete holiday');
    }
  };

  // ---------- Manage Holidays Table Columns ----------
  const manageColumns = [
    {
      title: 'Date',
      dataIndex: 'holiday_date',
      key: 'holiday_date',
      width: 250,
      render: (date) => (
        <span style={{ fontWeight: 500 }}>
          {convertDate(date)}{' '}
          <Text type="secondary" style={{ fontSize: 12 }}>
            ({getWeekDay(date)})
          </Text>
        </span>
      ),
    },
    {
      title: 'Holiday Name',
      dataIndex: 'holiday_name',
      key: 'holiday_name',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record) => {
        const restricted = isWithin6Months(record.holiday_date);
        return (
          <Space size="small">
            <Tooltip title={restricted ? 'Cannot modify holidays within 6 months' : 'Edit holiday'}>
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                disabled={restricted}
                onClick={() => openEditModal(record)}
                style={{ color: restricted ? undefined : '#1890ff' }}
              />
            </Tooltip>
            <Tooltip title={restricted ? 'Cannot delete holidays within 6 months' : 'Delete holiday'}>
              <Popconfirm
                title="Delete Holiday"
                description="Are you sure you want to delete this holiday?"
                onConfirm={() => handleDeleteHoliday(record.holiday_id)}
                okText="Yes, Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                disabled={restricted}
              >
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  size="small"
                  disabled={restricted}
                  danger={!restricted}
                />
              </Popconfirm>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  // ---------- Holiday List Tab ----------
  const HolidayListTab = (
    <WidgetCard title="Company Holiday List" icon={<PushpinOutlined />} iconColor="#1890ff">
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" italic>
          *The following holiday list is applicable only for associates who are not allocated to any
          particular project. Those who are allocated to projects need to follow customer holidays.
          Please refer to leave policy.*
        </Text>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Input
          placeholder="Search holidays..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Button type="primary" icon={<DownloadOutlined />} style={{ borderRadius: 4 }}>
          <CSVLink
            data={filteredHolidays}
            headers={[
              { label: 'Holiday Date', key: 'holiday_date' },
              { label: 'Holiday Name', key: 'holiday_name' },
            ]}
            filename="holiday_list.csv"
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            Download CSV
          </CSVLink>
        </Button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.stickyHeader}>
            <tr className={styles.headRow}>
              <th className={styles.th}>Holiday Date</th>
              <th className={styles.th}>Holiday Name</th>
            </tr>
          </thead>
          <tbody>
            {listLoading ? (
              <tr>
                <td className={styles.td} colSpan={2} style={{ textAlign: 'center' }}>
                  Loading...
                </td>
              </tr>
            ) : filteredHolidays.length === 0 ? (
              <tr>
                <td className={styles.td} colSpan={2} style={{ textAlign: 'center', color: '#8c8c8c' }}>
                  No holidays found matching your search.
                </td>
              </tr>
            ) : (
              filteredHolidays.map((holiday) => (
                <tr key={`${holiday.holiday_date}-${holiday.holiday_name}`}>
                  <td className={styles.td}>
                    {convertDate(holiday.holiday_date)} ({getWeekDay(holiday.holiday_date)})
                  </td>
                  <td className={styles.td}>{holiday.holiday_name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );

  // ---------- Manage Holidays Tab (HR/Admin only) ----------
  const ManageHolidaysTab = (
    <div>
      {/* Add Holiday Form */}
      <WidgetCard title="Add New Holiday" iconColor="#52c41a">
        <Form
          form={addForm}
          layout="inline"
          onFinish={handleAddHoliday}
          style={{ flexWrap: 'wrap', gap: 8 }}
        >
          <Form.Item
            name="holiday_date"
            rules={[{ required: true, message: 'Please select a date' }]}
            style={{ marginBottom: 8 }}
          >
            <DatePicker
              placeholder="Select date"
              format="YYYY-MM-DD"
              style={{ width: 180 }}
            />
          </Form.Item>
          <Form.Item
            name="holiday_name"
            rules={[
              { required: true, message: 'Please enter a holiday name' },
              { min: 2, message: 'Name must be at least 2 characters' },
            ]}
            style={{ marginBottom: 8 }}
          >
            <Input
              placeholder="Holiday name (e.g. Diwali)"
              style={{ width: 260 }}
              maxLength={100}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              // icon={<PlusOutlined />}
              loading={addLoading}
              style={{ borderRadius: 4 }}
            >
              Add
            </Button>
          </Form.Item>
        </Form>
      </WidgetCard>

      {/* All Holidays Table */}
      <div style={{ marginTop: 24 }}>
        <WidgetCard
          title={`All Holidays (${allHolidays.length})`}
          icon={<CalendarOutlined />}
          iconColor="#1890ff"
        >
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              <Tag color="orange" style={{ marginRight: 4 }}>Within 6 months</Tag>
              holidays cannot be edited or deleted to protect active leave planning.
            </Text>
          </div>
          <Table
            dataSource={allHolidays}
            columns={manageColumns}
            rowKey="holiday_id"
            loading={manageLoading}
            pagination={{ pageSize: 5, showSizeChanger: false }}
            size="middle"
            scroll={{ x: 600 }}
            rowClassName={(record) =>
              isWithin6Months(record.holiday_date) ? styles.restrictedRow : ''
            }
          />
        </WidgetCard>
      </div>
    </div>
  );

  // Build Tabs items
  const tabItems = [
    {
      key: 'list',
      label: (
        <span>
          <CalendarOutlined style={{ marginRight: 6 }} />
          Holiday List
        </span>
      ),
      children: HolidayListTab,
    },
  ];

  if (isHROrAdmin) {
    tabItems.push({
      key: 'manage',
      label: (
        <span>
          <SettingOutlined style={{ marginRight: 6 }} />
          Manage Holidays
        </span>
      ),
      children: ManageHolidaysTab,
    });
  }

  return (
    <div className={styles.mainContainer}>
      <div className={styles.mainBlock}>
        <Tabs
          defaultActiveKey="list"
          items={tabItems}
          size="large"
          style={{ background: 'transparent' }}
        />
      </div>

      {/* Edit Holiday Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#1890ff' }} />
            Edit Holiday
          </Space>
        }
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingHoliday(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditHoliday}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="Holiday Date"
            name="holiday_date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Holiday Name"
            name="holiday_name"
            rules={[
              { required: true, message: 'Please enter a holiday name' },
              { min: 2, message: 'Name must be at least 2 characters' },
            ]}
          >
            <Input placeholder="Holiday name" maxLength={100} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button
              onClick={() => {
                setEditModalOpen(false);
                setEditingHoliday(null);
                editForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={editLoading}>
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default HolidayPage;
