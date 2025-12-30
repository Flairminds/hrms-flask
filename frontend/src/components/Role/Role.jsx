import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import { getRoles, addRole } from '../../services/api'; // Adjust the import path as needed
import { Button, Modal, Input, message } from 'antd';
import styles from './Role.module.css'; // Adjust the import path as needed

function Role() {
  const [roleData, setRoleData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch roles from the API
  const getRoleList = async () => {
    try {
      const res = await getRoles();
      setRoleData(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching role data:', err);
      setError('Failed to fetch role data');
      setLoading(false);
    }
  };

  useEffect(() => {
    getRoleList();
  }, []);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const handleAddRole = async () => {
    setIsAdding(true);
    try {
      await addRole(roleName);  
      message.success('Role added successfully');
      setRoleName('');  
      closeModal();
      getRoleList(); 
    } catch (error) {
      console.error('Error adding role:', error);
      message.error('Failed to add role');
    } finally {
      setIsAdding(false);
    }
  };

  const filteredRoles = searchQuery
    ? roleData.filter(
      (role) =>
        role.Role.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : roleData;

  return (
    <div className={styles.mainContainer}>
      <h3 className={styles.heading}>Role List</h3>

      <div className={styles.searchContainer}>
        <div>
          <Input
            type="text"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
          <CSVLink
            data={filteredRoles}
            headers={[
              { label: 'Role Name', key: 'Role' },
            ]}
            filename="role_list.csv"
            className={styles.downloadButton}
          >
            Download
          </CSVLink>
        <div>
          <Button
            type="primary"
            onClick={openModal}
            loading={isAdding}
            disabled={isAdding}
            className={styles.addButtonContainer}
          >
            {isAdding ? 'Adding...' : 'Add'}
          </Button>
          <Modal
            title="Add Role"
            visible={modalIsOpen}
            onOk={handleAddRole}
            onCancel={closeModal}
            confirmLoading={isAdding}
            okText="Add Role"
            okButtonProps={{ className: styles.addButtonContainer }}
            cancelButtonProps={{ style: { display: 'none' } }}
          >
            <Input
              type="text"
              placeholder="Role Name"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              style={{ marginBottom: '10px' }}
            />
          </Modal>
        </div>
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
                <th className={styles.th}>Role Name</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((role) => (
                <tr key={role.Role}>
                  <td className={styles.td}>{role.Role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Role;
