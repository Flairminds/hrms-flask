// import React, { useState, useEffect } from 'react';
// import { Radio, Select, Input, DatePicker, Button, Collapse, message } from 'antd';
// import Cookies from 'js-cookie';
// import moment from 'moment';
// import styles from './GoalForm.module.css';
// import { getAllEmployeeSkills, getEmployeeList, createGoal } from '../../services/api';

// const { Option } = Select;

// const GoalForm = ({ onGoalCreated }) => {
//   const [goalType, setGoalType] = useState('self');
//   const [employeeId, setEmployeeId] = useState(null);
//   const [skillId, setSkillId] = useState(null);
//   const [customSkillName, setCustomSkillName] = useState('');
//   const [targetDate, setTargetDate] = useState(null);
//   const [employees, setEmployees] = useState([]);
//   const [skills, setSkills] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [errors, setErrors] = useState({});

//   useEffect(() => {
//     fetchSkills();
//     if (goalType === 'others') {
//       fetchEmployees();
//     }
//   }, [goalType]);



//   useEffect(() => {
//     fetchSkills();
//     if (goalType === 'others') {
//       fetchEmployees();
//     }
//   }, [goalType]);

//   const fetchSkills = async () => {
//     try {
//       setLoading(true);
//       const response = await getAllEmployeeSkills();
//       setSkills(response.data);
//     }  finally {
//       setLoading(false);
//     }
//   };

