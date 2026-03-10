import React, { useState, useEffect } from 'react';
import { Row, Col, List, Typography, Progress, Badge, Avatar, message, Image } from 'antd';
import { CalendarOutlined, UserOutlined, GiftOutlined, PushpinOutlined, RocketOutlined, BellOutlined, UserAddOutlined } from '@ant-design/icons';
import WidgetCard from '../../components/common/WidgetCard';
import { getNewJoinees, holidayListData, getUpcomingBirthdays, getPeopleOnLeave } from '../../services/api';
import { convertDate, filterUpcomingHolidays } from '../../util/helperFunctions';

const { Title, Text } = Typography;

// Widget dimension constants - change these values to adjust all widgets at once
const WIDGET_COL_MAX_HEIGHT = '300px';
const WIDGET_LIST_MAX_HEIGHT = '200px';

export const Dashboard = () => {
  // State for preview
  const [previewImage, setPreviewImage] = useState(null);

  // State for new joinees
  const [newJoinees, setNewJoinees] = useState([]);
  const [loadingJoinees, setLoadingJoinees] = useState(true);

  // State for holidays
  const [holidayData, setHolidayData] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);

  // State for birthdays
  const [birthdayData, setBirthdayData] = useState([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState(true);

  // State for people on leave
  const [peopleOnLeave, setPeopleOnLeave] = useState([]);
  const [loadingPeopleOnLeave, setLoadingPeopleOnLeave] = useState(true);

  // Fetch data on component mount
  useEffect(() => {
    // ... existing fetch logic ...
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
        const upcomingHolidays = filterUpcomingHolidays(res.data);
        setHolidayData(upcomingHolidays);
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

    const fetchPeopleOnLeave = async () => {
      try {
        setLoadingPeopleOnLeave(true);
        const response = await getPeopleOnLeave();
        if (response.data.status === 'success') {
          setPeopleOnLeave(response.data.data);
        } else {
          message.error('Failed to fetch people on leave');
        }
      } catch (error) {
        console.error('Error fetching people on leave:', error);
        message.error('Failed to fetch people on leave');
      } finally {
        setLoadingPeopleOnLeave(false);
      }
    };

    fetchNewJoinees();
    fetchHolidayData();
    fetchBirthdayData();
    fetchPeopleOnLeave();
  }, []);

  // Helper function to format date from DD-MM-YYYY to readable format
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
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

  // Helper function to format birthday text
  const getBirthdayText = (dateStr) => {
    if (!dateStr) return '';
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatDayMonth = (d) => {
      const day = d.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${months[d.getMonth()]}`;
    };

    if (dateStr === formatDayMonth(today)) return 'Celebrating Today 🎉';
    if (dateStr === formatDayMonth(tomorrow)) return 'Celebrating Tomorrow';
    return `Celebrating on ${dateStr}`;
  };

  const recentNotifications = [{
    title: 'Inviting creative ideas for Annual Day celebration',
    date: '2026-03-10',
    desc: `We are excited to announce the upcoming Annual Day celebration! We invite all employees to share their creative ideas for making this year's event a memorable one.`
  }, {
    title: 'New canteen vendor',
    date: '2026-03-09',
    desc: `Complimentary tea, coffee, and snacks for everyone for today.`
  }, {
    title: 'New HRMS version',
    date: '2026-03-05',
    desc: `New HRMS version deployed. Contact HR for any issues.`
  }];
  const upcomingEvents = [{
    title: 'Annual Day',
    date: '2026-04-01',
    type: 'Work'
  }];
  const myGoals = [];

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      <Row gutter={[16, 16]}>
        {/* Recent Notifications */}
        <Col xs={24} lg={16} style={{ maxHeight: WIDGET_COL_MAX_HEIGHT }}>
          <WidgetCard title="Recent Notifications" icon={<BellOutlined />} iconColor="#f5222d">
            <List
              dataSource={recentNotifications}
              locale={{ emptyText: 'No recent notifications' }}
              style={{ maxHeight: WIDGET_LIST_MAX_HEIGHT, overflowY: 'auto', padding: '0 5px' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>{item.title}</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>{convertDate(item.date)}</Text>
                    </div>}
                    description={<Text type="secondary" style={{ fontSize: '12px' }}>{item.desc}</Text>}
                  />
                </List.Item>
              )}
            />
          </WidgetCard>
        </Col>

        {/* Upcoming Events */}
        <Col xs={24} lg={8} style={{ maxHeight: WIDGET_COL_MAX_HEIGHT }}>
          <WidgetCard title="Upcoming Events" icon={<CalendarOutlined />} iconColor="#1890ff">
            <List
              dataSource={upcomingEvents}
              locale={{ emptyText: 'No upcoming events' }}
              style={{ maxHeight: WIDGET_LIST_MAX_HEIGHT, overflowY: 'auto' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<Text strong>{item.title}</Text>}
                    description={<Badge status={item.type === 'Work' ? 'processing' : 'warning'} text={convertDate(item.date)} />}
                  />
                </List.Item>
              )}
            />
          </WidgetCard>
        </Col>

        {/* People on Leave */}
        <Col xs={24} sm={12} lg={8} style={{ maxHeight: WIDGET_COL_MAX_HEIGHT }}>
          <WidgetCard title="People on Leave" icon={<UserOutlined />} iconColor="#52c41a">
            <List
              loading={loadingPeopleOnLeave}
              dataSource={peopleOnLeave}
              locale={{ emptyText: 'No one on leave this week or next week' }}
              style={{ maxHeight: WIDGET_LIST_MAX_HEIGHT, overflowY: 'auto' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{ cursor: item?.profile_image ? 'pointer' : 'default' }}
                        onClick={() => item?.profile_image && setPreviewImage(item.profile_image)}
                      >
                        <Avatar
                          size={48}
                          src={item?.profile_image}
                          style={{ backgroundColor: '#87d068' }}
                        >
                          {item?.profile_image ? '' : item.employee_name?.charAt(0)}
                        </Avatar>
                      </div>
                    }
                    title={<Text strong>{item.employee_name}</Text>}
                    description={
                      <div style={{ fontSize: '12px' }}>
                        <div>
                          {new Date(item.from_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(item.to_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{item.leave_name} | {item.leave_status}</Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </WidgetCard>
        </Col>

        {/* Upcoming Birthdays */}
        <Col xs={24} sm={12} lg={8} style={{ maxHeight: WIDGET_COL_MAX_HEIGHT }}>
          <WidgetCard title="Upcoming Birthdays" icon={<GiftOutlined />} iconColor="#eb2f96">
            <List
              loading={loadingBirthdays}
              dataSource={birthdayData}
              locale={{ emptyText: 'No upcoming birthdays in the next 1 month' }}
              style={{ maxHeight: WIDGET_LIST_MAX_HEIGHT, overflowY: 'auto' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{ cursor: item?.profile_image ? 'pointer' : 'default' }}
                        onClick={() => item?.profile_image && setPreviewImage(item.profile_image)}
                      >
                        <Avatar
                          size={48}
                          src={item?.profile_image}
                          style={{ backgroundColor: '#13c2c2' }}
                        >
                          {item?.profile_image ? '' : item.employee_name?.charAt(0) || 'N'}
                        </Avatar>
                      </div>
                    }
                    title={<Text strong>{item.employee_name}</Text>}
                    description={
                      <div style={{ fontSize: '12px' }}>
                        <div style={{ marginTop: '2px' }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>{getBirthdayText(item.date)}</Text>
                        </div>
                      </div>}
                  />
                </List.Item>
              )}
            />
          </WidgetCard>
        </Col>

        {/* New Joinees */}
        <Col xs={24} sm={12} lg={8} style={{ maxHeight: WIDGET_COL_MAX_HEIGHT }}>
          <WidgetCard title="New Joinees" icon={<UserAddOutlined />} iconColor="#13c2c2">
            <List
              loading={loadingJoinees}
              dataSource={newJoinees}
              locale={{ emptyText: 'No new joinees in the last 2 months' }}
              style={{ maxHeight: WIDGET_LIST_MAX_HEIGHT, overflowY: 'auto' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{ cursor: item?.profile_image ? 'pointer' : 'default' }}
                        onClick={() => item?.profile_image && setPreviewImage(item.profile_image)}
                      >
                        <Avatar
                          size={48}
                          src={item?.profile_image}
                          style={{ backgroundColor: '#13c2c2' }}
                        >
                          {item?.profile_image ? '' : item.employee_name?.charAt(0) || 'N'}
                        </Avatar>
                      </div>
                    }
                    title={<Text strong>{item.employee_name}</Text>}
                    description={
                      <div style={{ fontSize: '12px' }}>
                        <div>{new Date(item.date_of_joining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div style={{ marginTop: '2px' }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>{item.band} • {item.sub_role}</Text>
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
          <WidgetCard title="Upcoming Holidays" icon={<PushpinOutlined />} iconColor="#fa8c16">
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
          <WidgetCard title="My Goals Progress" icon={<RocketOutlined />} iconColor="#722ed1">
            <Row gutter={[16, 16]}>
              {myGoals.length > 0 ? (
                myGoals.map((goal, index) => (
                  <Col xs={24} sm={8} key={index}>
                    <div style={{ textAlign: 'center', padding: '10px' }}>
                      <Progress type="circle" percent={goal.percent} strokeColor={goal.color} width={80} />
                      <div style={{ marginTop: '12px' }}>
                        <Text strong>{goal.title}</Text>
                      </div>
                    </div>
                  </Col>
                ))
              ) : (
                <Col span={24}>
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    <RocketOutlined style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }} />
                    <div>No active goals found</div>
                  </div>
                </Col>
              )}
            </Row>
          </WidgetCard>
        </Col>
      </Row>

      {/* Hidden Image for Preview */}
      <div style={{ display: 'none' }}>
        <Image
          preview={{
            visible: !!previewImage,
            src: previewImage,
            onVisibleChange: (value) => !value && setPreviewImage(null),
            toolbarRender: () => null
          }}
        />
      </div>
    </div>
  );
};
