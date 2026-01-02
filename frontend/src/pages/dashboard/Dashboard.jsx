import React, { useState, useEffect } from 'react';
import { Row, Col, List, Typography, Progress, Badge, Avatar, message } from 'antd';
import { CalendarOutlined, UserOutlined, GiftOutlined, PushpinOutlined, RocketOutlined, BellOutlined, UserAddOutlined } from '@ant-design/icons';
import WidgetCard from '../../components/common/WidgetCard';
import { getNewJoinees } from '../../services/api';

const { Title, Text } = Typography;

export const Dashboard = () => {
  // State for new joinees
  const [newJoinees, setNewJoinees] = useState([]);
  const [loadingJoinees, setLoadingJoinees] = useState(true);

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

    fetchNewJoinees();
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

  const upcomingBirthdays = [
    { name: 'David Wilson', date: 'Oct 05', avatar: 'DW' },
    { name: 'Eve Davis', date: 'Oct 18', avatar: 'ED' },
    { name: 'Frank Miller', date: 'Oct 25', avatar: 'FM' },
  ];

  const upcomingHolidays = [
    { title: 'Dussehra', date: 'Oct 12, 2026' },
    { title: 'Diwali', date: 'Nov 01, 2026' },
    { title: 'Christmas', date: 'Dec 25, 2026' },
  ];

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
        <Col xs={24} lg={16}>
          <WidgetCard
            title="Recent Notifications"
            icon={<BellOutlined />}
            iconColor="#f5222d"
          >
            <List
              dataSource={recentNotifications}
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
        <Col xs={24} lg={8}>
          <WidgetCard
            title="Upcoming Events"
            icon={<CalendarOutlined />}
            iconColor="#1890ff"
          >
            <List
              dataSource={upcomingEvents}
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
        <Col xs={24} sm={12} lg={8}>
          <WidgetCard
            title="People on Leave"
            icon={<UserOutlined />}
            iconColor="#52c41a"
          >
            <List
              dataSource={peopleOnLeave}
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
        <Col xs={24} sm={12} lg={8}>
          <WidgetCard
            title="Upcoming Birthdays"
            icon={<GiftOutlined />}
            iconColor="#eb2f96"
          >
            <List
              dataSource={upcomingBirthdays}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`} />}
                    title={<Text strong>{item.name}</Text>}
                    description={`Celebrating on ${item.date}`}
                  />
                </List.Item>
              )}
            />
          </WidgetCard>
        </Col>

        {/* New Joinees */}
        <Col xs={24} sm={12} lg={8}>
          <WidgetCard
            title="New Joinees"
            icon={<UserAddOutlined />}
            iconColor="#13c2c2"
          >
            <List
              loading={loadingJoinees}
              dataSource={newJoinees}
              locale={{ emptyText: 'No new joinees in the last 2 months' }}
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
        <Col xs={24} sm={12} lg={8}>
          <WidgetCard
            title="Upcoming Holidays"
            icon={<PushpinOutlined />}
            iconColor="#fa8c16"
          >
            <List
              dataSource={upcomingHolidays}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<Text strong>{item.title}</Text>}
                    description={item.date}
                  />
                </List.Item>
              )}
            />
          </WidgetCard>
        </Col>

        {/* My Goals Progress */}
        <Col xs={24} lg={24}>
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
