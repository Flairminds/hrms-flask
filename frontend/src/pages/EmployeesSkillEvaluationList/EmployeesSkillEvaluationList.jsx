import React, { useEffect, useState } from "react";
import { Table, Input, Button } from 'antd';
import styles from "./EmployeesSkillEvaluationList.module.css";
import { getAssignedEmployeesSkills, getAllEmployeeEvaluators } from "../../services/api";
import Cookies from 'js-cookie';
import SkillEvaluation from '../../components/SkillEvaluation/SkillEvaluation';

export const EmployeesSkillEvaluationList = () => {
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [skillData, setSkillData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    (async () => {
      await fetchAssignedEmployees();
    })();
  }, []);

  const fetchAssignedEmployees = async () => {
    try {
      const employeeId = Cookies.get('employeeId');
      if (!employeeId) {
        console.error('No employeeId found in cookies');
        return;
      }
      const evaluatorsResponse = await getAllEmployeeEvaluators();
      const evaluators = evaluatorsResponse.data || [];
      const assigned = evaluators.filter(emp => emp.evaluatorIds && emp.evaluatorIds.includes(employeeId));
      setAssignedEmployees(assigned);
      const skillsResponse = await getAssignedEmployeesSkills();
      let allSkills = skillsResponse.data?.data || skillsResponse.data || [];
      const assignedEmpIds = assigned.map(emp => emp.empId);
      const filteredSkills = Array.isArray(allSkills) ? allSkills.filter(emp => assignedEmpIds.includes(emp.EmployeeId)) : [];
      setSkillData(filteredSkills);
    } catch (error) {
      console.error('Error fetching assigned employees or skills:', error.response?.data || error.message);
      setSkillData([]);
    }
  };

  const columns = [
    { title: 'Employee ID', dataIndex: 'EmployeeId', key: 'EmployeeId' },
    { title: 'Name', dataIndex: 'Name', key: 'Name' },
    {
      title: 'Primary Skills',
      dataIndex: 'PrimarySkills',
      key: 'PrimarySkills',
      render: (_, record) =>
        record.Skills?.Primary?.map(s => `${s.SkillName} (${s.SelfEvaluation ?? 'N/A'})`).join(", ") || "N/A"
    },
    {
      title: 'Secondary Skills',
      dataIndex: 'SecondarySkills',
      key: 'SecondarySkills',
      render: (_, record) =>
        record.Skills?.Secondary?.map(s => `${s.SkillName} (${s.SelfEvaluation ?? 'N/A'})`).join(", ") || "N/A"
    },
    {
      title: 'Cross Tech Skills',
      dataIndex: 'CrossTechSkills',
      key: 'CrossTechSkills',
      render: (_, record) =>
        record.Skills?.CrossTechSkill?.map(s => `${s.SkillName} (${s.SelfEvaluation ?? 'N/A'})`).join(", ") || "N/A"
    },
    {
      title: 'Evaluate',
      key: 'evaluate',
      render: (_, record) => (
        <Button
          type="primary"
          onClick={() => setSelectedEmployee(record)}
        >Evaluate</Button> 
      ),
    },
  ];

  const filteredData = Array.isArray(skillData) ? skillData.filter(employee =>
    employee && employee.Name && employee.Name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];
  console.log("filteredData", filteredData);
  

  return (
    <div className={styles.main}>
      <h2>Skill Evaluation</h2>
      <Input
        placeholder="Search by Employee Name"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={styles.searchInput}
        style={{ marginBottom: 16 }}
      />
      <div style={{ marginBottom: 16, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <small>
          Debug Info: Skill Data Length: {skillData.length},
          Filtered Data Length: {filteredData.length},
          Assigned Employees: {assignedEmployees.length}
        </small>
      </div>
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="EmployeeId"
        pagination={{ pageSize: 5, onChange: () => {}, showSizeChanger: false }}
        className={styles.stableTable}
        locale={{ emptyText: 'No assigned employees found or no skills data available' }}
      />
      {selectedEmployee && (
        <SkillEvaluation
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
};

export default EmployeesSkillEvaluationList;