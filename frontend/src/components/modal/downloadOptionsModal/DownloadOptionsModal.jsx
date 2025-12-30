import React from 'react';
import { Modal, Button } from 'antd';
import { CSVLink } from 'react-csv';
import { DownloadOutlined } from '@ant-design/icons';
import styles from './DownloadOptionsModal.module.css';

const DownloadOptionsModal = ({ visible, onClose, data, headers, filteredData, selectedData }) => {
  // Helper function to check if data is empty
  const isEmpty = (data) => !data || data.length === 0;

  return (
    <Modal
      className={styles.downloadOptionsModal}
      visible={visible}
      title="Download Options"
      onCancel={onClose}
      footer={null}
      centered
    >
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        className={`${styles['download-button']} ${isEmpty(data) ? styles.hidden : ''}`}
      >
        <CSVLink
          data={data}
          headers={headers}
          filename="all_data.csv"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          Download All Data
        </CSVLink>
      </Button>
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        className={`${styles['download-button']} ${isEmpty(selectedData) ? styles.hidden : ''}`}
      >
        <CSVLink
          data={selectedData}
          headers={headers}
          filename="selected_data.csv"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          Download Selected Data
        </CSVLink>
      </Button>
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        className={`${styles['download-button']} ${isEmpty(filteredData) ? styles.hidden : ''}`}
      >
        <CSVLink
          data={filteredData}
          headers={headers}
          filename="filtered_data.csv"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          Download Filtered Data
        </CSVLink>
      </Button>
    </Modal>
  );
};

export default DownloadOptionsModal;