//   const fetchEmployees = async () => {
//     try {
//       setLoading(true);
//       const response = await getEmployeeList();
   
      
//       setEmployees(response.data);
//     } catch (error) {
//       message.error(error.response?.data?.message || 'Failed to fetch employees');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGoalTypeChange = (e) => {
//     setGoalType(e.target.value);
//     setEmployeeId(null);
//     setErrors({});
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     const currentUserId = Cookies.get('employeeId');
//     if (goalType === 'self' && !currentUserId) {
//       newErrors.employeeId = 'No employee ID found. Please log in.';
//     }
//     if (goalType === 'others' && !employeeId) {
//       newErrors.employeeId = 'Please select an employee';
//     }
//     const activePanel = document.querySelector('.ant-collapse-item-active');
//     if (!activePanel) {
//       message.warning('Please expand either Tech Skills or Other Skills section');
//       return false;
//     }
//     if (activePanel.querySelector('.ant-collapse-header[aria-expanded="true"]')?.textContent.includes('Tech Skills')) {
//       if (!skillId) newErrors.skillId = 'Please select a skill';
//       if (!targetDate) newErrors.targetDate = 'Please select a valid future date';
//       else if (moment(targetDate).isSameOrBefore(moment(), 'day')) {
//         newErrors.targetDate = 'Please select a future date';
//       }
//     } else {
//       if (!customSkillName.trim()) newErrors.customSkillName = 'Please enter a skill';
//       if (!targetDate) newErrors.targetDate = 'Please select a valid future date';
//       else if (moment(targetDate).isSameOrBefore(moment(), 'day')) {
//         newErrors.targetDate = 'Please select a future date';
//       }
//     }
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = async () => {
//     if (!validateForm()) return;

//     setLoading(true);
//     try {
//       const currentUserId = Cookies.get('employeeId');
//       const payload = {
//         employeeId: goalType === 'self' ? currentUserId : employeeId,
//         skillId: skillId || null,
//         customSkillName: customSkillName.trim() || null,
//         targetDate: moment(targetDate).format('YYYY-MM-DD'),
//         ...(goalType === 'others' && currentUserId && { setByEmployeeId: currentUserId }),
//       };
//       const activePanel = document.querySelector('.ant-collapse-item-active .ant-collapse-header[aria-expanded="true"]')?.textContent;
//       await createGoal(payload);
//       message.success('Goal saved successfully');
//       resetForm();
//       if (onGoalCreated) onGoalCreated();
//     } catch (error) {
//       message.error(error.response?.data?.message || 'Failed to save goal');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const resetForm = () => {
//     setSkillId(null);
//     setCustomSkillName('');
//     setTargetDate(null);
//     setEmployeeId(null);
//     setErrors({});
//   };

//   // Collapse items for AntD 5+, defined after hooks and logic
//   const collapseItems = [
//     {
//       key: 'tech',
//       label: <><i className="bi bi-code-slash"></i> Tech Skills</>,
//       children: (
//         <>
//           <div className={styles.formGroup}>
//             <label className={styles.formLabel}>
//               <i className="bi bi-tools"></i> Select Technical Skill
//             </label>
//             <Select
//               showSearch
//               placeholder="-- Choose a skill --"
//               value={skillId}
//               onChange={setSkillId}
//               className={styles.formSelect}
//               status={errors.skillId ? 'error' : ''}
//               filterOption={(input, option) => {
//                 const name = option.children.toLowerCase();
//                 return name.includes(input.toLowerCase());
//               }}
//               optionFilterProp="children"
//             >
//               {skills.map(skill => (
//                 <Option key={skill.skillId} value={skill.skillId}>
//                   {skill.skillName}
//                 </Option>
//               ))}
//             </Select>
//             {errors.skillId && <div className={styles.errorMessage}>{errors.skillId}</div>}
//           </div>
//           <div className={styles.formGroup}>
//             <label className={styles.formLabel}>
//               <i className="bi bi-calendar-event"></i> Target Completion Date
//             </label>
//             <DatePicker
//               value={targetDate ? moment(targetDate) : null}
//               onChange={date => setTargetDate(date ? date.format('YYYY-MM-DD') : null)}
//               className={styles.formControl}
//               status={errors.targetDate ? 'error' : ''}
//               disabledDate={current => current && current <= moment().endOf('day')}
//             />
//             {errors.targetDate && <div className={styles.errorMessage}>{errors.targetDate}</div>}
//           </div>
//         </>
//       ),
//     },
//     {
//       key: 'other',
//       label: <><i className="bi bi-lightbulb"></i> Other Skills</>,
//       children: (
//         <>
//           <div className={styles.formGroup}>
//             <label className={styles.formLabel}>
//               <i className="bi bi-pencil"></i> Custom Skill
//             </label>
//             <Input
//               placeholder="Enter any skill you want to learn"
//               value={customSkillName}
//               onChange={e => setCustomSkillName(e.target.value)}
//               className={styles.formControl}
//               status={errors.customSkillName ? 'error' : ''}
//             />
//             {errors.customSkillName && <div className={styles.errorMessage}>{errors.customSkillName}</div>}
//           </div>
//           <div className={styles.formGroup}>
//             <label className={styles.formLabel}>
//               <i className="bi bi-calendar-event"></i> Target Completion Date
//             </label>
//             <DatePicker
//               value={targetDate ? moment(targetDate) : null}
//               onChange={date => setTargetDate(date ? date.format('YYYY-MM-DD') : null)}
//               className={styles.formControl}
//               status={errors.targetDate ? 'error' : ''}
//               disabledDate={current => current && current <= moment().endOf('day')}
//             />
//             {errors.targetDate && <div className={styles.errorMessage}>{errors.targetDate}</div>}
//           </div>
//         </>
//       ),
//     },
//   ];

//   return (
//     <div className={styles.goalForm}>
//       <h2 className={styles.title}>
//         <i className="bi bi-target"></i> Set Goals
//       </h2>
//       <p className={styles.subtitle}>Define and track personal or team objectives</p>

//       <Radio.Group value={goalType} onChange={handleGoalTypeChange} className={styles.radioGroup}>
//         <Radio value="self" className={styles.radioOption}>
//           <i className="bi bi-person"></i> For Self
//           <div className={styles.description}>Set personal development goals</div>
//         </Radio>
//         <Radio value="others" className={styles.radioOption}>
//           <i className="bi bi-people"></i> For Others
//           <div className={styles.description}>Set goals for team members</div>
//         </Radio>
//       </Radio.Group>

//       {goalType === 'others' && (
//         <div className={styles.employeeSection}>
//           <label className={styles.formLabel}>
//             <i className="bi bi-person-badge"></i> Select Employee
//           </label>
//           <Select
//             showSearch
//             placeholder="-- Choose an employee --"
//             value={employeeId}
//             onChange={setEmployeeId}
//             className={styles.formSelect}
//             status={errors.employeeId ? 'error' : ''}
//             filterOption={(input, option) => {
//               const name = option.children.toLowerCase();
//               return name.includes(input.toLowerCase());
//             }}
//             optionFilterProp="children"
//           >
//             {employees.map(emp => (
//               <Option key={emp.employeeId} value={emp.employeeId}>
//                 {emp.firstName + ' ' + emp.lastName}
//               </Option>
//             ))}
//           </Select>
//           {errors.employeeId && <div className={styles.errorMessage}>{errors.employeeId}</div>}
//         </div>
//       )}

//       {/* Collapse Items Array for AntD 5+ */}
//       <Collapse accordion items={collapseItems} />


//       <div className={styles.submitButtonContainer}>
//         <Button
//           type="primary"
//           size="large"
//           loading={loading}
//           onClick={handleSubmit}
//           className={styles.submitButton}
//         >
//           <i className="bi bi-check-circle"></i> Save Goal
//         </Button>
//       </div>
//     </div>
//   );
// };

// export default GoalForm;





import React, { useState, useEffect } from 'react';
import { Radio, Select, Input, DatePicker, Button, Collapse, message } from 'antd';
import Cookies from 'js-cookie';
import moment from 'moment';
import styles from './GoalForm.module.css';
import { getAllEmployeeSkills, getEmployeeListForEvaluators, createGoal } from '../../services/api';
import  { getAllEmployeeEvaluators } from '../../services/api';

const { Option } = Select;

const GoalForm = ({ onGoalCreated }) => {
  const [goalType, setGoalType] = useState('self');
  const [employeeId, setEmployeeId] = useState(null);
  const [skillId, setSkillId] = useState(null);
  const [customSkillName, setCustomSkillName] = useState('');
  const [targetDate, setTargetDate] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isEvaluator, setIsEvaluator] = useState(false);

  useEffect(() => {
    fetchSkills();
    if (goalType === 'others') {
      fetchEmployees();
    }

    const checkEvaluatorStatus = async () => {
          try {
            const employeeId = Cookies.get('employeeId');
            if (!employeeId) return;
    
            const response = await getAllEmployeeEvaluators();
            const evaluators = response.data;
            const isUserEvaluator = evaluators.some(emp => emp.evaluatorIds.includes(employeeId));
            setIsEvaluator(isUserEvaluator);
          } catch (error) {
            console.error('Error checking evaluator status:', error);
          }
        };
    

    checkEvaluatorStatus();

  }, [goalType]);



  useEffect(() => {
    fetchSkills();
    if (goalType === 'others') {
      fetchEmployees();
    }
  }, [goalType]);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const response = await getAllEmployeeSkills();
      setSkills(response.data);
    }  finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const currentUserId = Cookies.get('employeeId');
      setLoading(true);
      const response = await getEmployeeListForEvaluators(currentUserId);
   
      
      setEmployees(response.data);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleGoalTypeChange = (e) => {
    setGoalType(e.target.value);
    setEmployeeId(null);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    const currentUserId = Cookies.get('employeeId');
    if (goalType === 'self' && !currentUserId) {
      newErrors.employeeId = 'No employee ID found. Please log in.';
    }
    if (goalType === 'others' && !employeeId) {
      newErrors.employeeId = 'Please select an employee';
    }
    const activePanel = document.querySelector('.ant-collapse-item-active');
    if (!activePanel) {
      message.warning('Please expand either Tech Skills or Other Skills section');
      return false;
    }
    if (activePanel.querySelector('.ant-collapse-header[aria-expanded="true"]')?.textContent.includes('Tech Skills')) {
      if (!skillId) newErrors.skillId = 'Please select a skill';
      if (!targetDate) newErrors.targetDate = 'Please select a valid future date';
      else if (moment(targetDate).isSameOrBefore(moment(), 'day')) {
        newErrors.targetDate = 'Please select a future date';
      }
    } else {
      if (!customSkillName.trim()) newErrors.customSkillName = 'Please enter a skill';
      if (!targetDate) newErrors.targetDate = 'Please select a valid future date';
      else if (moment(targetDate).isSameOrBefore(moment(), 'day')) {
        newErrors.targetDate = 'Please select a future date';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const currentUserId = Cookies.get('employeeId');
      const payload = {
        employeeId: goalType === 'self' ? currentUserId : employeeId,
        skillId: skillId || null,
        customSkillName: customSkillName.trim() || null,
        targetDate: moment(targetDate).format('YYYY-MM-DD'),
        ...(goalType === 'others' && currentUserId && { setByEmployeeId: currentUserId }),
      };
      const activePanel = document.querySelector('.ant-collapse-item-active .ant-collapse-header[aria-expanded="true"]')?.textContent;
      await createGoal(payload);
      message.success('Goal saved successfully');
      resetForm();
      if (onGoalCreated) onGoalCreated();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to save goal');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSkillId(null);
    setCustomSkillName('');
    setTargetDate(null);
    setEmployeeId(null);
    setErrors({});
  };

  // Collapse items for AntD 5+, defined after hooks and logic
  const collapseItems = [
    {
      key: 'tech',
      label: <><i className="bi bi-code-slash"></i> Tech Skills</>,
      children: (
        <>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <i className="bi bi-tools"></i> Select Technical Skill
            </label>
            <Select
              showSearch
              placeholder="-- Choose a skill --"
              value={skillId}
              onChange={setSkillId}
              className={styles.formSelect}
              status={errors.skillId ? 'error' : ''}
              filterOption={(input, option) => {
                const name = option.children.toLowerCase();
                return name.includes(input.toLowerCase());
              }}
              optionFilterProp="children"
            >
              {skills.map(skill => (
                <Option key={skill.skillId} value={skill.skillId}>
                  {skill.skillName}
                </Option>
              ))}
            </Select>
            {errors.skillId && <div className={styles.errorMessage}>{errors.skillId}</div>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <i className="bi bi-calendar-event"></i> Target Completion Date
            </label>
            <DatePicker
              value={targetDate ? moment(targetDate) : null}
              onChange={date => setTargetDate(date ? date.format('YYYY-MM-DD') : null)}
              className={styles.formControl}
              status={errors.targetDate ? 'error' : ''}
              disabledDate={current => current && current <= moment().endOf('day')}
            />
            {errors.targetDate && <div className={styles.errorMessage}>{errors.targetDate}</div>}
          </div>
        </>
      ),
    },
    {
      key: 'other',
      label: <><i className="bi bi-lightbulb"></i> Other Skills</>,
      children: (
        <>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <i className="bi bi-pencil"></i> Custom Skill
            </label>
            <Input
              placeholder="Enter any skill you want to learn"
              value={customSkillName}
              onChange={e => setCustomSkillName(e.target.value)}
              className={styles.formControl}
              status={errors.customSkillName ? 'error' : ''}
            />
            {errors.customSkillName && <div className={styles.errorMessage}>{errors.customSkillName}</div>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <i className="bi bi-calendar-event"></i> Target Completion Date
            </label>
            <DatePicker
              value={targetDate ? moment(targetDate) : null}
              onChange={date => setTargetDate(date ? date.format('YYYY-MM-DD') : null)}
              className={styles.formControl}
              status={errors.targetDate ? 'error' : ''}
              disabledDate={current => current && current <= moment().endOf('day')}
            />
            {errors.targetDate && <div className={styles.errorMessage}>{errors.targetDate}</div>}
          </div>
        </>
      ),
    },
  ];

  return (
    <div className={styles.goalForm}>
      <h2 className={styles.title}>
        <i className="bi bi-target"></i> Set Goals
      </h2>
      <p className={styles.subtitle}>Define and track personal or team objectives</p>

      <Radio.Group value={goalType} onChange={handleGoalTypeChange} className={styles.radioGroup}>
        <Radio value="self" className={styles.radioOption}>
          <i className="bi bi-person"></i> For Self
          <div className={styles.description}>Set personal development goals</div>
        </Radio>
        <Radio value="others" className={styles.radioOption}>
          <i className="bi bi-people"></i> For Others
          <div className={styles.description}>Set goals for team members</div>
        </Radio>
      </Radio.Group>

      {goalType === 'others' && (
        <div className={styles.employeeSection}>
          <label className={styles.formLabel}>
            <i className="bi bi-person-badge"></i> Select Employee
          </label>
          <Select
            showSearch
            placeholder="-- Choose an employee --"
            value={employeeId}
            onChange={setEmployeeId}
            className={styles.formSelect}
            status={errors.employeeId ? 'error' : ''}
            filterOption={(input, option) => {
              const name = option.children.toLowerCase();
              return name.includes(input.toLowerCase());
            }}
            optionFilterProp="children"
          >
            {employees.map(emp => (
              <Option key={emp.employeeId} value={emp.employeeId}>
                {emp.firstName + ' ' + emp.lastName}
              </Option>
            ))}
          </Select>
          {errors.employeeId && <div className={styles.errorMessage}>{errors.employeeId}</div>}
        </div>
      )}

      {/* Collapse Items Array for AntD 5+ */}
      <Collapse accordion items={collapseItems} />


      <div className={styles.submitButtonContainer}>
        <Button
          type="primary"
          size="large"
          loading={loading}
          onClick={handleSubmit}
          className={styles.submitButton}
        >
          <i className="bi bi-check-circle"></i> Save Goal
        </Button>
      </div>
    </div>
  );
};

export default GoalForm;

