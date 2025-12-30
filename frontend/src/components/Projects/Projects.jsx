import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import { getProjectsDetails, addProjects, getEmployeeList, updateProject } from '../../services/api';
import { Button, Input, Modal, Select, message } from 'antd';
import styles from './Projects.module.css';

const { Option } = Select;

function Projects() {
  const [projectData, setProjectData] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newLeadBy, setNewLeadBy] = useState('');

  const getProjectDetailsData = async () => {
    try {
      const res = await getProjectsDetails();
      setProjectData(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching Project Details data:', err);
      setError('Failed to fetch Project Details data');
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
    getProjectDetailsData();
    fetchEmployeeList();
  }, []);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setNewProjectName('');
    setNewClient('');
    setNewLeadBy('');
    setEditProject(null);
    setIsEditing(false);
  };

  const openEditModal = (project) => {
    setEditProject(project);
    setNewProjectName(project.ProjectName);
    setNewClient(project.Client);
    setNewLeadBy(project.LeadBy);
    setModalIsOpen(true);
    setIsEditing(true);
  };

  const handleEmployeeChange = (value) => {
    const selectedEmployee = employeeList.find(employee => employee.employeeId === value);
    if (selectedEmployee) {
      setNewLeadBy(`${selectedEmployee.employeeId}`);
    }
  };

  const handleAddProject = async () => {
    const newProject = {
      projectName: newProjectName,
      client: newClient,
      leadBy: newLeadBy,
    };
    try {
      await addProjects(newProject);
      message.success('Project added successfully');
      closeModal();
      await getProjectDetailsData();
    } catch (error) {
      console.error('Error adding project:', error);
      message.error('Failed to add project');
    }
  };

  const handleEditProject = async () => {
    const updatedProject = {
      projectName: newProjectName,
      client: newClient,
      leadBy: newLeadBy,
    };
    try {
      await updateProject(updatedProject, editProject.ProjectId);
      message.success('Project updated successfully');
      closeModal();
      await getProjectDetailsData();
    } catch (error) {
      console.error('Error updating project:', error);
      message.error('Failed to update project');
    }
  };

  const handleSubmit = async () => {
    setIsAdding(true);
    if (isEditing) {
      await handleEditProject();
    } else {
      await handleAddProject();
    }
    setIsAdding(false);
  };

  const filteredProjects = searchQuery
    ? projectData.filter(
        (project) =>
          project.ProjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.Client.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (project.LeadBy && project.LeadBy.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : projectData;

  return (
    <div className={styles.mainContainer}>
      <h3 className={styles.heading}>Project List</h3>

      <div className={styles.searchContainer}>
        <Input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <CSVLink
          data={filteredProjects}
          headers={[
            { label: 'Project Name', key: 'ProjectName' },
            { label: 'Client', key: 'Client' },
            { label: 'Lead By', key: 'LeadBy' }
          ]}
          filename="project_list.csv"
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
          title={isEditing ? 'Edit Project' : 'Add Project'}
          visible={modalIsOpen}
          onOk={handleSubmit}
          onCancel={closeModal}
          confirmLoading={isAdding}
          okText={isEditing ? 'Update Project' : 'Add Project'}
          okButtonProps={{ className: styles.addButtonContainer }}
          cancelButtonProps={{ style: { display: 'none' } }}
        >
          <Input
            placeholder="Project Name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            style={{ marginBottom: '10px' }}
          />
          <Input
            placeholder="Client"
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
            style={{ marginBottom: '10px' }}
          />
          <Select
            placeholder="Select Lead By"
            style={{ width: '100%', marginBottom: '10px' }}
            onChange={handleEmployeeChange}
            value={newLeadBy || undefined}
          >
            {employeeList.map(employee => (
              <Option key={employee.employeeId} value={employee.employeeId}>
                {`${employee.firstName} ${employee.lastName}`}
              </Option>
            ))}
          </Select>
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
                <th className={styles.th}>Project Name</th>
                <th className={styles.th}>Client</th>
                <th className={styles.th}>Lead By</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.ProjectId}>
                  <td className={styles.td}>{project.ProjectName}</td>
                  <td className={styles.td}>{project.Client}</td>
                  <td className={styles.td}>{project.leadName}</td>
                  <td className={styles.td}>
                    <Button className={styles.addButtonContainer} onClick={() => openEditModal(project)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Projects;
