import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import { getTeamLeadList, addTeamLead, getEmployeeList } from '../../services/api';
import { Button, Modal, Input, Select, message } from 'antd';
import styles from './TeamLead.module.css';

const { Option } = Select;

function TeamLead() {
  const [teamLeadData, setTeamLeadData] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamLead, setTeamLead] = useState('');
  const [teamLeadName, setTeamLeadName] = useState('');
  const [teamLeadEmail, setTeamLeadEmail] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const getTeamLeadListData = async () => {
    try {
      const res = await getTeamLeadList();
      setTeamLeadData(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching Team Lead data:', err);
      setError('Failed to fetch Team Lead data');
      setLoading(false);
    }
  };

  const fetchEmployeeList = async () => {
    try {
      const res = await getEmployeeList();
      setEmployeeList(res.data);
    } catch (err) {
      console.error('Error fetching employee list:', err);
      setError('Failed to fetch employee list');
    }
  };

  useEffect(() => {
    getTeamLeadListData();
    fetchEmployeeList();
  }, []);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setTeamLead('');
    setTeamLeadName('');
    setTeamLeadEmail('');
  };

  const handleEmployeeChange = (value, option) => {
    const selectedEmployee = employeeList.find(employee => employee.employeeId === value);
    if (selectedEmployee) {
      setTeamLead(value); 
      setTeamLeadName(`${selectedEmployee.firstName} ${selectedEmployee.lastName}`);
      setTeamLeadEmail(selectedEmployee.email); 
    }
  };

  const handleAddTeamLead = async () => {
    setIsAdding(true);
    const payload = {
      employeeId: teamLead,
      teamLeadName: teamLeadName,
      teamLeadEmail: teamLeadEmail
    };
    try {
      await addTeamLead(payload);
      message.success('Team Lead added successfully');
      closeModal();
      await getTeamLeadListData();
    } catch (error) {
      console.error('Error adding Team Lead:', error);
      message.error('Failed to add Team Lead');
    } finally {
      setIsAdding(false);
    }
  };

  const filteredTeamLeads = searchQuery
    ? teamLeadData.filter(
      (lead) =>
        lead.TeamLeadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.TeamLeadEmail.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : teamLeadData;

  return (
    <div className={styles.mainContainer}>
      <h3 className={styles.heading}>Team Lead List</h3>

      <div className={styles.searchContainer}>
        <Input
          type="text"
          placeholder="Search team leads..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
          <CSVLink
            data={filteredTeamLeads}
            headers={[
              { label: 'Team Lead Name', key: 'TeamLeadName' },
              { label: 'Team Lead Email', key: 'TeamLeadEmail' }
            ]}
            filename="team_lead_list.csv"
            className={styles.downloadButton}
          >
            Download
          </CSVLink>
        <Button
          onClick={openModal}
          loading={isAdding}
          disabled={isAdding}
          className={styles.addButtonContainer}
        >
          {isAdding ? 'Adding...' : 'Add'}
        </Button>
        <Modal
          title="Add Team Lead"
          visible={modalIsOpen}
          onOk={handleAddTeamLead}
          onCancel={closeModal}
          confirmLoading={isAdding}
          okText="Add Team Lead"
          okButtonProps={{ className: styles.addButtonContainer }}
          cancelButtonProps={{ style: { display: 'none' } }}
        >
          <Select
            showSearch
            placeholder="Select Team Lead"
            style={{ width: '100%', marginBottom: '10px' }}
            onChange={handleEmployeeChange}
            value={teamLead || undefined}
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {employeeList.map(employee => (
              <Option key={employee.employeeId} value={employee.employeeId}>
                {`${employee.firstName} ${employee.lastName}`}
              </Option>
            ))}
          </Select>

          <Input
            type="text"
            value={teamLeadEmail}
            placeholder="Team Lead Email"
            disabled
            className={styles.inputField}
          />
        </Modal>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p>{error}</p>
        ) : (
          <table className={styles.table}>
            <thead className={styles.stickyHeader}>
              <tr className={styles.headRow}>
                <th className={styles.th}>Team Lead Name</th>
                <th className={styles.th}>Team Lead Email</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeamLeads.map((lead) => (
                <tr key={lead.TeamLeadId}>
                  <td className={styles.td}>{lead.TeamLeadName}</td>
                  <td className={styles.td}>{lead.TeamLeadEmail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default TeamLead;
