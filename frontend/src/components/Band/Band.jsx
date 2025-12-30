import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv';
import { getBands, addBands } from '../../services/api';
import { Button, Modal, Input, message } from 'antd';
import styles from './Band.module.css';

function Band() {
  const [bandData, setBandData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [Band, setBandName] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const getBandList = async () => {
    try {
      const res = await getBands();
      setBandData(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching band data:', err);
      setError('Failed to fetch band data');
      setLoading(false);
    }
  };

  useEffect(() => {
    getBandList();
  }, []);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const handleAddBand = async () => {
    setIsAdding(true);
    try {
      await addBands(Band);  
      message.success('Band added successfully');
      setBandName('');  
      closeModal();
      getBandList(); 
    } catch (error) {
      console.error('Error adding band:', error);
      message.error('Failed to add band');
    } finally {
      setIsAdding(false);
    }
  };
  

  const filteredBands = searchQuery
    ? bandData.filter(
      (band) =>
        band.Band.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : bandData;

  return (
    <div className={styles.mainContainer}>
      <h3 className={styles.heading}>Band List</h3>

      <div className={styles.searchContainer}>
        <div>
          <Input
            type="text"
            placeholder="Search bands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
          <CSVLink
            data={filteredBands}
            headers={[
              { label: 'Band Name', key: 'Band' },
            ]}
            filename="band_list.csv"
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
            title="Add Band"
            visible={modalIsOpen}
            onOk={handleAddBand}
            onCancel={closeModal}
            confirmLoading={isAdding}
            okText="Add Band"
            okButtonProps={{ className: styles.addButtonContainer }}
            cancelButtonProps={{ style: { display: 'none' } }}
          >
            <Input
              type="text"
              placeholder="Band Name"
              value={Band}
              onChange={(e) => setBandName(e.target.value)}
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
                <th className={styles.th}>Band Name</th>
              </tr>
            </thead>
            <tbody>
              {filteredBands.map((band) => (
                <tr key={band.Band}>
                  <td className={styles.td}>{band.Band}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Band;
