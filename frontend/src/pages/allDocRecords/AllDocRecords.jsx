import React, { useEffect, useState } from "react";
import { Table, Input, message, Button, Space, Tag } from "antd";
import { EyeOutlined, DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import { getAllEmployeeDocuments, getDocuments } from "../../services/api";

export const AllDocRecords = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await getAllEmployeeDocuments();
      console.log("All Documents Response:", response.data);
      // Ensure we always set an array
      const documentData = Array.isArray(response.data) ? response.data : [];
      setDocuments(documentData);
    } catch (error) {
      console.error("Error fetching documents:", error);
      message.error("Failed to fetch employee documents");
      setDocuments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (empId, docType) => {
    try {
      const response = await getDocuments(empId, docType);

      if (response.status !== 200) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      const blob = new Blob([response.data], { type: "application/pdf" });
      const fileURL = window.URL.createObjectURL(blob);
      window.open(fileURL, "_blank");

      setTimeout(() => URL.revokeObjectURL(fileURL), 5000);
    } catch (error) {
      console.error("Error previewing document:", error);

      if (error.response) {
        if (error.response.status === 404) {
          message.warning("Document not available");
        } else {
          message.error("Error fetching document for preview");
        }
      } else {
        message.error("Network error or server is down");
      }
    }
  };

  const handleDownload = async (empId, docType, fileName) => {
    try {
      const response = await getDocuments(empId, docType);

      if (response.status !== 200) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const blob = new Blob([response.data], { type: "application/pdf" });
      const fileURL = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = fileURL;
      link.download = fileName || `${docType}_${empId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(fileURL), 1000);

      message.success("Download started");
    } catch (error) {
      console.error("Error downloading document:", error);

      if (error.response) {
        if (error.response.status === 404) {
          message.warning("Document not available");
        } else {
          message.error("Error downloading document");
        }
      } else {
        message.error("Network error or server is down");
      }
    }
  };

  const getVerificationStatusTag = (isVerified) => {
    if (isVerified === true) {
      return <Tag color="green">Verified</Tag>;
    } else if (isVerified === false) {
      return <Tag color="red">Rejected</Tag>;
    } else {
      return <Tag color="orange">Pending</Tag>;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }
    return `${kb.toFixed(2)} KB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const columns = [
    {
      title: 'Employee ID',
      dataIndex: 'emp_id',
      key: 'emp_id',
      sorter: (a, b) => a.emp_id.localeCompare(b.emp_id),
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) =>
        record.emp_id.toLowerCase().includes(value.toLowerCase()) ||
        record.employee_name.toLowerCase().includes(value.toLowerCase()) ||
        record.doc_type.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: 'Employee Name',
      dataIndex: 'employee_name',
      key: 'employee_name',
      sorter: (a, b) => a.employee_name.localeCompare(b.employee_name),
    },
    {
      title: 'Document Type',
      dataIndex: 'doc_type',
      key: 'doc_type',
      filters: [
        { text: '10th', value: 'tenth' },
        { text: '12th', value: 'twelve' },
        { text: 'PAN', value: 'pan' },
        { text: 'Aadhaar', value: 'adhar' },
        { text: 'Graduation', value: 'grad' },
        { text: 'Resume', value: 'resume' },
      ],
      onFilter: (value, record) => record.doc_type === value,
      render: (text) => {
        const labels = {
          tenth: '10th',
          twelve: '12th',
          pan: 'PAN',
          adhar: 'Aadhaar',
          grad: 'Graduation',
          resume: 'Resume'
        };
        return labels[text] || text;
      }
    },
    {
      title: 'File Name',
      dataIndex: 'file_name',
      key: 'file_name',
      ellipsis: true,
    },
    {
      title: 'File Size',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size) => formatFileSize(size),
      sorter: (a, b) => (a.file_size || 0) - (b.file_size || 0),
    },
    {
      title: 'Uploaded Date',
      dataIndex: 'uploaded_at',
      key: 'uploaded_at',
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at),
    },
    {
      title: 'Verification Status',
      dataIndex: 'is_verified',
      key: 'is_verified',
      render: (isVerified) => getVerificationStatusTag(isVerified),
      filters: [
        { text: 'Verified', value: true },
        { text: 'Rejected', value: false },
        { text: 'Pending', value: null },
      ],
      onFilter: (value, record) => record.is_verified === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handlePreview(record.emp_id, record.doc_type)}
          >
            Preview
          </Button>
          <Button
            icon={<DownloadOutlined />}
            size="small"
            onClick={() => handleDownload(record.emp_id, record.doc_type, record.file_name)}
          >
            Download
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Employee Document Repository</h2>
        <Input
          placeholder="Search by Employee ID, Name, or Document Type..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: '400px' }}
          allowClear
        />
      </div>

      <Table
        columns={columns}
        dataSource={documents}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} documents`,
        }}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};
