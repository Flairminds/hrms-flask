import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Input, Select, Tag, Card, Row, Col,
    Statistic, Badge, Tooltip, Spin, message, Button, Modal
} from 'antd';
import {
    TrophyOutlined, TeamOutlined, SearchOutlined,
    StarFilled, RiseOutlined, DownloadOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { getTeamSkills } from '../../../services/api';
import styles from './MySkillsTab.module.css';
import { convertDate } from '../../../util/helperFunctions';

const { Option } = Select;

// ── constants ───────────────────────────────────────────────────────────────
const LEVEL_COLOR = {
    Beginner: 'blue',
    Intermediate: 'orange',
    Expert: 'green',
    Advanced: 'green',
};

const CATEGORY_COLOR = {
    Primary: 'purple',
    Secondary: 'cyan',
    'Cross Tech Skill': 'geekblue',
};

const MEDAL = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

// ── helpers ──────────────────────────────────────────────────────────────────
function LevelTag({ level }) {
    if (!level) return <span style={{ color: '#9ca3af' }}>—</span>;
    return <Tag color={LEVEL_COLOR[level] || 'default'}>{level}</Tag>;
}

function CategoryTag({ cat }) {
    if (!cat) return <span style={{ color: '#9ca3af' }}>—</span>;
    return <Tag color={CATEGORY_COLOR[cat] || 'default'}>{cat}</Tag>;
}

// ── component ────────────────────────────────────────────────────────────────
const TeamSkillsTab = () => {
    const [allSkills, setAllSkills] = useState([]);
    const [top5, setTop5] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterSkill, setFilterSkill] = useState(null);
    const [filterCategory, setFilterCategory] = useState(null);
    const [filterLevel, setFilterLevel] = useState(null);
    const [totalRecords, setTotalRecords] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    // ── fetch ──────────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await getTeamSkills();
                setAllSkills(res.data?.skills || []);
                setTotalRecords(res.data?.skills.length || 0);
                setTop5(res.data?.top5 || []);
            } catch {
                message.error('Failed to load team skills');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // ── derived filter options ─────────────────────────────────────────────
    const skillOptions = useMemo(
        () => [...new Set(allSkills.map(s => s.skillName).filter(Boolean))].sort(),
        [allSkills]
    );

    // ── filtered rows ──────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return allSkills.filter(row => {
            if (filterSkill && row.skillName !== filterSkill) return false;
            if (filterCategory && row.skillCategory !== filterCategory) return false;
            if (filterLevel && row.skillLevel !== filterLevel) return false;
            if (q && !row.employeeName?.toLowerCase().includes(q) &&
                !row.employeeId?.toLowerCase().includes(q) &&
                !row.skillName?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [allSkills, search, filterSkill, filterCategory, filterLevel]);

    // ── export to excel ────────────────────────────────────────────────────
    const downloadExcel = () => {
        if (!filtered.length) {
            message.warning('No data to export');
            return;
        }

        const dataToExport = filtered.map(row => ({
            'Employee ID': row.employeeId,
            'Employee Name': row.employeeName,
            'Skill': row.skillName,
            'Category': row.skillCategory,
            'Level': row.skillLevel,
            'Self Eval': row.selfEvaluation != null ? row.selfEvaluation : '—'
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Team Skills');
        XLSX.writeFile(workbook, 'Team_Skills.xlsx');
    };

    // ── table columns ──────────────────────────────────────────────────────
    const columns = [
        {
            title: 'Employee ID',
            dataIndex: 'employeeId',
            width: 130,
            sorter: (a, b) => a.employeeId.localeCompare(b.employeeId),
            filterSearch: true,
        },
        {
            title: 'Employee Name',
            dataIndex: 'employeeName',
            // sorter: (a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''),
            filters: [...new Set(filtered.map(c => c.employeeName).filter(Boolean))].map(name => ({ text: name, value: name })),
            onFilter: (val, rec) => rec.employeeName === val,
            filterSearch: true,
            render: name => <b>{name}</b>,
        },
        {
            title: 'Skill',
            dataIndex: 'skillName',
            // sorter: (a, b) => (a.skillName || '').localeCompare(b.skillName || ''),
            filters: [...new Set(allSkills.map(c => c.skillName).filter(Boolean))].map(name => ({ text: name, value: name })),
            onFilter: (val, rec) => rec.skillName === val,
            filterSearch: true,
        },
        {
            title: 'Category',
            dataIndex: 'skillCategory',
            render: cat => <CategoryTag cat={cat} />,
            filters: ['Primary', 'Secondary', 'Cross Tech Skill'].map(c => ({ text: c, value: c })),
            onFilter: (val, rec) => rec.skillCategory === val,
        },
        {
            title: 'Level',
            dataIndex: 'skillLevel',
            render: level => <LevelTag level={level} />,
            filters: ['Beginner', 'Intermediate', 'Expert'].map(l => ({ text: l, value: l })),
            onFilter: (val, rec) => rec.skillLevel === val,
        },
        {
            title: 'Self Eval',
            dataIndex: 'selfEvaluation',
            width: 110,
            sorter: (a, b) => (a.selfEvaluation || 0) - (b.selfEvaluation || 0),
            render: val => val != null
                ? <span style={{ fontWeight: 600 }}>{val}<span style={{ color: '#9ca3af', fontSize: 12 }}>/5</span></span>
                : <span style={{ color: '#9ca3af' }}>—</span>,
        },
        {
            title: 'Review Eval',
            dataIndex: 'evaluators',
            width: 110,
            sorter: (a, b) => {
                const getAvg = (evs) => {
                    if (!evs || evs.length === 0) return 0;
                    const scores = evs.filter(e => e.score != null);
                    if (scores.length === 0) return 0;
                    return scores.reduce((sum, e) => sum + e.score, 0) / scores.length;
                };
                return getAvg(a.evaluators) - getAvg(b.evaluators);
            },
            render: evaluators => {
                if (!evaluators || evaluators.length === 0) return <span style={{ color: '#9ca3af' }}>—</span>;
                const evaluatedScores = evaluators.filter(e => e.score != null);
                if (evaluatedScores.length === 0) return <span style={{ color: '#9ca3af' }}>—</span>;
                const avgScore = (evaluatedScores.reduce((sum, e) => sum + e.score, 0) / evaluatedScores.length).toFixed(1);
                return <span style={{ fontWeight: 600 }}>{avgScore}<span style={{ color: '#9ca3af', fontSize: 12 }}>/5</span></span>;
            }
        },
        {
            title: 'Added',
            dataIndex: 'added',
            width: 110,
            sorter: (a, b) => (a.added || 0) - (b.added || 0),
            render: val => val != null
                ? <span>{convertDate(val)}</span>
                : <span style={{ color: '#9ca3af' }}>—</span>,
        },
        {
            title: 'Modified',
            dataIndex: 'modified',
            width: 110,
            sorter: (a, b) => (a.modified || 0) - (b.modified || 0),
            render: val => val != null
                ? <span>{convertDate(val)}</span>
                : <span style={{ color: '#9ca3af' }}>—</span>,
        },
    ];

    const handleTableChange = (pagination, filters, sorter, extra) => {
        // extra.currentDataSource contains the filtered list
        const count = extra.currentDataSource.length;
        setTotalRecords(count);
    };

    return (
        <div style={{ padding: '0 4px' }}>
            {/* ── Top 5 Leaderboard ─────────────────────────────────────── */}
            <div style={{ marginBottom: 24 }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 14, fontWeight: 700, fontSize: 16, color: '#4f46e5'
                }}>
                    {/* <TrophyOutlined style={{ fontSize: 20, color: '#f59e0b' }} /> */}
                    {/* Top 5 Skills Across Team */}
                    <Tooltip title="Ranked by: Employee Count × Avg Proficiency Level × Avg Self-Evaluation">
                        <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400, cursor: 'help' }}>
                            {/* (count × level × eval) */}
                        </span>
                    </Tooltip>
                </div>
                <Row gutter={[12, 12]}>
                    {top5.map((skill, idx) => (
                        <Col key={skill.skillId} xs={24} sm={12} md={8} lg={6} xl={4}>
                            <Card
                                size="small"
                                style={{
                                    borderRadius: 12,
                                    border: '1px solid #e5e7eb',
                                    background: '#fff',
                                    boxShadow: '0 2px 8px rgba(0,0,0,.06)',
                                }}
                                bodyStyle={{ padding: '12px 14px' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    {/* <span style={{ fontSize: 22 }}>{MEDAL[idx]}</span> */}
                                    {/* <Badge
                                        count={skill.score}
                                        style={{ backgroundColor: '#4f46e5', fontSize: 11 }}
                                        overflowCount={9999}
                                    /> */}
                                </div>
                                <div style={{ fontWeight: 600, marginTop: 6, fontSize: 12, color: '#111827', lineHeight: 1.3 }}>
                                    {skill.skillName}
                                </div>
                                <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    <Tooltip title="Employees with this skill">
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                                            <TeamOutlined /> &nbsp;{skill.employeeCount}
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Avg proficiency weight (Beginner=1, Inter=2, Expert=3)">
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                                            <RiseOutlined /> &nbsp;{skill.avgLevel}
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Avg self-evaluation (out of 5)">
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                                            <StarFilled style={{ color: '#f59e0b' }} /> &nbsp;{skill.avgSelfEval}
                                        </span>
                                    </Tooltip>
                                </div>
                            </Card>
                        </Col>
                    ))}
                    {!loading && top5.length === 0 && (
                        <Col span={24}>
                            <span style={{ color: '#9ca3af' }}>No data yet.</span>
                        </Col>
                    )}
                </Row>
            </div>

            {/* ── Filters ──────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                {/* <Input
                    prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                    placeholder="Search employee or skill…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    allowClear
                    style={{ width: 240 }}
                />
                <Select
                    placeholder="Filter by Skill"
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                        option.children.toLowerCase().includes(input.toLowerCase())}
                    value={filterSkill}
                    onChange={setFilterSkill}
                    style={{ width: 220 }}
                >
                    {skillOptions.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select> */}
                {/* <Select
                    placeholder="Filter by Category"
                    allowClear
                    value={filterCategory}
                    onChange={setFilterCategory}
                    style={{ width: 180 }}
                >
                    {['Primary', 'Secondary', 'Cross Tech Skill'].map(c => (
                        <Option key={c} value={c}>{c}</Option>
                    ))}
                </Select> */}
                {/* <Select
                    placeholder="Filter by Level"
                    allowClear
                    value={filterLevel}
                    onChange={setFilterLevel}
                    style={{ width: 160 }}
                >
                    {['Beginner', 'Intermediate', 'Expert'].map(l => (
                        <Option key={l} value={l}>{l}</Option>
                    ))}
                </Select> */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Statistic
                        value={totalRecords}
                        suffix={`/ ${allSkills.length} entries`}
                        style={{ lineHeight: 1, paddingTop: 2 }}
                        valueStyle={{ fontSize: 14, color: '#4f46e5' }}
                    />
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={downloadExcel}
                        disabled={filtered.length === 0}
                    >
                        Export Excel
                    </Button>
                </div>
            </div>

            {/* ── Table ────────────────────────────────────────────────────── */}
            <Spin spinning={loading}>
                <Table
                    dataSource={filtered}
                    columns={columns}
                    rowKey={(r, i) => `${r.employeeId}-${r.skillId}-${i}`}
                    size="middle"
                    pagination={{ pageSize: 12, showSizeChanger: false }}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: loading ? ' ' : 'No skills found' }}
                    onChange={handleTableChange}
                    onRow={(record) => {
                        return {
                            onClick: () => {
                                setSelectedRow(record);
                                setModalVisible(true);
                            },
                        };
                    }}
                    rowClassName={() => 'clickable-table-row'}
                />
            </Spin>

            <Modal
                title={`Skill Details - ${selectedRow?.skillName}`}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setModalVisible(false)}>Close</Button>
                ]}
                width={650}
            >
                {selectedRow && (
                    <div style={{ padding: '10px 0' }}>
                        <div style={{ marginBottom: 16 }}>
                            <p><strong>Employee:</strong> {selectedRow.employeeName} ({selectedRow.employeeId})</p>
                            <p><strong>Skill Level:</strong> {selectedRow.skillLevel || '—'} &nbsp;|&nbsp; <strong>Category:</strong> {selectedRow.skillCategory || '—'}</p>
                            <p><strong>Self Evaluation:</strong> {selectedRow.selfEvaluation ? `${selectedRow.selfEvaluation} / 5` : '—'}</p>
                        </div>

                        <h4 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>Evaluator Details</h4>
                        {selectedRow.evaluators && selectedRow.evaluators.length > 0 ? (
                            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                {selectedRow.evaluators.map((ev, idx) => (
                                    <div key={idx} style={{ marginBottom: 12, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <strong>{ev.evaluatorName}</strong>
                                            <span style={{ fontWeight: 600, color: '#4f46e5' }}>{ev.score != null ? `${ev.score} / 5` : '-'}</span>
                                        </div>
                                        {ev.comments && (
                                            <div style={{ fontStyle: 'italic', color: '#4b5563', fontSize: 13, marginTop: 4 }}>
                                                "{ev.comments}"
                                            </div>
                                        )}
                                        <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>
                                            <span style={{ marginRight: 12 }}><strong>Review Added:</strong> {ev.reviewCreatedAt ? convertDate(ev.reviewCreatedAt) : '—'}</span>
                                            <span><strong>Review Modified:</strong> {ev.reviewModifiedAt ? convertDate(ev.reviewModifiedAt) : '—'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#9ca3af' }}>No evaluator data available for this skill.</p>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TeamSkillsTab;
