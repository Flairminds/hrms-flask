import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, InputNumber, Select, Modal, message, DatePicker, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined, FilePdfOutlined, EyeOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import styles from './SalarySlipGenerator.module.css';
import FMLogo from '../../assets/newLogo/FM_NewLogo.svg';
import moment from 'moment';
import { getEmployeeList } from '../../services/api';

const { Option } = Select;
const { Panel } = Collapse;

// Simple number to words converter for Indian Rupees
const numberToWords = (num) => {
    if (num === 0) return 'Zero';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if ((num = num.toString()).length > 9) return 'Overflow';
    const n = ('000000000' + num).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : 'Only';
    return str.trim();
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount || 0);
};

export const SalarySlipGenerator = () => {
    const previousMonth = moment().subtract(1, 'months');

    // Employee Details State
    const [empDetails, setEmpDetails] = useState({
        name: '',
        empId: '',
        designation: '',
        doj: null,
        month: previousMonth.format('MMMM'),
        year: previousMonth.format('YYYY')
    });

    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    // Advanced Payroll Grid State
    const [slipData, setSlipData] = useState({
        basicEarnings: [
            { id: 1, label: 'Basic', amount: 0, comments: '' },
            { id: 2, label: 'Monthly Project Performance Variable', amount: 0, comments: '' },
            { id: 3, label: 'Other Monthly Additions', amount: 0, comments: '' },
            { id: 4, label: 'Comp-off Encashment', amount: 0, comments: '' }
        ],
        preTaxDeductions: [
            { id: 1, label: 'Unpaid Leaves', amount: 0, comments: '' },
            { id: 2, label: 'Unpaid half days for late entry', amount: 0, comments: '' },
            { id: 3, label: 'Insurance', amount: 0, comments: '' }
        ],
        quarterlyAdditions: [
            { id: 1, label: 'Quarterly Variable/Other Addition (D)', amount: 0, comments: '' }
        ],
        monthlyVariableDeductions: [
            { id: 1, label: 'Monthly project variable deduction (E)', amount: 0, comments: '' }
        ],
        taxDeductions: [
            { id: 1, label: 'Professional tax', amount: 0, comments: '' },
            { id: 2, label: 'TDS (2% of gross earnings)', amount: 0, comments: '' }
        ],
        postTaxAdditions: [],
        postTaxDeductions: []
    });

    const [previewVisible, setPreviewVisible] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const previewRef = useRef(null);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const years = Array.from({ length: 5 }, (_, i) => String(moment().year() - i + 1));

    // Array Calculators
    const calcSum = (arr) => arr.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Live Calculations
    const A = calcSum(slipData.basicEarnings);
    const B = calcSum(slipData.preTaxDeductions);
    const C = A - B;
    const D = calcSum(slipData.quarterlyAdditions);
    const E = calcSum(slipData.monthlyVariableDeductions);
    const X = (C + D) - E;
    const F = calcSum(slipData.taxDeductions);
    const Y = X - F;
    const G = calcSum(slipData.postTaxAdditions);
    const H = calcSum(slipData.postTaxDeductions);
    const netPay = (Y + G) - H;

    // Fetch Employees
    useEffect(() => {
        const fetchEmployees = async () => {
            setLoadingEmployees(true);
            try {
                const response = await getEmployeeList();
                if (response && response.data) {
                    setEmployees(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch employees:", error);
                message.error("Failed to load employee list");
            } finally {
                setLoadingEmployees(false);
            }
        };
        fetchEmployees();
    }, []);

    // Handlers
    const handleEmployeeSelect = (employeeId) => {
        const employee = employees.find(emp => emp.employeeId === employeeId);
        if (employee) {
            setEmpDetails(prev => ({
                ...prev,
                empId: employee.employeeId,
                name: `${employee.employeeName || ''}`.trim(),
                designation: employee.subRoleName || employee.roleName || '',
                doj: employee.joiningDate ? moment(employee.joiningDate) : null
            }));
        }
    };

    const handleEmpChange = (field, value) => setEmpDetails(prev => ({ ...prev, [field]: value }));

    const updateSlipItem = (category, id, field, value) => {
        setSlipData(prev => ({
            ...prev,
            [category]: prev[category].map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const addSlipItem = (category) => {
        setSlipData(prev => ({
            ...prev,
            [category]: [...prev[category], { id: Date.now(), label: '', amount: 0, comments: '' }]
        }));
    };

    const removeSlipItem = (category, id) => {
        setSlipData(prev => ({
            ...prev,
            [category]: prev[category].filter(item => item.id !== id)
        }));
    };

    const handleDownloadPDF = async () => {
        if (!empDetails.name || !empDetails.month || !empDetails.year) {
            message.error("Please fill Name, Month, and Year before downloading.");
            return;
        }

        setDownloading(true);
        try {
            let element = previewRef.current;
            const needsOpen = !element || !previewVisible;

            // If the modal has never been opened or was closed, the DOM might not exist or is hidden.
            // html2canvas cannot capture hidden elements, so we must show the preview first.
            if (needsOpen) {
                message.loading({ content: "Preparing document for download...", key: "pdf-gen" });
                setPreviewVisible(true);
                // Wait for React to render the Modal and for the open animation to finish
                await new Promise(resolve => setTimeout(resolve, 600));
                element = previewRef.current;

                if (element && element.offsetHeight === 0) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                if (!element || element.offsetHeight === 0) {
                    message.error({ content: "Failed to initialize document DOM.", key: "pdf-gen" });
                    return;
                }
                message.success({ content: "Document generated!", key: "pdf-gen" });
            }

            const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`SalarySlip_${empDetails.name.replace(/\s+/g, '_')}_${empDetails.month}_${empDetails.year}.pdf`);
            message.success("Salary slip downloaded successfully!");
        } catch (error) {
            console.error("PDF generation failed:", error);
            message.error("Failed to generate PDF. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    const openPreview = () => {
        if (!empDetails.name || !empDetails.month || !empDetails.year) {
            message.warning("Please fill at least Name, Month, and Year to preview.");
            return;
        }
        setPreviewVisible(true);
    };

    // Reusable Section Builder for Input Form
    const renderFormSection = (title, category) => (
        <div className={styles.categoryBlock}>
            <div className={styles.categoryHeader}>
                <h4>{title}</h4>
                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => addSlipItem(category)}>Add Item</Button>
            </div>
            {slipData[category].map(item => (
                <div key={item.id} className={styles.dynamicRow}>
                    <Input placeholder="Label" value={item.label} onChange={(e) => updateSlipItem(category, item.id, 'label', e.target.value)} style={{ flex: 1.5 }} />
                    <InputNumber placeholder="Amount" value={item.amount} onChange={(v) => updateSlipItem(category, item.id, 'amount', v)} style={{ width: '130px' }} min={0} />
                    <Input placeholder="Comments" value={item.comments} onChange={(e) => updateSlipItem(category, item.id, 'comments', e.target.value)} style={{ flex: 2 }} />
                    <Button danger icon={<DeleteOutlined />} onClick={() => removeSlipItem(category, item.id)} />
                </div>
            ))}
            {slipData[category].length === 0 && <span className={styles.emptyText}>No items added.</span>}
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Salary Slip Generator</h1>
                <p className={styles.subtitle}>Create and download custom salary slips in PDF format.</p>
            </div>

            <div className={styles.formCard}>
                <h3 className={styles.sectionTitle}>Employee & Pay Period Details</h3>
                <div style={{ marginBottom: '16px' }}>
                    <Select showSearch placeholder="Select Employee" style={{ width: '100%', maxWidth: '400px' }} size="large" loading={loadingEmployees} onChange={handleEmployeeSelect} filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} options={employees.map(emp => ({ value: emp.employeeId, label: `${emp.employeeName} (${emp.employeeId})` }))} />
                </div>
                <div className={styles.grid3}>
                    <Input disabled placeholder="Employee Name" value={empDetails.name} />
                    <Input disabled placeholder="Employee ID" value={empDetails.empId} />
                    <Input placeholder="Designation" value={empDetails.designation} onChange={(e) => handleEmpChange('designation', e.target.value)} />
                    <DatePicker disabled placeholder="Date of Joining" style={{ width: '100%' }} value={empDetails.doj} format="DD-MMM-YYYY" />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Select placeholder="Month" style={{ flex: 1 }} value={empDetails.month || undefined} onChange={(val) => handleEmpChange('month', val)}>{months.map(m => <Option key={m} value={m}>{m}</Option>)}</Select>
                        <Select placeholder="Year" style={{ width: '100px' }} value={empDetails.year} onChange={(val) => handleEmpChange('year', val)}>{years.map(y => <Option key={y} value={y}>{y}</Option>)}</Select>
                    </div>
                </div>
            </div>

            <div className={styles.formCard}>
                <h3 className={styles.sectionTitle}>Salary Data Entry</h3>
                <Collapse defaultActiveKey={['1']}>
                    <Panel header={`Base Earnings & Deductions (Base Salary: ${formatCurrency(C)})`} key="1">
                        {renderFormSection('Earnings (A)', 'basicEarnings')}
                        {renderFormSection('Pre-tax Deductions (B)', 'preTaxDeductions')}
                    </Panel>
                    <Panel header={`Variables & Taxes (Gross: ${formatCurrency(X)})`} key="2">
                        {renderFormSection('Quarterly/Other Additions (D)', 'quarterlyAdditions')}
                        {renderFormSection('Monthly Variable Deductions (E)', 'monthlyVariableDeductions')}
                        {renderFormSection('Tax Deductions (F)', 'taxDeductions')}
                    </Panel>
                    <Panel header={`Post-Tax Adjustments (Net Pay: ${formatCurrency(netPay)})`} key="3">
                        {renderFormSection('Post-tax Additions (G)', 'postTaxAdditions')}
                        {renderFormSection('Post-tax Deductions (H)', 'postTaxDeductions')}
                    </Panel>
                </Collapse>
            </div>

            <div className={styles.netPayBox}>
                <div>
                    <div className={styles.netPayLabel}>Net Salary for the Month</div>
                    {/* <div style={{ color: '#4b5563', fontSize: '14px', marginTop: '4px' }}>Amount to be transferred to employee</div> */}
                </div>
                <div className={styles.netPayAmount}>{formatCurrency(netPay)}</div>
            </div>

            <div className={styles.actions}>
                <Button size="large" icon={<EyeOutlined />} onClick={openPreview}>Preview Slip</Button>
                <Button size="large" type="primary" icon={<FilePdfOutlined />} onClick={handleDownloadPDF} loading={downloading}>Download PDF</Button>
            </div>

            {/* PDF Preview Modal */}
            <Modal title="Salary Slip Preview" open={previewVisible} onCancel={() => setPreviewVisible(false)} width={1000} style={{ top: 10 }} footer={[<Button key="cancel" onClick={() => setPreviewVisible(false)}>Close</Button>, <Button key="download" type="primary" icon={<FilePdfOutlined />} loading={downloading} onClick={handleDownloadPDF}>Download PDF</Button>]}>
                <div style={{ padding: '20px', backgroundColor: '#e5e7eb', overflowX: 'auto' }}>
                    <div id="salary-slip-preview" ref={previewRef} className={styles.slipPreview} style={{ position: 'relative', zIndex: 0 }}>
                        {/* HTML2Canvas Compatible Watermark */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: -1, pointerEvents: 'none'
                        }}>
                            <img src={FMLogo} alt="Background Watermark" style={{ width: '60%', opacity: 0.10 }} />
                        </div>

                        {/* Relative Content Wrapper */}
                        <div style={{ position: 'relative', zIndex: 1 }}>

                            {/* HEADER */}
                            <div className={styles.slipHeaderAlt}>
                                <img src={FMLogo} alt="Flairminds Logo" className={styles.logoAlt} />
                                <div className={styles.companyInfoAlt}>
                                    <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>FlairMinds Software Pvt. Ltd.</h1>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px' }}>1st Floor Alluring Sky, Off Aundh Baner Link Road, Vidhate Vasti, Aundh, Pune 411007</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px' }}>Work Location: Pune</p>
                                </div>
                            </div>

                            {/* <div className={styles.slipTitle}>
                            Payslip for the month of {empDetails.month} {empDetails.year}
                        </div> */}

                            {/* EMP DETAILS */}
                            <div className={styles.empDetailsGrid}>
                                <div>
                                    <div className={styles.detailRow}><span className={styles.detailLabel}>Employee Name:</span><span className={styles.detailValue}>{empDetails.name || 'N/A'}</span></div>
                                    <div className={styles.detailRow}><span className={styles.detailLabel}>Employee ID:</span><span className={styles.detailValue}>{empDetails.empId || 'N/A'}</span></div>
                                    <div className={styles.detailRow}><span className={styles.detailLabel}>Date of Joining:</span><span className={styles.detailValue}>{empDetails.doj ? empDetails.doj.format('DD-MMM-YYYY') : 'N/A'}</span></div>
                                    <div className={styles.detailRow}><span className={styles.detailLabel}>Payslip For:</span><span className={styles.detailValue}>{empDetails.month} {empDetails.year}</span></div>
                                </div>
                                <div>
                                    {/* <div className={styles.detailRow}><span className={styles.detailLabel}>Designation:</span><span className={styles.detailValue}>{empDetails.designation || 'N/A'}</span></div> */}
                                </div>
                            </div>

                            {/* COMPLEX TABLE */}
                            <table className={styles.complexTable}>
                                <thead>
                                    <tr>
                                        <th>Earnings</th>
                                        <th>Amount (₹)</th>
                                        <th>Comments</th>
                                        <th>Deductions</th>
                                        <th>Amount (₹)</th>
                                        <th>Comments</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ border: 'none' }} colSpan={6}></td>
                                    </tr>
                                    <tr className={styles.sectionHeaderRow}>
                                        <td colSpan={6}>Base Earnings & Deductions</td>
                                    </tr>
                                    {/* We map through Earnings (A) and Pre-tax Deductions (B) in parallel rows */}
                                    {Array.from({ length: Math.max(slipData.basicEarnings.length, slipData.preTaxDeductions.length) }).map((_, i) => {
                                        const earn = slipData.basicEarnings[i] || {};
                                        const ded = slipData.preTaxDeductions[i] || {};
                                        return (
                                            <tr key={`ab-${i}`}>
                                                <td>{earn.label || ''}</td>
                                                <td className={styles.amountCol}>{earn.amount !== undefined ? formatCurrency(earn.amount) : ''}</td>
                                                <td className={styles.commentsCol}>{earn.comments || ''}</td>
                                                <td>{ded.label || ''}</td>
                                                <td className={styles.amountCol}>{ded.amount !== undefined ? formatCurrency(ded.amount) : ''}</td>
                                                <td className={styles.commentsCol}>{ded.comments || ''}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr className={styles.rowHighlight}>
                                        <td>Total Earnings (A)</td>
                                        <td className={styles.amountCol}>{formatCurrency(A)}</td>
                                        <td></td>
                                        <td>Total Pre-tax Deductions (B)</td>
                                        <td className={styles.amountCol}>{formatCurrency(B)}</td>
                                        <td></td>
                                    </tr>
                                    <tr className={styles.rowAccent}>
                                        <td colSpan={6}><strong>Base Salary Post Deductions (C=A-B) <span style={{ float: 'right', marginRight: '40%' }}>{formatCurrency(C)}</span></strong></td>
                                    </tr>

                                    <tr>
                                        <td style={{ border: 'none' }} colSpan={6}></td>
                                    </tr>

                                    <tr className={styles.sectionHeaderRow}>
                                        <td colSpan={6}>Variables & Taxes</td>
                                    </tr>
                                    {/* D & E Rows */}
                                    {Array.from({ length: Math.max(slipData.quarterlyAdditions.length, slipData.monthlyVariableDeductions.length) }).map((_, i) => {
                                        const add = slipData.quarterlyAdditions[i] || {};
                                        const ded = slipData.monthlyVariableDeductions[i] || {};
                                        return (
                                            <tr key={`de-${i}`}>
                                                <td>{add.label || ''}</td>
                                                <td className={styles.amountCol}>{add.amount !== undefined ? formatCurrency(add.amount) : ''}</td>
                                                <td className={styles.commentsCol}>{add.comments || ''}</td>
                                                <td>{ded.label || ''}</td>
                                                <td className={styles.amountCol}>{ded.amount !== undefined ? formatCurrency(ded.amount) : ''}</td>
                                                <td className={styles.commentsCol}>{ded.comments || ''}</td>
                                            </tr>
                                        );
                                    })}

                                    <tr className={styles.rowAccent} style={{ borderBottom: 'none' }}>
                                        <td colSpan={6}><strong>Gross Earnings Including Variables (X=(C+D)-E) <span style={{ float: 'right', marginRight: '40%' }}>{formatCurrency(X)}</span></strong></td>
                                    </tr>

                                    {/* F Rows (Tax on right, left empty) */}
                                    {slipData.taxDeductions.map((tax, i) => (
                                        <tr key={`f-${i}`}>
                                            <td></td>
                                            <td className={styles.amountCol}></td>
                                            <td className={styles.commentsCol}></td>
                                            <td>{tax.label}</td>
                                            <td className={styles.amountCol}>{formatCurrency(tax.amount)}</td>
                                            <td className={styles.commentsCol}>{tax.comments}</td>
                                        </tr>
                                    ))}

                                    <tr className={styles.rowHighlight}>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td>Total tax deductions (F)</td>
                                        <td className={styles.amountCol}>{formatCurrency(F)}</td>
                                        <td></td>
                                    </tr>

                                    <tr className={styles.rowAccent}>
                                        <td colSpan={6}><strong>Gross Earnings After Tax (Y=X-F) <span style={{ float: 'right', marginRight: '40%' }}>{formatCurrency(Y)}</span></strong></td>
                                    </tr>

                                    <tr>
                                        <td style={{ border: 'none' }} colSpan={6}></td>
                                    </tr>

                                    <tr className={styles.sectionHeaderRow}>
                                        <td colSpan={6}>Post-Tax Adjustments</td>
                                    </tr>
                                    {/* G & H Rows */}
                                    {slipData.postTaxAdditions.length > 0 || slipData.postTaxDeductions.length > 0 ? Array.from({ length: Math.max(slipData.postTaxAdditions.length, slipData.postTaxDeductions.length) }).map((_, i) => {
                                        const add = slipData.postTaxAdditions[i] || {};
                                        const ded = slipData.postTaxDeductions[i] || {};
                                        return (
                                            <tr key={`gh-${i}`}>
                                                <td>{add.label || ''}</td>
                                                <td className={styles.amountCol}>{add.amount !== undefined ? formatCurrency(add.amount) : ''}</td>
                                                <td className={styles.commentsCol}>{add.comments || ''}</td>
                                                <td>{ded.label || ''}</td>
                                                <td className={styles.amountCol}>{ded.amount !== undefined ? formatCurrency(ded.amount) : ''}</td>
                                                <td className={styles.commentsCol}>{ded.comments || ''}</td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td>Post-tax Additions (G)</td>
                                            <td className={styles.amountCol}>{formatCurrency(0)}</td>
                                            <td className={styles.commentsCol}></td>
                                            <td>Post tax deductions (H)</td>
                                            <td className={styles.amountCol}>{formatCurrency(0)}</td>
                                            <td className={styles.commentsCol}></td>
                                        </tr>
                                    )}

                                    <tr style={{ borderTop: '0.5px solid #1f2937' }}>
                                        <td style={{ border: 'none' }} colSpan={6}></td>
                                    </tr>

                                    <tr className={styles.rowFinal}>
                                        <td colSpan={3} style={{ borderRight: 'none' }}>
                                            <strong style={{ fontSize: '12px' }}>Net Salary for the Month ((Y+G)-H)</strong>
                                        </td>
                                        <td colSpan={3} style={{ borderLeft: 'none' }}>
                                            <span>
                                                <div><strong>{formatCurrency(netPay)}</strong></div>
                                                <div className={styles.amountInWords}>{numberToWords(netPay)}</div>
                                            </span>
                                        </td>
                                    </tr>
                                    {/* <tr className={styles.rowFinal}>
                                        <td colSpan={6} style={{ padding: '8px 10px' }}>
                                            <div>
                                                <div className={styles.amountInWords}>Amount in words: Indian Rupees {numberToWords(netPay)}</div>
                                            </div>
                                        </td>
                                    </tr> */}
                                </tbody>
                            </table>

                            <div className={styles.computerGenerated} style={{ marginTop: '10px', textAlign: 'left', fontStyle: 'normal' }}>
                                This is a system-generated salary slip and does not require a signature.
                            </div>

                        </div> {/* End Content Wrapper */}
                    </div>
                </div>
            </Modal >
        </div >
    );
};

export default SalarySlipGenerator;
