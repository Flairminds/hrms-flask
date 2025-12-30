// import React, { useState, useEffect } from 'react';
// import { Layout, Menu, Table, Button, Modal, Form, Select, DatePicker, Input, message, Collapse } from 'antd';
// import { HomeOutlined, AimOutlined, LineChartOutlined, TeamOutlined } from '@ant-design/icons';
// import GoalForm from '../../components/GoalForm/GoalForm';
// import Cookies from 'js-cookie';
// import styles from './GoalSettingPage.module.css';
// import { getEmployeeGoals, updateGoal, deleteGoal, getAllEmployeeSkills } from '../../services/api';
// import moment from 'moment';

// const { Header, Content } = Layout;
// const { Option } = Select;
// const { Panel } = Collapse;

// export const GoalSettingPage = () => {
//   const currentUserId = Cookies.get('employeeId');
  
//   const [goals, setGoals] = useState([]);
//   const [skills, setSkills] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [editModalVisible, setEditModalVisible] = useState(false);
//   const [editingGoal, setEditingGoal] = useState(null);
//   const [form] = Form.useForm();

//   useEffect(() => {
//     fetchGoals(currentUserId);
//     fetchSkills();
//   }, [currentUserId]);

//   const fetchGoals = async (employeeId) => {
//     try {
//       setLoading(true);
//       const response = await getEmployeeGoals(employeeId);
//       setGoals(response.data.data); // Flask API wraps goals in 'data'
//     } catch (error) {
//       message.error(error.response?.data?.message || 'Failed to fetch goals');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchSkills = async () => {
//     try {
//       const response = await getAllEmployeeSkills();
//       setSkills(response.data);
//     } catch (error) {
//       // message.error(error.response?.data?.message || 'Failed to fetch skills');
//       console.log(error);
//     }
//   };

//   const handleEdit = (goal) => {
//     setEditingGoal(goal);
//     form.setFieldsValue({
//       skillId: goal.skillId || null,
//       customSkillName: goal.skillName && !goal.customSkillName ? '' : goal.skillName, // Adjust for derived skillName
//       targetDate: goal.targetDate ? moment(goal.targetDate) : null,
//     });
//     setEditModalVisible(true);
//   };

//   const handleDelete = async (goalId) => {
//     try {
//       await deleteGoal(goalId);
//       message.success('Goal deleted successfully');
//       setGoals(goals.filter(goal => goal.goalId !== goalId));
//     } catch (error) {
//       message.error(error.response?.data?.message || 'Failed to delete goal');
//     }
//   };

//   const handleUpdate = async (values) => {
//     try {
//       const payload = {
//         skillId: values.skillId || null,
//         customSkillName: values.customSkillName || null,
//         targetDate: values.targetDate ? values.targetDate.format('YYYY-MM-DD') : null,
//       };
//       await updateGoal(editingGoal.goalId, payload);
//       message.success('Goal updated successfully');
//       setEditModalVisible(false);
//       if (currentUserId) fetchGoals(currentUserId);
//     } catch (error) {
//       message.error(error.response?.data?.message || 'Failed to update goal');
//     }
//   };

//   const handleGoalCreated = () => {
//     if (currentUserId) fetchGoals(currentUserId); // Refresh goals after creation
//   };

