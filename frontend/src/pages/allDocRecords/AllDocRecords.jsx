import React, { useEffect, useState } from "react";
import { Table, Input, message, Button, Space, Tag, Popconfirm, Tabs } from "antd";
import { EyeOutlined, DownloadOutlined, SearchOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { getAllEmployeeDocuments, getDocuments, verifyDocument, getEmployeeDocumentStats } from "../../services/api";

export const AllDocRecords = () => {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchDocuments();
    fetchStats();
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

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await getEmployeeDocumentStats();
      console.log("Document Stats Response:", response.data);
      const statsData = Array.isArray(response.data) ? response.data : [];
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching document statistics:", error);
      message.error("Failed to fetch document statistics");
      setStats([]);
    } finally {
      setStatsLoading(false);
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

  const handleVerify = async (empId, docType, currentStatus) => {
    try {
      // If already verified (true), we're unverifying (set to null)
      // If not verified (null or false), we're verifying (set to true)
      const newStatus = currentStatus === true ? null : true;

      const response = await verifyDocument(empId, docType, newStatus);

      if (response.status === 200) {
        message.success(newStatus === true ? "Document verified successfully" : "Document verification removed");
        // Refresh the documents list and stats
        fetchDocuments();
        fetchStats();
      }
    } catch (error) {
      console.error("Error verifying document:", error);
      message.error("Failed to update verification status");
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
          <Popconfirm
            title={record.is_verified === true ? "Remove verification?" : "Verify this document?"}
            description={record.is_verified === true ? "This will unverify the document." : "This will mark the document as verified."}
            onConfirm={() => handleVerify(record.emp_id, record.doc_type, record.is_verified)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type={record.is_verified === true ? "default" : "primary"}
              icon={<CheckCircleOutlined />}
              size="small"
              style={{
                backgroundColor: record.is_verified === true ? "#52c41a" : undefined,
                borderColor: record.is_verified === true ? "#52c41a" : undefined,
                color: record.is_verified === true ? "#fff" : undefined
              }}
            >
              {record.is_verified === true ? "Verified" : "Verify"}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const statsColumns = [
    {
      title: 'Employee ID',
      dataIndex: 'emp_id',
      key: 'emp_id',
      sorter: (a, b) => a.emp_id.localeCompare(b.emp_id),
    },
    {
      title: 'Employee Name',
      dataIndex: 'employee_name',
      key: 'employee_name',
      sorter: (a, b) => a.employee_name.localeCompare(b.employee_name),
    },
    {
      title: 'Total Expected',
      dataIndex: 'total_expected',
      key: 'total_expected',
      align: 'center',
    },
    {
      title: 'Uploaded',
      dataIndex: 'uploaded',
      key: 'uploaded',
      align: 'center',
      render: (count) => count > 0 ? <Tag color="blue">{count}</Tag> : <Tag color="red">0</Tag>,
    },
    {
      title: 'Not Uploaded',
      dataIndex: 'not_uploaded',
      key: 'not_uploaded',
      align: 'center',
      render: (count) => count > 0 ? <Tag color="red">{count}</Tag> : <Tag color="green">0</Tag>,
    },
    {
      title: 'Upload %',
      dataIndex: 'upload_percentage',
      key: 'upload_percentage',
      align: 'center',
      sorter: (a, b) => a.upload_percentage - b.upload_percentage,
      render: (percent) => `${percent}%`,
    },
    {
      title: 'Verified',
      dataIndex: 'verified',
      key: 'verified',
      align: 'center',
      render: (count) => <Tag color="green">{count}</Tag>,
    },
    {
      title: 'Not Verified',
      dataIndex: 'not_verified',
      key: 'not_verified',
      align: 'center',
      render: (count) => count > 0 ? <Tag color="orange">{count}</Tag> : <Tag color="green">0</Tag>,
    },
    {
      title: 'Verification %',
      dataIndex: 'verification_percentage',
      key: 'verification_percentage',
      align: 'center',
      sorter: (a, b) => a.verification_percentage - b.verification_percentage,
      render: (percent) => `${percent}%`,
    },
  ];

  const tabItems = [
    {
      key: '1',
      label: 'All Documents',
      children: (
        <>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
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
        </>
      ),
    },
    {
      key: '2',
      label: 'Statistics',
      children: (
        <Table
          columns={statsColumns}
          dataSource={stats}
          rowKey="emp_id"
          loading={statsLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} employees`,
          }}
          scroll={{ x: 1000 }}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h2>Employee Document Repository</h2>
      <Tabs defaultActiveKey="1" items={tabItems} />
    </div>
  );
};
