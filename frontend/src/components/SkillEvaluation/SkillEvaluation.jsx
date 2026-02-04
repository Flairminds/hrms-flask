import React, { useEffect, useState } from "react";
import { Table, Input, Button, Form, InputNumber, Checkbox, Tabs, Modal, message, Select, Tooltip } from 'antd';
import styles from "./SkillEvaluation.module.css";
import axios from 'axios';
import Cookies from 'js-cookie';
// import skillEvaluationIcon from "../../assets/sidebarIcons/skills.svg";
import { SkillEvaluationAddNewSkill } from '../SkillEvaluationAddNewSkill/SkillEvaluationAddNewSkill';
import { SkillEvaluationReviewForm } from '../SkillEvaluationReviewForm/SkillEvaluationReviewForm';
import { API_BASE_URL } from '../../services/api';


const { TabPane } = Tabs;

export const SkillEvaluation = ({ employee, onClose }) => {
  const [pendingReviews, setPendingReviews] = useState({});
  const [employeeSkills, setEmployeeSkills] = useState(employee?.Skills || { Primary: [], Secondary: [], CrossTechSkill: [] });
  const [skillsList, setSkillsList] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    console.log("useEffect triggered with employee:", employee);
    (async () => {
      await fetchSkillsList();
      if (employee && employee.EmployeeId) {
        console.log("Loading skills for employeeId:", employee.EmployeeId);
        await loadEmployeeSkills(employee.EmployeeId);
      } else {
        console.log("No valid employee or EmployeeId:", employee);
      }
    })();
  }, [employee]);

  const fetchSkillsList = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/skills/employee`);
      console.log("Skills list response:", response.data);
      setSkillsList(response.data.data || []);
    } catch (error) {
      console.error('Error fetching skills list:', error.response?.data || error.message);
      message.error('Failed to load skills list');
    }
  };

  const loadEmployeeSkills = async (employeeId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/skill-statuses/${employeeId}`);
      console.log("Skill statuses response for employeeId", employeeId, ":", response.data);
      let statuses = response.data.data || [];
      const updatedPendingReviews = {};
      const updatedSkills = { Primary: [...employeeSkills.Primary], Secondary: [...employeeSkills.Secondary], CrossTechSkill: [...employeeSkills.CrossTechSkill] }; // Deep copy

      for (const status of statuses) {
        const skillType = status.SkillLevel || status.skillType || "Secondary"; // Prioritize SkillLevel from API
        const skillName = status.SkillName || skillsList.find(s => s.SkillId === status.SkillId)?.SkillName || "Unknown";
        const isNew = status.IsNew || false;
        const existingSkillIndex = updatedSkills[skillType].findIndex(s => s.SkillId === status.SkillId);

        updatedPendingReviews[status.SkillId] = {
          reviewId: status.ReviewId,
          comments: status.Comments || "",
          isReady: status.IsReady || false,
          evaluatorScore: status.EvaluatorScore || null,
          skillId: status.SkillId,
          skillName,
          isNew,
          reviewedBy: status.EvaluatorName || "",
          reviewedById: status.EvaluatorId || "",
          reviewDate: status.ReviewDate || null,
          status: status.Status || (isNew ? 'Available' : 'Reviewed'), // Strict status logic
          skillType
        };

        if (existingSkillIndex !== -1) {
          const existingSkill = updatedSkills[skillType][existingSkillIndex];
          updatedSkills[skillType][existingSkillIndex] = {
            ...existingSkill,
            EvaluatorScore: status.EvaluatorScore,
            isReady: status.IsReady || false,
            SelfEvaluation: status.SelfEvaluation !== undefined ? status.SelfEvaluation : existingSkill.SelfEvaluation || 0.0 // Preserve self score
          };
        } else {
          updatedSkills[skillType].push({
            SkillId: status.SkillId,
            SkillName: skillName,
            SelfEvaluation: status.SelfEvaluation || 0.0,
            EvaluatorScore: status.EvaluatorScore,
            isReady: status.IsReady || false
          });
        }
      }
      console.log("Updated employeeSkills:", updatedSkills);
      console.log("Updated pendingReviews:", updatedPendingReviews);
      setPendingReviews(prev => ({ ...prev, ...updatedPendingReviews }));
      setEmployeeSkills(updatedSkills);
    } catch (error) {
      console.error('Error fetching skill statuses for employeeId', employeeId, ':', error.response?.data || error.message);
      message.error('Failed to load skill statuses');
      setPendingReviews({});
      setEmployeeSkills(employee?.Skills || { Primary: [], Secondary: [], CrossTechSkill: [] });
    }
  };

  // const handleReviewSubmit = async (skillId, formData) => {
  //   try {
  //     const reviewData = { ...pendingReviews[skillId], ...formData };
  //     if (reviewData.evaluatorScore < 0 || reviewData.evaluatorScore > 5) {
  //       message.error('Evaluator score must be between 0 and 5');
  //       return;
  //     }
  //     const payload = {
  //       employeeId: employee.EmployeeId,
  //       skillId,
  //       evaluatorId: Cookies.get('employeeId'),
  //       evaluatorScore: parseFloat(reviewData.evaluatorScore || 1),
  //       comments: reviewData.comments || "",
  //       isReady: reviewData.isReady || false,
  //       reviewId: reviewData.reviewId || null
  //     };
  //     const response = await axios.post(`${API_BASE_URL}/save-review`, payload);
  //     message.success('Review saved successfully');

  //     const evaluatorName = response.data.data.evaluatorName;
  //     setPendingReviews(prev => ({
  //       ...prev,
  //       [skillId]: {
  //         ...prev[skillId],
  //         reviewId: response.data.data.reviewId,
  //         comments: reviewData.comments || "",
  //         evaluatorScore: parseFloat(reviewData.evaluatorScore || 1),
  //         isReady: reviewData.isReady || false,
  //         skillId,
  //         isNew: prev[skillId]?.isNew || false, // Preserve IsNew
  //         reviewedBy: evaluatorName,
  //         reviewedById: Cookies.get('employeeId'),
  //         reviewDate: new Date().toISOString(),
  //         status: 'Reviewed'
  //       }
  //     }));

  //     const skillType = pendingReviews[skillId].skillType || "Secondary";
  //     setEmployeeSkills(prev => ({
  //       ...prev,
  //       [skillType]: prev[skillType].map(skill =>
  //         skill.SkillId === skillId ? { ...skill, EvaluatorScore: parseFloat(reviewData.evaluatorScore || 1), isReady: reviewData.isReady } : skill
  //       )
  //     }));
  //     setExpandedRow(null);
  //   } catch (error) {
  //     console.error('Error saving review:', error.response?.data || error.message);
  //     // message.error(error.response?.data?.message || 'Failed to save review');
  //   }
  // };


  const handleReviewSubmit = async (skillId, formData) => {
    console.log("handleReviewSubmit triggered", { skillId, formData });

    try {
      const reviewData = { ...pendingReviews[skillId], ...formData };
      console.log("Merged reviewData:", reviewData);

      if (reviewData.evaluatorScore < 0 || reviewData.evaluatorScore > 5) {
        console.warn("Invalid evaluatorScore:", reviewData.evaluatorScore);
        message.error('Evaluator score must be between 0 and 5');
        return;
      }

      const payload = {
        employeeId: employee.EmployeeId,
        skillId,
        evaluatorId: Cookies.get('employeeId'),
        evaluatorScore: parseFloat(reviewData.evaluatorScore || 1),
        comments: reviewData.comments || "",
        isReady: reviewData.isReady || false,
        reviewId: reviewData.reviewId || null
      };
      console.log("Payload to send:", payload);

      const response = await axios.post(`${API_BASE_URL}/save-review`, payload);
      console.log("API Response:", response.data);

      message.success('Review saved successfully');

      const evaluatorName = response.data.data.evaluatorName;
      console.log("Evaluator Name:", evaluatorName);

      setPendingReviews(prev => {
        const updated = {
          ...prev,
          [skillId]: {
            ...prev[skillId],
            reviewId: response.data.data.reviewId,
            comments: reviewData.comments || "",
            evaluatorScore: parseFloat(reviewData.evaluatorScore || 1),
            isReady: reviewData.isReady || false,
            skillId,
            isNew: prev[skillId]?.isNew || false, // Preserve IsNew
            reviewedBy: evaluatorName,
            reviewedById: Cookies.get('employeeId'),
            reviewDate: new Date().toISOString(),
            status: 'Reviewed'
          }
        };
        console.log("Updated pendingReviews:", updated);
        return updated;
      });

      // console.log("pendingReviews-------:", pendingReviews);
      // const skillType = pendingReviews[skillId].skillType || "Secondary";
      // console.log("SkillType for employeeSkills update:", skillType);

      // setEmployeeSkills(prev => {
      //   const updatedSkills = {
      //     ...prev,
      //     [skillType]: prev[skillType].map(skill =>
      //       skill.SkillId === skillId
      //         ? { ...skill, EvaluatorScore: parseFloat(reviewData.evaluatorScore || 1), isReady: reviewData.isReady }
      //         : skill
      //     )
      //   };
      //   console.log("Updated employeeSkills:", updatedSkills);
      //   return updatedSkills;
      // });

      setExpandedRow(null);
      console.log("Row collapsed after successful submit.");
    } catch (error) {
      console.error('Error saving review:', error.response?.data || error.message);
      console.error("Full error object:", error); // Extra debug info
      // message.error(error.response?.data?.message || 'Failed to save review');
    }
  };



  const handleAddNewSkill = async (newSkillData) => {
    try {
      const { skillId, skillName, skillType, evaluatorScore, isReady } = newSkillData;
      if (!skillId && !skillName) {
        message.error('Please select or enter a skill name');
        return;
      }
      if (evaluatorScore < 0 || evaluatorScore > 5) {
        message.error('Evaluator score must be between 0 and 5');
        return;
      }
      const allExistingSkills = [
        ...(employeeSkills.Primary || []),
        ...(employeeSkills.Secondary || []),
        ...(employeeSkills.CrossTechSkill || [])
      ];
      const skillExists = allExistingSkills.some(s =>
        skillId ? s.SkillId === skillId : s.SkillName.toLowerCase() === skillName.toLowerCase()
      );
      if (skillExists) {
        message.error('This skill is already assigned to the employee');
        return;
      }
      const evaluatorId = Cookies.get('employeeId');

      const skillPayload = {
        employeeId: employee.EmployeeId,
        skillName: skillName || skillsList.find(s => s.SkillId === skillId)?.SkillName || "",
        skillType,
        selfScore: null,
        isReady,
        evaluatorId
      };
      const skillResponse = await axios.post(`${API_BASE_URL}/add-employee-skill`, skillPayload);
      const newSkillId = skillResponse.data.data.skillId;

      const reviewPayload = {
        employeeId: employee.EmployeeId,
        skillId: newSkillId,
        evaluatorId,
        evaluatorScore: parseFloat(evaluatorScore),
        comments: "",
        isReady,
        reviewId: null
      };
      const reviewResponse = await axios.post(`${API_BASE_URL}/save-review`, reviewPayload);

      message.success('Skill and review added successfully');

      setEmployeeSkills(prev => ({
        ...prev,
        [skillType]: [
          ...prev[skillType],
          {
            SkillId: newSkillId,
            SkillName: skillPayload.skillName,
            SelfEvaluation: null,
            EvaluatorScore: parseFloat(evaluatorScore),
            isReady
          }
        ]
      }));

      setPendingReviews(prev => ({
        ...prev,
        [newSkillId]: {
          reviewId: reviewResponse.data.data.reviewId,
          comments: "",
          evaluatorScore: parseFloat(evaluatorScore),
          isReady,
          skillId: newSkillId,
          skillName: skillPayload.skillName,
          isNew: true,
          reviewedBy: reviewResponse.data.data.evaluatorName,
          reviewedById: evaluatorId,
          reviewDate: new Date().toISOString(),
          status: 'Reviewed',
          skillType
        }
      }));
    } catch (error) {
      console.error('Error adding skill or review:', error.response?.data || error.message);
      message.error(error.response?.data?.message || 'Failed to add skill or save review');
    }
  };

  const renderSkillTable = (skills, skillType) => {

    const skillColumns = [
      {
        title: 'Skill Name',
        dataIndex: 'SkillName',
        key: 'SkillName',
        width: '25%',
        render: (text, record) => (
          <Tooltip title={record.reviewedBy && record.reviewDate ? `Reviewed on ${new Date(record.reviewDate).toLocaleString()}` : ''}>
            <span style={{ color: record.reviewedBy ? '#888' : '#000', display: 'flex', alignItems: 'center' }}>
              {text}
              {record.reviewedBy && <span style={{ marginLeft: '8px', color: '#52c41a' }}>✔</span>}
            </span>
          </Tooltip>
        )
      },
      {
        title: 'Self Score',
        dataIndex: 'SelfEvaluation',
        key: 'SelfEvaluation',
        width: '15%',
        render: (text, record) => (
          <span style={{ color: record.reviewedBy ? '#888' : '#000' }}>
            {record.isNew ? 'N/A' : (text)}
          </span>
        )
      },
      {
        title: 'Evaluator Score',
        dataIndex: 'evaluatorScore',
        key: 'evaluatorScore',
        width: '20%',
        render: (_, record) => {
          const review = pendingReviews[record.SkillId];
          return (
            <span style={{ color: record.reviewedBy ? '#888' : '#000' }}>
              {review?.evaluatorScore ?? (record.isNew ? review?.evaluatorScore ?? 'N/A' : 'N/A')}
            </span>
          );
        }
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: '20%',
        render: (_, record) => {
          const review = pendingReviews[record.SkillId] || {};
          const isNew = review.isNew !== undefined ? review.isNew : false;
          const status = isNew
            ? `Skill Added by ${review.reviewedBy || 'Unknown'}`
            : review.reviewedBy
              ? `Reviewed by ${review.reviewedBy}`
              : 'Available for Review';
          return (
            <span
              className={styles.statusBadge}
              style={{
                background: isNew
                  ? 'rgba(24, 144, 255, 0.1)'
                  : review.reviewedBy
                    ? 'rgba(82, 196, 26, 0.1)'
                    : 'rgba(128, 128, 128, 0.1)',
                color: isNew
                  ? '#1890ff'
                  : review.reviewedBy
                    ? '#52c41a'
                    : '#888',
                border: isNew
                  ? '1px solid rgba(24, 144, 255, 0.3)'
                  : review.reviewedBy
                    ? '1px solid rgba(82, 196, 26, 0.3)'
                    : '1px solid rgba(128, 128, 128, 0.3)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              {status}
            </span>
          );
        }
      },
      {
        title: 'Action',
        key: 'action',
        width: '20%',
        render: (_, record) => {
          const isReviewed = record.status === 'Reviewed' && record.reviewedById !== Cookies.get('employeeId');
          return (
            <Button
              type="link"
              onClick={() => setExpandedRow(expandedRow === record.SkillId ? null : record.SkillId)}
              style={{ color: isReviewed ? '#aaa' : '#1890ff', fontWeight: 'bold', cursor: isReviewed ? 'not-allowed' : 'pointer' }}
              disabled={isReviewed}
              title={isReviewed ? `Already reviewed by ${record.reviewedBy}` : 'Click to review/collapse'}
            >
              {expandedRow === record.SkillId ? 'Collapse' : (isReviewed ? 'Reviewed' : 'Review')}
            </Button>
          );
        }
      }
    ];
    const skillsWithIds = skills.map((skill, index) => ({
      ...skill,
      skillId: skill.SkillId || `${skillType}-${index}`,
      skillType,
      ...pendingReviews[skill.SkillId] || {}
    }));
    return (
      <Table
        columns={skillColumns}
        dataSource={skillsWithIds}
        rowKey="skillId"
        pagination={false}
        className={styles.skillTable}
        expandable={{
          expandedRowRender: (record) => expandedRow === record.skillId ? (
            <SkillEvaluationReviewForm
              skill={record}
              review={pendingReviews[record.SkillId] || {}}
              onSubmit={handleReviewSubmit}
              onCancel={() => setExpandedRow(null)}
              expanded={true}
              setExpandedRow={setExpandedRow}
            />
          ) : null,
          expandIcon: () => null,
          expandRowByClick: false,
          expandedRowKeys: expandedRow ? [expandedRow] : [],
          onExpand: (expanded, record) => {
            setExpandedRow(expanded ? record.skillId : null);
          },
          rowClassName: (record) => record.reviewedBy ? styles.reviewedRow : ''
        }}
      />
    );
  };

  return (
    <Modal
      title={employee ? `Evaluate ${employee.Name}` : "Evaluate Employee"}
      open={!!employee}
      onCancel={onClose}
      footer={[<Button key="cancel" onClick={onClose}>Cancel</Button>]}
      width={1000}
    >
      {employee && (
        <div>
          <Tabs defaultActiveKey="1" className={styles.customTabs} tabBarStyle={{ marginBottom: '16px', borderBottom: '1px solid #e0e0e0' }}>
            <TabPane tab={<div style={{ padding: '8px 16px', borderRadius: '6px', fontWeight: '500', background: 'rgba(102, 126, 234, 0.1)', color: '#667eea', border: '1px solid rgba(102, 126, 234, 0.3)' }}>Primary Skills</div>} key="1">
              {renderSkillTable(employeeSkills.Primary, 'Primary')}
            </TabPane>
            <TabPane tab={<div style={{ padding: '8px 16px', borderRadius: '6px', fontWeight: '500', background: 'rgba(255, 159, 67, 0.1)', color: '#ff9f43', border: '1px solid rgba(255, 159, 67, 0.3)' }}>Secondary Skills</div>} key="2">
              {renderSkillTable(employeeSkills.Secondary, 'Secondary')}
            </TabPane>
            <TabPane tab={<div style={{ padding: '8px 16px', borderRadius: '6px', fontWeight: '500', background: 'rgba(52, 231, 228, 0.1)', color: '#34e7e4', border: '1px solid rgba(52, 231, 228, 0.3)' }}>Cross Tech Skills</div>} key="3">
              {renderSkillTable(employeeSkills.CrossTechSkill, 'CrossTechSkill')}
            </TabPane>
          </Tabs>
          <SkillEvaluationAddNewSkill
            skillsList={skillsList}
            onAddSkill={handleAddNewSkill}
            existingSkillIds={[
              ...(employeeSkills.Primary || []).map(s => s.SkillId),
              ...(employeeSkills.Secondary || []).map(s => s.SkillId),
              ...(employeeSkills.CrossTechSkill || []).map(s => s.SkillId)
            ]}
          />
        </div>
      )}
    </Modal>
  );
};

export default SkillEvaluation;