//   const columns = [
//     {
//       title: 'Skill',
//       dataIndex: 'skillName',
//       key: 'skillName',
//       render: (text, record) => record.skillName || record.customSkillName || 'N/A',
//     },
//     {
//       title: 'Target Date',
//       dataIndex: 'targetDate',
//       key: 'targetDate',
//       render: text => moment(text).format('YYYY-MM-DD'),
//     },
//     {
//       title: 'Set By',
//       dataIndex: 'setByName',
//       key: 'setByName',
//     },
//     {
//       title: 'Goal Type',
//       dataIndex: 'goalType',
//       key: 'goalType',
//       render: (_, record) => {
//         const isSelf = record.employeeId === record.setByEmployeeId;
//         const skillType = record.skillName ? 'Technical' : 'Other'; // Approximate based on skillName presence
//         return `${isSelf ? 'self_' : 'others_'}${skillType}`;
//       },
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (_, record) => (
//         <div>
//           <Button type="link" onClick={() => handleEdit(record)}>Edit</Button>
//           <Button type="link" danger onClick={() => handleDelete(record.goalId)}>Delete</Button>
//         </div>
//       ),
//     },
//   ];

//   const menuItems = [
//     {
//       key: 'dashboard',
//       icon: <HomeOutlined />,
//       label: 'Dashboard',
//     },
//     {
//       key: 'goal',
//       icon: <AimOutlined />,
//       label: 'Goal Setting',
//     },
//     {
//       key: 'progress',
//       icon: <LineChartOutlined />,
//       label: 'Progress',
//     },
//     {
//       key: 'team',
//       icon: <TeamOutlined />,
//       label: 'Team',
//     },
//   ];

//   return (
//     <Layout className={styles.layout}>
//       <Header className={styles.header}>
//         <Menu theme="light" mode="horizontal" defaultSelectedKeys={['goal']} items={menuItems} />
//       </Header>
//       <Content className={styles.content}>
//         <GoalForm currentUserId={currentUserId} onGoalCreated={handleGoalCreated} />
//         <div style={{ padding: '65px', maxWidth: '1000px', margin: '20px auto'}}>
//         <Table
//           columns={columns}
//           dataSource={goals}
//           rowKey="goalId"
//           loading={loading}
//           className={styles.goalTable}
//           title={() => <h3>Existing Goals</h3>}
//         />
//         <Modal
//           title="Edit Goal"
//           open={editModalVisible}
//           onOk={() => form.submit()}
//           onCancel={() => setEditModalVisible(false)}
//           okText="Save"
//         >
//           <Form
//             form={form}
//             onFinish={handleUpdate}
//             validateMessages={{
//               required: '${label} is required!',
//             }}
//           >
//             {editingGoal?.skillId ? (
//               <Form.Item
//                 label="Skill"
//                 name="skillId"
//                 rules={[{ required: true, message: 'Please select a skill' }]}
//               >
//                 <Select
//                   showSearch
//                   placeholder="-- Choose a skill --"
//                   allowClear
//                   filterOption={(input, option) =>
//                     option.children.toLowerCase().includes(input.toLowerCase())
//                   }
//                   optionFilterProp="children"
//                 >
//                   {skills.map(skill => (
//                     <Option key={skill.skillId} value={skill.skillId}>
//                       {skill.skillName}
//                     </Option>
//                   ))}
//                 </Select>
//               </Form.Item>
//             ) : (
//               <Form.Item
//                 label="Custom Skill"
//                 name="customSkillName"
//                 rules={[{ required: true, message: 'Please enter a custom skill' }]}
//               >
//                 <Input placeholder="Enter any skill you want to learn" />
//               </Form.Item>
//             )}
//             <Form.Item
//               label="Target Date"
//               name="targetDate"
//               rules={[{ required: true, message: 'Please select a valid future date' }]}
//             >
//               <DatePicker disabledDate={current => current && current <= moment().endOf('day')} />
//             </Form.Item>
//           </Form>
//         </Modal>
//         </div>
//       </Content>
//     </Layout>
//   );
// };


import React, { useState, useEffect } from 'react';
import { Layout, Menu, Table, Button, Modal, Form, Select, DatePicker, Input, message, Collapse } from 'antd';
import { HomeOutlined, AimOutlined, LineChartOutlined, TeamOutlined } from '@ant-design/icons';
import GoalForm from '../../components/GoalForm/GoalForm';
import Cookies from 'js-cookie';
import styles from './GoalSettingPage.module.css';
import { getEmployeeGoals, updateGoal, deleteGoal, getAllEmployeeSkills } from '../../services/api';
import moment from 'moment';

const { Header, Content } = Layout;
const { Option } = Select;
const { Panel } = Collapse;

export const GoalSettingPage = () => {
  const currentUserId = Cookies.get('employeeId');
  
  const [goals, setGoals] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchGoals(currentUserId);
    fetchSkills();
  }, [currentUserId]);

  const fetchGoals = async (employeeId) => {
    try {
      setLoading(true);
      const response = await getEmployeeGoals(employeeId);
      setGoals(response.data.data); // Flask API wraps goals in 'data'
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await getAllEmployeeSkills();
      setSkills(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    form.setFieldsValue({
      skillId: goal.skillId || null,
      customSkillName: goal.skillName && !goal.customSkillName ? '' : goal.skillName, // Adjust for derived skillName
      targetDate: goal.targetDate ? moment(goal.targetDate) : null,
    });
    setEditModalVisible(true);
  };

  const handleDelete = async (goalId) => {
    try {
      await deleteGoal(goalId);
      message.success('Goal deleted successfully');
      setGoals(goals.filter(goal => goal.goalId !== goalId));
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to delete goal');
    }
  };

  const handleUpdate = async (values) => {
    try {
      const payload = {
        skillId: values.skillId || null,
        customSkillName: values.customSkillName || null,
        targetDate: values.targetDate ? values.targetDate.format('YYYY-MM-DD') : null,
      };
      await updateGoal(editingGoal.goalId, payload);
      message.success('Goal updated successfully');
      setEditModalVisible(false);
      if (currentUserId) fetchGoals(currentUserId);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to update goal');
    }
  };

  const handleGoalCreated = () => {
    if (currentUserId) fetchGoals(currentUserId); // Refresh goals after creation
  };

  const columns = [
    {
      title: 'Skill',
      dataIndex: 'skillName',
      key: 'skillName',
      render: (text, record) => record.skillName || record.customSkillName || 'N/A',
    },
    {
      title: 'Target Date',
      dataIndex: 'targetDate',
      key: 'targetDate',
      render: text => moment(text).format('YYYY-MM-DD'),
    },
    {
      title: 'Set By',
      dataIndex: 'setByName',
      key: 'setByName',
    },
    {
      title: 'For Employee',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text, record) => record.employeeName || 'N/A',
    },
    {
      title: 'Goal Type',
      dataIndex: 'goalType',
      key: 'goalType',
      render: (_, record) => {
        const isSelf = record.employeeId === record.setByEmployeeId;
        const skillType = record.skillName ? 'Technical' : 'Other';
        return `${isSelf ? 'Self' : 'Others'} - ${skillType}`;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div>
          <Button type="link" onClick={() => handleEdit(record)}>Edit</Button>
          <Button type="link" danger onClick={() => handleDelete(record.goalId)}>Delete</Button>
        </div>
      ),
    },
  ];

  const menuItems = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'goal',
      icon: <AimOutlined />,
      label: 'Goal Setting',
    },
    {
      key: 'progress',
      icon: <LineChartOutlined />,
      label: 'Progress',
    },
    {
      key: 'team',
      icon: <TeamOutlined />,
      label: 'Team',
    },
  ];

  return (
    <Layout className={styles.layout}>
      {/* <Header className={styles.header}>
        <Menu theme="light" mode="horizontal" defaultSelectedKeys={['goal']} items={menuItems} />
      </Header> */}
      <Content className={styles.content}>
        <GoalForm currentUserId={currentUserId} onGoalCreated={handleGoalCreated} />
        <div style={{ padding: '65px', maxWidth: '1000px', margin: '20px auto' }}>
          <Table
            columns={columns}
            dataSource={goals}
            rowKey="goalId"
            loading={loading}
            className={styles.goalTable}
            title={() => <h3>My Goals and Goals Set for Others</h3>}
          />
          <Modal
            title="Edit Goal"
            open={editModalVisible}
            onOk={() => form.submit()}
            onCancel={() => setEditModalVisible(false)}
            okText="Save"
          >
            <Form
              form={form}
              onFinish={handleUpdate}
              validateMessages={{
                required: '${label} is required!',
              }}
            >
              {editingGoal?.skillId ? (
                <Form.Item
                  label="Skill"
                  name="skillId"
                  rules={[{ required: true, message: 'Please select a skill' }]}
                >
                  <Select
                    showSearch
                    placeholder="-- Choose a skill --"
                    allowClear
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                    optionFilterProp="children"
                  >
                    {skills.map(skill => (
                      <Option key={skill.skillId} value={skill.skillId}>
                        {skill.skillName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : (
                <Form.Item
                  label="Custom Skill"
                  name="customSkillName"
                  rules={[{ required: true, message: 'Please enter a custom skill' }]}
                >
                  <Input placeholder="Enter any skill you want to learn" />
                </Form.Item>
              )}
              <Form.Item
                label="Target Date"
                name="targetDate"
                rules={[{ required: true, message: 'Please select a valid future date' }]}
              >
                <DatePicker disabledDate={current => current && current <= moment().endOf('day')} />
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </Content>
    </Layout>
  );
};