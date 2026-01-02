import React, { useState, useEffect } from 'react';
import { Row, Col, List, Typography, Progress, Badge, Avatar, message } from 'antd';
import { CalendarOutlined, UserOutlined, GiftOutlined, PushpinOutlined, RocketOutlined, BellOutlined, UserAddOutlined } from '@ant-design/icons';
import WidgetCard from '../../components/common/WidgetCard';
import { getNewJoinees, holidayListData, getUpcomingBirthdays } from '../../services/api';

const { Title, Text } = Typography;

// Widget dimension constants - change these values to adjust all widgets at once
const WIDGET_COL_MAX_HEIGHT = '300px';
const WIDGET_LIST_MAX_HEIGHT = '200px';

export const Dashboard = () => {
  // State for new joinees
  const [newJoinees, setNewJoinees] = useState([]);
  const [loadingJoinees, setLoadingJoinees] = useState(true);

  // State for holidays
  const [holidayData, setHolidayData] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);

  // State for birthdays
  const [birthdayData, setBirthdayData] = useState([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState(true);

  // Fetch new joinees on component mount
  useEffect(() => {
    const fetchNewJoinees = async () => {
      try {
        setLoadingJoinees(true);
        const response = await getNewJoinees();
        if (response.data.status === 'success') {
          setNewJoinees(response.data.data);
        } else {
          message.error('Failed to fetch new joinees');
        }
      } catch (error) {
        console.error('Error fetching new joinees:', error);
        message.error('Failed to fetch new joinees');
      } finally {
        setLoadingJoinees(false);
      }
    };

    const fetchHolidayData = async () => {
      try {
        setLoadingHolidays(true);
        const res = await holidayListData();
        setHolidayData(res.data);
      } catch (err) {
        console.error('Error fetching holiday data:', err);
        message.error('Failed to fetch holiday data');
      } finally {
        setLoadingHolidays(false);
      }
    };

    const fetchBirthdayData = async () => {
      try {
        setLoadingBirthdays(true);
        const response = await getUpcomingBirthdays();
        if (response.data.status === 'success') {
          setBirthdayData(response.data.data);
        } else {
          message.error('Failed to fetch birthday data');
        }
      } catch (error) {
        console.error('Error fetching birthday data:', error);
        message.error('Failed to fetch birthday data');
      } finally {
        setLoadingBirthdays(false);
      }
    };

    fetchNewJoinees();
    fetchHolidayData();
    fetchBirthdayData();
  }, []);

  // Sample Data
  const recentNotifications = [
    { title: 'Policy Update', desc: 'New remote work guidelines are now available.', time: '2h ago' },
    { title: 'Leave Approved', desc: 'Your leave request for Oct 20th has been approved.', time: '5h ago' },
    { title: 'System Update', desc: 'HRMS will undergo maintenance tonight at 12 AM.', time: '1d ago' },
  ];

  const upcomingEvents = [
    { title: 'Town Hall Meeting', date: 'Oct 15, 2026', type: 'Work' },
    { title: 'Project Kickoff', date: 'Oct 20, 2026', type: 'Work' },
    { title: 'Annual Dinner', date: 'Dec 15, 2026', type: 'Social' },
  ];

  const peopleOnLeave = [
    { name: 'Alice Johnson', date: 'Oct 10 - Oct 12', avatar: 'AJ' },
    { name: 'Bob Smith', date: 'Oct 12 - Oct 15', avatar: 'BS' },
    { name: 'Charlie Brown', date: 'Oct 14 - Oct 14', avatar: 'CB' },
  ];

  // Helper function to format date from DD-MM-YYYY to readable format
  const formatDate = (dateStr) => {
    const [day, month, year] = dateStr.split("-");
    const date = new Date(`${year}-${month}-${day}`);
    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "short",
    };
    return date.toLocaleDateString("en-US", options).replace(/ /g, " ");
  };

  const myGoals = [
    { title: 'Complete React Training', percent: 75, color: '#1890ff' },
    { title: 'Submit Q4 Project', percent: 40, color: '#f5222d' },
    { title: 'Improve Code Coverage', percent: 90, color: '#52c41a' },
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      {/* <Title level={2} style={{ marginBottom: '24px', fontWeight: 600 }}>Employee Dashboard (dummy data)</Title> */}

      <Row gutter={[16, 16]}>
        {/* Recent Notifications */}
        <Col xs={24} lg={16} style={{ maxHeight: WIDGET_COL_MAX_HEIGHT }}>
          <WidgetCard
            title="Recent Notifications"
            icon={<BellOutlined />}
            iconColor="#f5222d"
          >
            <List
              dataSource={recentNotifications}
              style={{ maxHeight: WIDGET_LIST_MAX_HEIGHT, overflowY: 'auto' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>{item.title}</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>{item.time}</Text>
                    </div>}
                    description={item.desc}
                  />
                </List.Item>
              )}
            />
          </WidgetCard>
        </Col>

        {/* Upcoming Events */}
        <Col xs={24} lg={8} style={{ maxHeight: WIDGET_COL_MAX_HEIGHT }}>
          <WidgetCard
            title="Upcoming Events"
            icon={<CalendarOutlined />}
            iconColor="#1890ff"
          >
            <List
              dataSource={upcomingEvents}
              style={{ maxHeight: WIDGET_LIST_MAX_HEIGHT, overflowY: 'auto' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<Text strong>{item.title}</Text>}
                    description={<Badge status={item.type === 'Work' ? 'processing' : 'warning'} text={item.date} />}
                  />
                </List.Item>
              )}
            />
          </WidgetCard>
        </Col>

        {/* People on Leave */}
        <Col xs={24} sm={12} lg={8} style={{ maxHeight: WIDGET_COL_MAX_HEIGHT }}>
          <WidgetCard
            title="People on Leave"
            icon={<UserOutlined />}
            iconColor="#52c41a"
          >
            <List
              dataSource={peopleOnLeave}
              style={{ maxHeight: WIDGET_LIST_MAX_HEIGHT, overflowY: 'auto' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar style={{ backgroundColor: '#87d068' }}>{item.avatar}</Avatar>}
                    title={<Text strong>{item.name}</Text>}
                    description={item.date}
                  />
                </List.Item>
              )}
            />
          </WidgetCard>
        </Col>

        {/* Upcoming Birthdays */}
        <Col xs={24} sm={12} lg={8} style={{ maxHeight: WIDGET_COL_MAX_HEIGHT }}>
          <WidgetCard
            title="Upcoming Birthdays"
            icon={<GiftOutlined />}
            iconColor="#eb2f96"
          >
            <List
              loading={loadingBirthdays}
              dataSource={birthdayData}
              locale={{ emptyText: 'No upcoming birthdays in the next 2 months' }}
              style={{ maxHeight: WIDGET_LIST_MAX_HEIGHT, overflowY: 'auto' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar style={{ backgroundColor: '#13c2c2' }}>{item.employee_name?.charAt(0) || 'N'}</Avatar>}
                    title={<Text strong>{item.employee_name}</Text>}
                    description={`Celebrating on ${item.date}`}
                  />
                </List.Item>
              )}
            />
          </WidgetCard>
        </Col>

        {/* New Joinees */}
        <Col xs={24} sm={12} lg={8} style={{ maxHeight: WIDGET_COL_MAX_HEIGHT }}>
          <WidgetCard
            title="New Joinees"
            icon={<UserAddOutlined />}
            iconColor="#13c2c2"
          >
            <List
              loading={loadingJoinees}
              dataSource={newJoinees}
              locale={{ emptyText: 'No new joinees in the last 2 months' }}
              style={{ maxHeight: WIDGET_LIST_MAX_HEIGHT, overflowY: 'auto' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar style={{ backgroundColor: '#13c2c2' }}>{item.employee_name?.charAt(0) || 'N'}</Avatar>}
                    title={<Text strong>{item.employee_name}</Text>}
                    description={
                      <div style={{ fontSize: '12px' }}>
                        <div><CalendarOutlined /> {new Date(item.date_of_joining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div style={{ marginTop: '2px' }}>
                          <Badge status="default" text={`${item.band} • ${item.sub_role}`} />
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </WidgetCard>
        </Col>

        {/* Upcoming Holidays */}
        <Col xs={24} sm={12} lg={8} style={{ maxHeight: WIDGET_COL_MAX_HEIGHT }}>
          <WidgetCard
            title="Upcoming Holidays"
            icon={<PushpinOutlined />}
            iconColor="#fa8c16"
          >
            <List
              loading={loadingHolidays}
              dataSource={holidayData}
              locale={{ emptyText: 'No upcoming holidays' }}
              style={{ maxHeight: WIDGET_LIST_MAX_HEIGHT, overflowY: 'auto' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<Text strong>{item.holiday_name}</Text>}
                    description={formatDate(item.holiday_date)}
                  />
                </List.Item>
              )}
            />
          </WidgetCard>
        </Col>

        {/* My Goals Progress */}
        <Col xs={24} lg={16}>
          <WidgetCard
            title="My Goals Progress"
            icon={<RocketOutlined />}
            iconColor="#722ed1"
          >
            <Row gutter={[16, 16]}>
              {myGoals.map((goal, index) => (
                <Col xs={24} sm={8} key={index}>
                  <div style={{ textAlign: 'center', padding: '10px' }}>
                    <Progress type="circle" percent={goal.percent} strokeColor={goal.color} width={80} />
                    <div style={{ marginTop: '12px' }}>
                      <Text strong>{goal.title}</Text>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </WidgetCard>
        </Col>
      </Row>
    </div>
  );
};
