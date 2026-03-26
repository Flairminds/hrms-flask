import React, { useEffect, useState } from "react";
import { Table, Input, message, Button, Space, Tag, Popconfirm, Tabs, Select } from "antd";
import { EyeOutlined, DownloadOutlined, SearchOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { getAllEmployeeDocuments, getDocuments, verifyDocument, getEmployeeDocumentStats } from "../../services/api";
import { convertDate } from "../../util/helperFunctions";

export const AllDocRecords = () => {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statsSearch, setStatsSearch] = useState("");
  const [selectedDocType, setSelectedDocType] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [downloadingZip, setDownloadingZip] = useState(false);

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

  const handleBulkDownload = async () => {
    if (!selectedDocType || selectedRowKeys.length === 0) {
      message.warning("Please select a document type and at least one employee.");
      return;
    }

    setDownloadingZip(true);
    const zip = new JSZip();
    const folderName = `${selectedDocType}_documents`;
    const folder = zip.folder(folderName);

    let successCount = 0;
    let failCount = 0;

    const hideLoading = message.loading(`Downloading ${selectedRowKeys.length} documents...`, 0);

    try {
      for (const empId of selectedRowKeys) {
        try {
          const response = await getDocuments(empId, selectedDocType);
          if (response.status === 200) {
            const docInfo = documents.find(d => d.emp_id === empId && d.doc_type === selectedDocType);
            const ext = docInfo && docInfo.file_name && docInfo.file_name.includes('.')
              ? docInfo.file_name.split('.').pop()
              : "pdf";

            // Generate a clean filename: empId_FirstName_LastName_DocType.ext (if names available)
            const empNameStr = docInfo && docInfo.employee_name ? docInfo.employee_name.replace(/\s+/g, '') : "";
            const fileName = `${empId}_${empNameStr}_${selectedDocType}.${ext}`;

            // getDocuments returns arraybuffer if axois responseType: 'blob' or 'arraybuffer'
            // Let's ensure it handles it correctly: response.data is added as blob.
            const blob = new Blob([response.data]);
            folder.file(fileName, blob);
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`Error downloading ${selectedDocType} for ${empId}:`, err);
          failCount++;
        }
      }

      if (successCount === 0) {
        throw new Error("Failed to download any documents.");
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folderName}.zip`);
      message.success(`Downloaded ${successCount} documents successfully.` + (failCount > 0 ? ` Failed: ${failCount}` : ""));

    } catch (error) {
      console.error("Error bulk downloading:", error);
      message.error("Error during bulk ZIP download.");
    } finally {
      hideLoading();
      setDownloadingZip(false);
      setSelectedRowKeys([]);
    }
  };

  const handleVerify = async (empId, docType, currentStatus, requestType) => {
    try {
      // If already verified (true), we're unverifying (set to null)
      // If already verified (true), we're unverifying (set to null)
      // If not verified (null or false), we're verifying (set to true)
      let newStatus = currentStatus === true ? null : true;

      if (requestType === 'reject') {
        newStatus = false;
      }

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
    // {
    //   title: 'File Name',
    //   dataIndex: 'file_name',
    //   key: 'file_name',
    //   ellipsis: true,
    // },
    // {
    //   title: 'File Size',
    //   dataIndex: 'file_size',
    //   key: 'file_size',
    //   render: (size) => formatFileSize(size),
    //   sorter: (a, b) => (a.file_size || 0) - (b.file_size || 0),
    // },
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
      onFilter: (value, record) => {
        // Ant Design passes filter values as strings; coerce back to the correct type
        if (value === 'true' || value === true) return record.is_verified === true;
        if (value === 'false' || value === false) return record.is_verified === false;
        return record.is_verified === null || record.is_verified === undefined;
      },
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
          <Popconfirm
            title={"Reject this document?"}
            description={"This will reject the document."}
            onConfirm={() => handleVerify(record.emp_id, record.doc_type, record.is_verified, 'reject')}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="primary"
              icon={<CloseCircleOutlined />}
              size="small"
              style={{
                backgroundColor: "#eb3c3cff",
                borderColor: "#eb3c3cff",
                color: "#fff"
              }}
            >
              {record.is_verified === false ? "Rejected" : "Reject"}
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
    // {
    //   title: 'Not Uploaded',
    //   dataIndex: 'not_uploaded',
    //   key: 'not_uploaded',
    //   align: 'center',
    //   render: (count) => count > 0 ? <Tag color="red">{count}</Tag> : <Tag color="green">0</Tag>,
    // },
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
    // {
    //   title: 'Not Verified',
    //   dataIndex: 'not_verified',
    //   key: 'not_verified',
    //   align: 'center',
    //   render: (count) => count > 0 ? <Tag color="orange">{count}</Tag> : <Tag color="green">0</Tag>,
    // },
    {
      title: 'Verification %',
      dataIndex: 'verification_percentage',
      key: 'verification_percentage',
      align: 'center',
      sorter: (a, b) => a.verification_percentage - b.verification_percentage,
      render: (percent) => `${percent}%`,
    },
    // {
    //   title: 'Resume Uploaded',
    //   dataIndex: 'resume_uploaded_at',
    //   key: 'resume_uploaded_at',
    //   align: 'center',
    //   render: (date, record) => {
    //     return date == null ? '-' : convertDate(date);
    //   },
    //   sorter: (a, b) => new Date(a.resume_uploaded_at || 0) - new Date(b.resume_uploaded_at || 0),
    // },
    {
      title: 'Resume Uploaded',
      dataIndex: 'days_since_upload',
      key: 'days_since_upload',
      align: 'center',
      sorter: (a, b) => (a.days_since_upload ?? 9999) - (b.days_since_upload ?? 9999),
      render: (days) => days !== null && days !== undefined ? `${days} day${days === 1 ? '' : 's'} ago` : '—',
    },
    {
      title: 'Resume Status',
      dataIndex: 'resume_status',
      key: 'resume_status',
      align: 'center',
      filters: [...new Set(stats.map(item => item.resume_status))].map(status => ({ text: status, value: status })),
      onFilter: (value, record) => record.resume_status === value,
      render: (status) => {
        const config = {
          'Up to Date': { color: 'green' },
          'Need Review': { color: 'orange' },
          'Need Update': { color: 'red' },
        };
        const { color } = config[status] || { color: 'default' };
        return <Tag color={color}>{status || '—'}</Tag>;
      },
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
            dataSource={documents.filter(doc => {
              if (!searchText) return true;
              const q = searchText.toLowerCase();
              return (
                (doc.emp_id || '').toLowerCase().includes(q) ||
                (doc.employee_name || '').toLowerCase().includes(q)
              );
            })}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
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
        <>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <Input
              placeholder="Search by Employee ID or Name..."
              prefix={<SearchOutlined />}
              value={statsSearch}
              onChange={(e) => setStatsSearch(e.target.value)}
              style={{ width: '320px' }}
              allowClear
            />
          </div>
          <Table
            columns={statsColumns}
            dataSource={stats.filter(s => {
              const q = statsSearch.trim().toLowerCase();
              if (!q) return true;
              return (
                (s.emp_id || '').toLowerCase().includes(q) ||
                (s.employee_name || '').toLowerCase().includes(q)
              );
            })}
            rowKey="emp_id"
            loading={statsLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => `Total ${total} employees`,
            }}
            scroll={{ x: 1000 }}
          />
        </>
      ),
    },
    {
      key: '3',
      label: 'Bulk Download',
      children: (
        <div style={{ padding: '16px 0' }}>
          <Space style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 'bold' }}>Document Type:</span>
            <Select
              style={{ width: 200 }}
              placeholder="Select Document Type"
              value={selectedDocType}
              onChange={(value) => {
                setSelectedDocType(value);
                setSelectedRowKeys([]);
              }}
              options={[
                { label: '10th', value: 'tenth' },
                { label: '12th', value: 'twelve' },
                { label: 'PAN', value: 'pan' },
                { label: 'Aadhaar', value: 'adhar' },
                { label: 'Graduation', value: 'grad' },
                { label: 'Resume', value: 'resume' },
              ]}
            />
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleBulkDownload}
              loading={downloadingZip}
              disabled={!selectedDocType || selectedRowKeys.length === 0}
            >
              Download Selected as ZIP
            </Button>
            {selectedRowKeys.length > 0 && (
              <span style={{ marginLeft: 8 }}>{selectedRowKeys.length} selected</span>
            )}
          </Space>

          {selectedDocType && (
            <Table
              rowSelection={{
                selectedRowKeys,
                onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys),
                // selections: [
                //   Table.SELECTION_ALL,
                //   Table.SELECTION_INVERT,
                //   Table.SELECTION_NONE,
                // ]
              }}
              columns={[
                { title: 'Employee ID', dataIndex: 'emp_id', key: 'emp_id', sorter: (a, b) => a.emp_id.localeCompare(b.emp_id) },
                { title: 'Employee Name', dataIndex: 'employee_name', key: 'employee_name', sorter: (a, b) => a.employee_name.localeCompare(b.employee_name) },
                { title: 'Uploaded Date', dataIndex: 'uploaded_at', key: 'uploaded_at', render: (date) => formatDate(date), sorter: (a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at) },
                { title: 'Verification Status', dataIndex: 'is_verified', key: 'is_verified', render: (isVerified) => getVerificationStatusTag(isVerified) },
              ]}
              dataSource={documents.filter(doc => doc.doc_type === selectedDocType)}
              rowKey="emp_id"
              pagination={{ pageSize: 50, showSizeChanger: true }}
              scroll={{ x: 800 }}
              size="middle"
            />
          )}
        </div>
      )
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* <h2>Employee Document Repository</h2> */}
      <Tabs defaultActiveKey="1" items={tabItems} />
    </div>
  );
};
